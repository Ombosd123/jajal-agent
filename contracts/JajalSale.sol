// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {JAL} from "./JAL.sol";

/// @notice Interface minimal registry Agent ID resmi (SPACE ID Agent ID,
///         ERC-721 non-transferable). Gate = balanceOf(alamat) > 0.
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

/// @notice Interface minimal factory PancakeSwap V2.
interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/// @notice Interface minimal router PancakeSwap V2. Hanya dipakai untuk
///         membaca alamat factory — penanaman likuiditas TIDAK lewat
///         router (lihat finalize()).
interface IPancakeRouter {
    function factory() external view returns (address);
}

/// @notice Interface minimal pair PancakeSwap V2.
interface IPancakePair {
    function mint(address to) external returns (uint256 liquidity);
}

/// @notice Interface minimal WBNB (bungkus BNB + transfer).
interface IWBNB {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
}

/// @title JajalSale — penjualan share token JAL (jajal.agent)
/// @notice Model share ala fair-launch:
///         - 10.000 share total; 1 share = 100.000 JAL.
///         - 1.000 share pertama GRATIS lewat claimFree(): 1 share per alamat,
///           khusus pemegang Agent ID, FCFS.
///         - Share berbayar lewat buy(n): harga per share mengikuti tranche
///           posisi penjualan (tranche = sharesSold / 1000); tranche 1 =
///           0,0001 BNB, tranche 2 = 0,0002, ..., tranche 9 = 0,0009.
///           Pembelian yang melintasi batas tranche dihitung per tranche.
///         - Maksimum per wallet: 11 share (1 gratis + 10 berbayar).
///         - Graduation (finalize, permissionless) bila 10.000 share habis
///           DAN waktu sudah mencapai FINALIZE_OPENS (5 Des 2026 00:00
///           WIB): laku habis lebih awal TIDAK membuka pool lebih awal —
///           penjualan terkunci habis dan finalize() revert sampai
///           gerbang waktu itu. Saat finalize tereksekusi: 50% BNB hasil
///           penjualan menjadi seed pool JAL/WBNB di PancakeSwap V2 —
///           ditanam LANGSUNG ke pair (bukan lewat router) dan token LP
///           dibakar ke alamat dead — 50% sisanya menjadi dana cashback.
///         - Klaim peserta BERTAHAP PER LOT menurut posisi share
///           (keputusan pemilik 2026-11-19 ~21:37 WIB, membatalkan
///           verdict GUGUR builder + resolusi lapisan-situs): setiap
///           pembelian/klaim gratis dicatat sebagai lot (rentang posisi
///           + BNB teratribusi persis); claim() melepas semua lot yang
///           gelombangnya sudah buka — G1 posisi 8.001–10.000 @ 5 Des,
///           G2 4.001–8.000 @ 6 Des, G3 2.001–4.000 @ 7 Des, G4 1–2.000
///           @ 8 Des (semua 00:00 WIB) — dan dapat dipanggil berkali-
///           kali mengikuti gelombang. JAL per lot = share lot x
///           100.000; cashback per lot = 50% dari BNB lot itu (akuntansi
///           kumulatif eksak — lihat claim()).
///         - Alokasi tim: 200.000.000 JAL diminting saat graduation dan
///           ditahan di kontrak ini sebagai saldo vesting untuk
///           teamBeneficiary (immutable): cliff 30 hari sejak graduation,
///           lalu lepas linear selama 90 hari berikutnya (lunas penuh di
///           graduation + 120 hari), diambil lewat claimTeam().
///         - Cadangan check-in: 300.000.000 JAL diminting saat graduation
///           ke kontrak JajalCheckIn (immutable `checkIn`) sebagai dana
///           bonus streak check-in. Total supply akhir = 2.500.000.000 JAL
///           (klaim 1 M + LP 1 M + tim 200 jt + cadangan check-in 300 jt).
///         - Gagal (lewat SALE_END dan share tidak habis): refund()
///           mengembalikan 100% BNB peserta berbayar; share gratis hangus.
///         Kontrak ini TANPA owner, TANPA pause, TANPA fungsi withdraw lain.
///         Semua parameter bersifat constant/immutable. Deployer hanya
///         men-deploy; tidak ada hak istimewa apa pun setelah itu.
contract JajalSale {
    // ------------------------------------------------------------------
    // Parameter tetap
    // ------------------------------------------------------------------
    uint256 public constant TOTAL_SHARES = 10_000;
    uint256 public constant FREE_SHARES = 1_000;
    uint256 public constant TRANCHE_SIZE = 1_000;
    uint256 public constant MAX_PAID_PER_WALLET = 10;
    uint256 public constant MAX_PER_WALLET = 11;
    /// @notice JAL per share (100.000 JAL, 18 desimal).
    uint256 public constant TOKENS_PER_SHARE = 100_000 ether;
    /// @notice Kenaikan harga per tranche: 0,0001 BNB.
    uint256 public constant PRICE_STEP = 0.0001 ether;
    /// @notice Alokasi tim: 200.000.000 JAL, diminting hanya saat graduation.
    uint256 public constant TEAM_ALLOCATION = 200_000_000 ether;
    /// @notice Cadangan bonus check-in: 300.000.000 JAL, diminting hanya
    ///         saat graduation, langsung ke kontrak JajalCheckIn.
    uint256 public constant CHECKIN_ALLOCATION = 300_000_000 ether;
    /// @notice Cliff vesting tim: 30 hari sejak graduation (sebelumnya 0).
    uint256 public constant TEAM_CLIFF = 30 days;
    /// @notice Masa lepas linear vesting tim setelah cliff: 90 hari.
    uint256 public constant TEAM_VESTING_PERIOD = 90 days;
    /// @notice Akhir penjualan: 5 Des 2026 23:59:59 WIB (unix 1796489999;
    ///         revisi kalender terkunci Awa 2026-11-19 ~19:25 WIB —
    ///         sebelumnya 1 Des 2026).
    uint256 public constant SALE_END = 1796489999;
    /// @notice Gerbang waktu finalize(): graduation tidak bisa terjadi
    ///         sebelum 5 Des 2026 00:00:00 WIB (unix 1796403600),
    ///         walaupun 10.000 share laku habis lebih awal (paket klaim
    ///         bertahap terkunci Awa 2026-11-19 ~19:47 WIB, ditegaskan
    ///         sebagai perintah buka-ulang ~21:37 WIB). Nilainya sama
    ///         dengan WAVE_1_OPENS — gelombang pertama memang dibuka
    ///         oleh graduation itu sendiri.
    uint256 public constant FINALIZE_OPENS = 1796403600;
    /// @notice Waktu buka gelombang klaim per posisi share (semua
    ///         00:00:00 WIB; unix terverifikasi): G1 posisi 8.001–10.000
    ///         @ 5 Des 2026, G2 posisi 4.001–8.000 @ 6 Des, G3 posisi
    ///         2.001–4.000 @ 7 Des, G4 posisi 1–2.000 @ 8 Des. Klaim
    ///         tetap terbuka sesudah gelombangnya buka (tanpa tenggat
    ///         per gelombang).
    uint256 public constant WAVE_1_OPENS = 1796403600;
    uint256 public constant WAVE_2_OPENS = 1796490000;
    uint256 public constant WAVE_3_OPENS = 1796576400;
    uint256 public constant WAVE_4_OPENS = 1796662800;
    /// @notice Alamat burn untuk token LP (terkunci permanen).
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ------------------------------------------------------------------
    // Alamat eksternal (immutable, ditetapkan saat deploy)
    // ------------------------------------------------------------------
    /// @notice Registry Agent ID resmi: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
    IAgentIdRegistry public immutable registry;
    /// @notice Router PancakeSwap V2 BSC: 0x10ED43C718714eb63d5aA57B78B54704E256024E
    IPancakeRouter public immutable router;
    /// @notice WBNB BSC: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
    address public immutable wbnb;
    /// @notice Token JAL — dibuat oleh kontrak ini saat constructor berjalan,
    ///         dengan kontrak ini sebagai satu-satunya minter.
    JAL public immutable jal;
    /// @notice Penerima alokasi tim (vesting). Immutable: ditetapkan sekali
    ///         di constructor dan tidak bisa diubah siapa pun, termasuk
    ///         deployer. Alamat wajib diverifikasi ulang sebelum deploy.
    address public immutable teamBeneficiary;
    /// @notice Kontrak JajalCheckIn — penerima cadangan bonus check-in
    ///         (300.000.000 JAL) saat graduation. Immutable dari constructor.
    ///         Kontrak ini di-deploy SEBELUM sale (ia tidak butuh alamat
    ///         sale saat konstruksi; pengikatan arah sebaliknya dilakukan
    ///         JajalCheckIn.bindSale setelah sale ada — lihat kontrak itu).
    address public immutable checkIn;

    // ------------------------------------------------------------------
    // State penjualan
    // ------------------------------------------------------------------
    uint256 public sharesSold;
    uint256 public totalRaised;
    bool public finalized;
    bool public claimsOpen;
    address public pair;
    /// @notice Waktu graduation (0 sebelum finalize).
    uint256 public graduationTime;
    /// @notice Total JAL alokasi tim yang sudah ditarik beneficiary.
    uint256 public teamClaimed;

    mapping(address => uint256) public sharesOf;
    mapping(address => uint256) public paidSharesOf;
    mapping(address => uint256) public paidBy;
    mapping(address => bool) public freeClaimed;
    /// @notice SEMANTIK BARU (klaim bertahap, 2026-11-19): true hanya
    ///         bila alamat ini sudah mengklaim SELURUH lot miliknya
    ///         (fully claimed lintas semua gelombang). Selama masih
    ///         ada lot yang belum ter-klaim — terkunci gelombang ATAU
    ///         sudah terbuka tapi belum diambil — nilainya false.
    ///         Untuk alamat tanpa share, false (sama seperti desain
    ///         satu-kali lama). Situs: tombol klaim TIDAK boleh
    ///         dinonaktifkan hanya dari flag ini — pakai claimableOf()
    ///         untuk jumlah yang bisa diklaim saat ini.
    mapping(address => bool) public claimed;
    mapping(address => bool) public refunded;

    // ------------------------------------------------------------------
    // Akuntansi lot (klaim bertahap per gelombang posisi)
    // ------------------------------------------------------------------
    /// @notice Satu lot = satu rentang posisi share yang bersebelahan
    ///         milik satu alamat, dicatat saat claimFree()/buy().
    ///         Lot TIDAK PERNAH menyeberangi batas gelombang (2.000 /
    ///         4.000 / 8.000): pembelian yang menyeberang dipecah saat
    ///         pencatatan, sehingga seluruh lot selalu berada dalam
    ///         tepat satu gelombang. `paid` adalah total BNB yang
    ///         teratribusi PERSIS ke share-share lot ini (harga per
    ///         share mengikuti tranche posisinya; dihitung dengan walk
    ///         tranche yang sama dengan costFor). Invariant:
    ///         jumlah shares semua lot alamat == sharesOf(alamat) dan
    ///         jumlah paid semua lot == paidBy(alamat), setiap saat.
    struct Lot {
        uint32 startPos; // posisi share pertama lot (1-based, inklusif)
        uint32 shares; // jumlah share dalam lot
        uint256 paid; // total BNB dibayar untuk lot ini (0 = lot gratis)
        bool claimed; // lot sudah diklaim?
    }
    mapping(address => Lot[]) private _lots;
    /// @notice Total paidBy dari lot-lot yang SUDAH ter-klaim per
    ///         alamat, dan total cashback yang sudah dibayar. Keduanya
    ///         menjadi dasar akuntansi cashback kumulatif claim():
    ///         cashback panggilan ini = (claimedPaidOf baru) / 2 -
    ///         cashbackPaidOf lama, sehingga total cashback setelah
    ///         semua lot ter-klaim selalu PERSIS paidBy / 2 dan sisa
    ///         debu pembagian (bila ada) menempel di klaim terakhir.
    ///         (Secara struktural debu tidak pernah ada: setiap harga
    ///         share adalah kelipatan PRICE_STEP = 10^14 wei yang
    ///         genap, jadi paid setiap lot selalu genap.)
    mapping(address => uint256) public claimedPaidOf;
    mapping(address => uint256) public cashbackPaidOf;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event FreeClaimed(address indexed user, uint256 sharesSold);
    event Bought(address indexed user, uint256 shares, uint256 cost, uint256 sharesSold);
    event Finalized(address indexed pair, uint256 poolSeed, uint256 jalForPool);
    /// @notice SEMANTIK PARSIAL (klaim bertahap): event ini terbit satu
    ///         kali per panggilan claim() yang berhasil, dengan jumlah
    ///         JAL + cashback dari LOT-LOT YANG DILEPAS PANGGILAN ITU
    ///         SAJA — bukan total hak alamat. Jumlah seluruh event
    ///         Claimed satu alamat == hak penuhnya (share x 100.000 JAL
    ///         dan paidBy / 2 BNB).
    event Claimed(address indexed user, uint256 jalAmount, uint256 cashback);
    event Refunded(address indexed user, uint256 amount);
    event TeamClaimed(address indexed beneficiary, uint256 amount);

    // ------------------------------------------------------------------
    // Guard reentrancy sederhana
    // ------------------------------------------------------------------
    uint256 private _lock;

    modifier nonReentrant() {
        require(_lock == 0, "JajalSale: reentrant call");
        _lock = 1;
        _;
        _lock = 0;
    }

    /// @notice Gate Agent ID: pengirim wajib memegang Agent ID.
    modifier onlyAgentIdHolder() {
        require(registry.balanceOf(msg.sender) > 0, "JajalSale: not an Agent ID holder");
        _;
    }

    constructor(address registry_, address router_, address wbnb_, address teamBeneficiary_, address checkIn_) {
        require(registry_ != address(0), "JajalSale: registry zero address");
        require(router_ != address(0), "JajalSale: router zero address");
        require(wbnb_ != address(0), "JajalSale: wbnb zero address");
        require(teamBeneficiary_ != address(0), "JajalSale: team beneficiary zero address");
        require(checkIn_ != address(0), "JajalSale: check-in zero address");
        registry = IAgentIdRegistry(registry_);
        router = IPancakeRouter(router_);
        wbnb = wbnb_;
        teamBeneficiary = teamBeneficiary_;
        checkIn = checkIn_;
        // Token JAL dibuat atomik bersama sale; kontrak ini minter tunggalnya.
        jal = new JAL(address(this));
    }

    /// @notice Menerima BNB hanya sebagai pengaman agar transfer BNB tak
    ///         terduga tidak menggagalkan transaksi apa pun. Akuntansi
    ///         kontrak selalu memakai variabel totalRaised, bukan saldo kasar;
    ///         BNB yang masuk di luar buy() terkunci (tidak ada withdraw).
    receive() external payable {}

    // ------------------------------------------------------------------
    // Harga
    // ------------------------------------------------------------------
    /// @notice Harga satu share pada posisi penjualan saat ini.
    ///         Selama fase gratis (sharesSold < 1000) nilainya 0 — share pada
    ///         posisi itu memang gratis dan hanya dibagikan lewat claimFree().
    function currentSharePrice() public view returns (uint256) {
        return (sharesSold / TRANCHE_SIZE) * PRICE_STEP;
    }

    /// @notice Total biaya membeli `n` share berikutnya, dihitung tepat per
    ///         tranche yang dilintasi.
    function costFor(uint256 n) public view returns (uint256) {
        return _costFrom(sharesSold, n);
    }

    /// @notice Biaya tepat untuk `n` share yang dimulai pada posisi
    ///         penjualan `sold` (jumlah share yang sudah terjual sebelum
    ///         rentang ini), dihitung per tranche yang dilintasi. Dipakai
    ///         costFor() dan atribusi paid per lot di buy() — satu walk
    ///         yang sama, sehingga jumlah paid semua lot selalu persis
    ///         sama dengan biaya total pembelian.
    function _costFrom(uint256 sold, uint256 n) internal pure returns (uint256 cost) {
        uint256 remaining = n;
        while (remaining > 0) {
            uint256 tranche = sold / TRANCHE_SIZE;
            uint256 leftInTranche = TRANCHE_SIZE - (sold % TRANCHE_SIZE);
            uint256 take = remaining < leftInTranche ? remaining : leftInTranche;
            cost += take * tranche * PRICE_STEP;
            sold += take;
            remaining -= take;
        }
    }

    // ------------------------------------------------------------------
    // Gelombang klaim (berdasarkan posisi share)
    // ------------------------------------------------------------------
    /// @notice Waktu buka gelombang untuk share pada `position`
    ///         (1-based): posisi tertinggi (paling akhir terjual, harga
    ///         termahal) dibuka paling dulu.
    function waveOpensAt(uint256 position) public pure returns (uint256) {
        if (position > 8000) return WAVE_1_OPENS;
        if (position > 4000) return WAVE_2_OPENS;
        if (position > 2000) return WAVE_3_OPENS;
        return WAVE_4_OPENS;
    }

    /// @notice Posisi terakhir (inklusif) dari gelombang yang memuat
    ///         `position`. Batas gelombang: 2.000 / 4.000 / 8.000 /
    ///         10.000.
    function _waveEnd(uint256 position) internal pure returns (uint256) {
        if (position > 8000) return TOTAL_SHARES;
        if (position > 4000) return 8000;
        if (position > 2000) return 4000;
        return 2000;
    }

    // ------------------------------------------------------------------
    // Fase gratis
    // ------------------------------------------------------------------
    /// @notice Klaim 1 share gratis. Syarat: memegang Agent ID, 1x per alamat,
    ///         selama 1.000 share gratis masih tersedia dan sale belum berakhir.
    function claimFree() external onlyAgentIdHolder nonReentrant {
        require(!finalized, "JajalSale: already finalized");
        require(block.timestamp <= SALE_END, "JajalSale: sale ended");
        require(sharesSold < FREE_SHARES, "JajalSale: free shares exhausted");
        require(!freeClaimed[msg.sender], "JajalSale: free share already claimed");

        freeClaimed[msg.sender] = true;
        sharesOf[msg.sender] += 1;
        sharesSold += 1;
        // catat lot gratis: posisi share ini = sharesSold sesudah
        // penambahan (1-based); selalu di gelombang 4 (posisi <= 1.000).
        _lots[msg.sender].push(Lot({startPos: uint32(sharesSold), shares: 1, paid: 0, claimed: false}));

        emit FreeClaimed(msg.sender, sharesSold);
    }

    // ------------------------------------------------------------------
    // Fase berbayar
    // ------------------------------------------------------------------
    /// @notice Beli `n` share berbayar. Fase berbayar baru dibuka setelah
    ///         1.000 share gratis habis (agar posisi tranche 0 tidak bisa
    ///         dibeli gratis melewati aturan 1 share gratis per alamat).
    ///         Kelebihan pembayaran dikembalikan pada transaksi yang sama.
    function buy(uint256 n) external payable onlyAgentIdHolder nonReentrant {
        require(!finalized, "JajalSale: already finalized");
        require(block.timestamp <= SALE_END, "JajalSale: sale ended");
        require(n > 0, "JajalSale: zero shares");
        require(sharesSold >= FREE_SHARES, "JajalSale: free phase not finished");
        require(sharesSold + n <= TOTAL_SHARES, "JajalSale: exceeds remaining shares");
        require(paidSharesOf[msg.sender] + n <= MAX_PAID_PER_WALLET, "JajalSale: paid cap exceeded");
        require(sharesOf[msg.sender] + n <= MAX_PER_WALLET, "JajalSale: wallet cap exceeded");

        uint256 cost = costFor(n);
        require(msg.value >= cost, "JajalSale: insufficient BNB");

        // effects
        uint256 pos = sharesSold; // posisi terakhir yang sudah terjual
        sharesOf[msg.sender] += n;
        paidSharesOf[msg.sender] += n;
        paidBy[msg.sender] += cost;
        sharesSold += n;
        totalRaised += cost;

        // Catat lot per gelombang: rentang posisi pembelian ini
        // (pos+1 .. pos+n) dipecah di setiap batas gelombang yang
        // dilintasi; paid tiap lot dihitung dengan walk tranche yang
        // sama persis (_costFrom) sehingga jumlahnya == cost.
        {
            uint256 remaining = n;
            while (remaining > 0) {
                uint256 wEnd = _waveEnd(pos + 1);
                uint256 room = wEnd - pos;
                uint256 take = remaining < room ? remaining : room;
                _lots[msg.sender].push(
                    Lot({startPos: uint32(pos + 1), shares: uint32(take), paid: _costFrom(pos, take), claimed: false})
                );
                pos += take;
                remaining -= take;
            }
        }

        emit Bought(msg.sender, n, cost, sharesSold);

        // interaction terakhir: kembalikan kelebihan pembayaran
        uint256 excess = msg.value - cost;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, "JajalSale: excess refund failed");
        }
    }

    // ------------------------------------------------------------------
    // Graduation
    // ------------------------------------------------------------------
    /// @notice Finalisasi saat 10.000 share habis (permissionless) DAN
    ///         waktu sudah mencapai FINALIZE_OPENS (5 Des 2026 00:00
    ///         WIB) — laku habis lebih awal mengunci penjualan tetapi
    ///         pool TIDAK dibuka sebelum gerbang waktu itu.
    ///         graduationTime mencatat waktu eksekusi aktual (vesting
    ///         tim mengikuti waktu itu). Mint JAL alokasi klaim + LP + tim +
    ///         cadangan check-in (ke kontrak JajalCheckIn), buat
    ///         pair JAL/WBNB, tanam poolSeed (50% totalRaised) sebagai
    ///         likuiditas, dan kirim token LP ke alamat burn. 50% sisa
    ///         totalRaised tetap di kontrak sebagai dana cashback untuk
    ///         claim(). Alokasi tim tetap di kontrak sebagai saldo vesting.
    /// @dev    Penanaman likuiditas dilakukan LANGSUNG ke pair — transfer
    ///         JAL + WBNB (hasil deposit poolSeed) ke alamat pair, lalu
    ///         pair.mint(BURN_ADDRESS) — BUKAN lewat router.addLiquidityETH.
    ///         Alasannya keamanan (temuan audit): addLiquidityETH menghitung
    ///         quote dari CADANGAN pair dan revert permanen bila cadangan
    ///         miring, sehingga siapa pun bisa membekukan graduation
    ///         selamanya hanya dengan membuat pair lebih dulu, menanam debu
    ///         WBNB sepihak, lalu sync(). pair.mint menghitung likuiditas
    ///         dari SALDO aktual pair (selisih saldo terhadap cadangan),
    ///         sehingga tahan terhadap cadangan miring; sumbangan pihak
    ///         ketiga justru terserap ke posisi LP yang dibakar.
    function finalize() external nonReentrant {
        require(!finalized, "JajalSale: already finalized");
        require(sharesSold == TOTAL_SHARES, "JajalSale: not sold out");
        // Gerbang waktu graduation (paket klaim bertahap): cek sold-out
        // sengaja tetap di atas agar pesan revert jalur gagal tidak
        // berubah; gerbang ini hanya menahan graduation yang sah.
        require(block.timestamp >= FINALIZE_OPENS, "JajalSale: graduation not open yet");

        // effects dulu, sebelum interaksi eksternal apa pun
        finalized = true;
        graduationTime = block.timestamp;

        uint256 poolSeed = totalRaised / 2;
        uint256 claimAllocation = TOTAL_SHARES * TOKENS_PER_SHARE; // 1.000.000.000 JAL
        uint256 lpAllocation = claimAllocation; // 1.000.000.000 JAL

        // satu-satunya mint JAL yang pernah terjadi:
        // klaim peserta + LP + alokasi tim (vesting) di kontrak ini, dan
        // cadangan bonus check-in langsung ke kontrak JajalCheckIn.
        // Total = 2.500.000.000 JAL.
        jal.mint(address(this), claimAllocation + lpAllocation + TEAM_ALLOCATION);
        jal.mint(checkIn, CHECKIN_ALLOCATION);

        address factory = router.factory();
        address pairAddr = IPancakeFactory(factory).getPair(address(jal), wbnb);
        if (pairAddr == address(0)) {
            pairAddr = IPancakeFactory(factory).createPair(address(jal), wbnb);
        }
        pair = pairAddr;

        // Penanaman langsung ke pair (tahan cadangan miring — lihat @dev):
        // 1) kirim sisi JAL, 2) bungkus poolSeed menjadi WBNB dan kirim,
        // 3) pair.mint menerbitkan LP ke alamat burn dari saldo aktual.
        require(jal.transfer(pairAddr, lpAllocation), "JajalSale: JAL seed transfer failed");
        IWBNB(wbnb).deposit{value: poolSeed}();
        require(IWBNB(wbnb).transfer(pairAddr, poolSeed), "JajalSale: WBNB seed transfer failed");
        uint256 liquidity = IPancakePair(pairAddr).mint(BURN_ADDRESS);
        require(liquidity > 0, "JajalSale: no liquidity minted");

        // klaim dibuka hanya setelah penanaman pool benar-benar sukses
        // (bila langkah apa pun di atas revert, seluruh transaksi — termasuk
        // flag finalized — ikut rollback dan finalize bisa dicoba ulang)
        claimsOpen = true;

        emit Finalized(pairAddr, poolSeed, lpAllocation);
    }

    // ------------------------------------------------------------------
    // Klaim setelah graduation
    // ------------------------------------------------------------------
    /// @notice Klaim JAL + cashback setelah graduation — BERTAHAP PER
    ///         LOT: panggilan ini melepas SEMUA lot pemanggil yang
    ///         gelombangnya sudah buka dan belum ter-klaim; lot yang
    ///         gelombangnya belum buka tetap terkunci dan tidak
    ///         menghalangi pelepasan lot lain. Dapat dipanggil
    ///         berkali-kali mengikuti gelombang; klaim tetap terbuka
    ///         sesudah gelombangnya buka. JAL per lot = share lot x
    ///         100.000. Cashback dihitung KUMULATIF: target total
    ///         cashback atas lot yang sudah ter-klaim adalah
    ///         claimedPaidOf / 2, dan panggilan ini membayar selisihnya
    ///         terhadap yang sudah dibayar — jadi jumlah seluruh
    ///         cashback parsial selalu PERSIS paidBy / 2 (debu
    ///         pembagian, bila ada, menempel di klaim terakhir; secara
    ///         struktural paid selalu genap sehingga tidak ada debu).
    ///         Peserta gratis murni menerima cashback 0. Sengaja TANPA
    ///         gate Agent ID: ini penarikan aset milik peserta sendiri
    ///         dan harus selalu bisa dilakukan.
    ///         Revert: belum graduation ("not graduated"); tanpa share
    ///         ("no shares"); semua lot sudah ter-klaim ("already
    ///         claimed"); masih ada lot tetapi belum ada yang terbuka
    ///         ("no unlocked lots yet").
    function claim() external nonReentrant {
        require(finalized, "JajalSale: not graduated");
        require(sharesOf[msg.sender] > 0, "JajalSale: no shares");

        Lot[] storage lots = _lots[msg.sender];
        uint256 jalAmount = 0;
        uint256 releasedPaid = 0;
        uint256 stillLocked = 0;
        for (uint256 i = 0; i < lots.length; i++) {
            Lot storage lot = lots[i];
            if (lot.claimed) continue;
            if (block.timestamp >= waveOpensAt(lot.startPos)) {
                lot.claimed = true;
                jalAmount += uint256(lot.shares) * TOKENS_PER_SHARE;
                releasedPaid += lot.paid;
            } else {
                stillLocked++;
            }
        }
        if (jalAmount == 0) {
            if (claimed[msg.sender]) revert("JajalSale: already claimed");
            revert("JajalSale: no unlocked lots yet");
        }

        // akuntansi cashback kumulatif eksak (lihat @notice)
        uint256 newClaimedPaid = claimedPaidOf[msg.sender] + releasedPaid;
        uint256 cashback = newClaimedPaid / 2 - cashbackPaidOf[msg.sender];
        claimedPaidOf[msg.sender] = newClaimedPaid;
        cashbackPaidOf[msg.sender] += cashback;
        // flag claimed (semantik baru): true hanya bila SEMUA lot
        // alamat ini sudah ter-klaim sesudah panggilan ini.
        if (stillLocked == 0) claimed[msg.sender] = true;

        require(jal.transfer(msg.sender, jalAmount), "JajalSale: JAL transfer failed");
        if (cashback > 0) {
            (bool ok, ) = msg.sender.call{value: cashback}("");
            require(ok, "JajalSale: cashback failed");
        }

        emit Claimed(msg.sender, jalAmount, cashback);
    }

    // ------------------------------------------------------------------
    // Views lot & gelombang (aditif — untuk situs dan verifikasi)
    // ------------------------------------------------------------------
    /// @notice Jumlah lot yang tercatat untuk alamat ini.
    function lotCount(address user) external view returns (uint256) {
        return _lots[user].length;
    }

    /// @notice Lot ke-`i` milik alamat ini: posisi awal (1-based),
    ///         jumlah share, BNB teratribusi, status klaim, dan waktu
    ///         buka gelombangnya.
    function lotOf(address user, uint256 i)
        external
        view
        returns (uint32 startPos, uint32 shares, uint256 paid, bool lotClaimed, uint256 opensAt)
    {
        Lot storage lot = _lots[user][i];
        return (lot.startPos, lot.shares, lot.paid, lot.claimed, waveOpensAt(lot.startPos));
    }

    /// @notice Yang akan dibayar claim() bila dipanggil SEKARANG oleh
    ///         alamat ini: (share terbuka, JAL, cashback). Semua nol
    ///         sebelum graduation atau bila tidak ada lot yang terbuka
    ///         dan belum ter-klaim.
    function claimableOf(address user) external view returns (uint256 shares, uint256 jalAmount, uint256 cashback) {
        if (!finalized) return (0, 0, 0);
        Lot[] storage lots = _lots[user];
        uint256 releasedPaid = 0;
        for (uint256 i = 0; i < lots.length; i++) {
            Lot storage lot = lots[i];
            if (lot.claimed) continue;
            if (block.timestamp >= waveOpensAt(lot.startPos)) {
                shares += lot.shares;
                releasedPaid += lot.paid;
            }
        }
        if (shares == 0) return (0, 0, 0);
        jalAmount = shares * TOKENS_PER_SHARE;
        cashback = (claimedPaidOf[user] + releasedPaid) / 2 - cashbackPaidOf[user];
    }

    /// @notice Waktu buka paling awal di antara lot alamat ini yang
    ///         belum ter-klaim (0 bila tidak ada yang menunggu — semua
    ///         sudah ter-klaim atau alamat tidak punya lot). Situs
    ///         menggabungkannya dengan status finalized untuk hitung
    ///         mundur gelombang berikutnya.
    function nextClaimOpensAt(address user) external view returns (uint256 earliest) {
        Lot[] storage lots = _lots[user];
        for (uint256 i = 0; i < lots.length; i++) {
            if (lots[i].claimed) continue;
            uint256 t = waveOpensAt(lots[i].startPos);
            if (earliest == 0 || t < earliest) earliest = t;
        }
    }

    // ------------------------------------------------------------------
    // Alokasi tim (vesting)
    // ------------------------------------------------------------------
    /// @notice JAL tim yang sudah terlepas (vested) pada waktu `t`:
    ///         0 sebelum graduation dan selama cliff 30 hari, lalu naik
    ///         linear selama 90 hari, dan penuh (200.000.000 JAL) di
    ///         graduation + 120 hari.
    function teamVestedAt(uint256 t) public view returns (uint256) {
        if (!finalized) return 0;
        uint256 cliffEnd = graduationTime + TEAM_CLIFF;
        if (t < cliffEnd) return 0;
        uint256 vestingEnd = cliffEnd + TEAM_VESTING_PERIOD;
        if (t >= vestingEnd) return TEAM_ALLOCATION;
        return (TEAM_ALLOCATION * (t - cliffEnd)) / TEAM_VESTING_PERIOD;
    }

    /// @notice JAL tim yang sudah terlepas pada waktu blok ini.
    function teamVested() public view returns (uint256) {
        return teamVestedAt(block.timestamp);
    }

    /// @notice JAL tim yang bisa ditarik beneficiary saat ini juga
    ///         (sudah terlepas dikurangi yang sudah ditarik).
    function teamReleasable() public view returns (uint256) {
        return teamVested() - teamClaimed;
    }

    /// @notice Tarik JAL tim yang sudah terlepas. Hanya boleh dipanggil
    ///         oleh teamBeneficiary; bisa dipanggil berkali-kali, setiap
    ///         kali menarik porsi yang baru terlepas sejak penarikan
    ///         terakhir. Tidak ada cara lain memindahkan alokasi tim.
    function claimTeam() external nonReentrant {
        require(msg.sender == teamBeneficiary, "JajalSale: not team beneficiary");
        uint256 amount = teamReleasable();
        require(amount > 0, "JajalSale: nothing vested yet");

        teamClaimed += amount;

        require(jal.transfer(msg.sender, amount), "JajalSale: team transfer failed");

        emit TeamClaimed(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Refund bila sale gagal
    // ------------------------------------------------------------------
    /// @notice Kembalikan 100% BNB peserta berbayar bila sale gagal (lewat
    ///         SALE_END dan share tidak habis). Satu kali per alamat. Share
    ///         gratis tidak membawa pembayaran apa pun sehingga hangus begitu
    ///         saja. Sengaja TANPA gate Agent ID (pengembalian aset sendiri).
    ///         Cabang gagal TIDAK memakai akuntansi lot sama sekali:
    ///         pengembalian selalu paidBy agregat penuh, dan karena
    ///         finalized tidak akan pernah true di cabang ini, claim()
    ///         (satu-satunya pembaca lot) tidak pernah bisa berjalan —
    ///         catatan lot menjadi tidak relevan dan dibiarkan apa adanya.
    function refund() external nonReentrant {
        require(!finalized, "JajalSale: already graduated");
        require(block.timestamp > SALE_END, "JajalSale: sale not ended yet");
        require(sharesSold < TOTAL_SHARES, "JajalSale: sale sold out");
        require(!refunded[msg.sender], "JajalSale: already refunded");
        uint256 amount = paidBy[msg.sender];
        require(amount > 0, "JajalSale: nothing to refund");

        refunded[msg.sender] = true;
        paidBy[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "JajalSale: refund failed");

        emit Refunded(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Views bantu
    // ------------------------------------------------------------------
    /// @notice True bila sale sudah lewat deadline tanpa habis dan tanpa
    ///         graduation — keadaan di mana refund() bisa dipanggil.
    function saleFailed() external view returns (bool) {
        return !finalized && block.timestamp > SALE_END && sharesSold < TOTAL_SHARES;
    }
}
