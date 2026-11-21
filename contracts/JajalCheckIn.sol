// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface minimal registry Agent ID resmi (SPACE ID Agent ID,
///         ERC-721 non-transferable). Gate = balanceOf(alamat) > 0.
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

/// @notice Interface minimal JajalSale — hanya fungsi yang dibaca kontrak
///         ini: pengikatan (jal/registry), alokasi peserta (claimBonus),
///         status graduation/gagal, dan alamat pair (seedPoolToLP).
interface IJajalSale {
    function jal() external view returns (address);
    function registry() external view returns (address);
    function checkIn() external view returns (address);
    function sharesOf(address user) external view returns (uint256);
    function TOKENS_PER_SHARE() external view returns (uint256);
    function finalized() external view returns (bool);
    function saleFailed() external view returns (bool);
    function pair() external view returns (address);
}

/// @notice Interface minimal JAL.
interface IJAL {
    function minter() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Interface minimal WBNB (bungkus BNB + transfer).
interface IWBNB {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
}

/// @notice Interface minimal pair PancakeSwap V2.
interface IPancakePair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
    function mint(address to) external returns (uint256 liquidity);
}

/// @title JajalCheckIn — check-in harian berbayar jajal.agent (kontrak keempat)
/// @notice Program OPSIONAL di samping sale JAL — bukan syarat ikut sale:
///         - checkIn() berbayar tepat 0,0001 BNB, khusus pemegang Agent ID,
///           maks 1x per alamat per hari (UTC).
///         - Fee dibagi dua secara terbuka: 50% langsung ke feeRecipient
///           (wallet personal Awa — biaya tim), 50% ditahan kontrak sebagai
///           dana pool (poolBalance).
///         - Badge NFT SOULBOUND terbit pada check-in ke-7 di hari UTC
///           berbeda — hitungan KUMULATIF, hari terlewat tidak memutus
///           (revisi kalender terkunci Awa 2026-11-19 ~19:25 WIB;
///           sebelumnya streak berurutan). ERC-721 minimal di kontrak
///           ini; tidak bisa dipindahkan, maksimal 1 per alamat.
///         - Pemegang badge berhak claimBonus() SETELAH graduation sale:
///           35% x alokasi JAL finalnya dari sale (share x 100.000 JAL),
///           dibayar dari cadangan 300.000.000 JAL yang diminting JajalSale
///           ke kontrak ini saat graduation. Satu kali per alamat, FCFS:
///           cadangan habis, bonus berhenti (pengklaim di batas cadangan
///           menerima sisa yang tersedia, setelah itu revert).
///         - Dana pool yang tertahan ditanam ke LP lewat seedPoolToLP()
///           (permissionless, bisa berkali-kali) setelah graduation: BNB
///           pool ditukar sebagian ke JAL lewat pair lalu ditanam langsung
///           ke pair, token LP dibakar ke alamat dead — pola yang sama
///           dengan perbaikan audit #4 pada JajalSale.
///         - Bila sale GAGAL, program berakhir: checkIn tertutup permanen
///           dan setiap peserta dapat menarik kembali TEPAT seluruh bagian
///           pool miliknya sendiri lewat refundPool() (50% x total fee
///           yang ia bayarkan, tercatat di poolShareOf dan selalu terdukung
///           1:1 oleh saldo tertahan — tanpa pro-rata, tanpa tergantung
///           urutan klaim). Bagian tim (50%) TIDAK pernah dikembalikan —
///           biaya program, diungkap di muka.
///         - Sisa cadangan JAL yang tidak terpakai DIBAKAR setelah program
///           berakhir: burnRemainder() permissionless mengirim seluruh
///           saldo JAL kontrak ini ke alamat burn setelah PROGRAM_END.
///         Kontrak ini TANPA owner dan TANPA fungsi withdraw lain. Satu-
///         satunya tindakan istimewa adalah bindSale() oleh deployer,
///         SATU KALI sebelum program berjalan, untuk mengikat alamat
///         JajalSale (lihat catatan pengikatan di bawah); setelah itu
///         deployer tidak punya hak apa pun.
/// @dev    Catatan pengikatan (rekonsiliasi ketergantungan melingkar):
///         JajalSale butuh alamat kontrak ini di constructor-nya (tujuan
///         mint cadangan), sedangkan kontrak ini butuh alamat JajalSale
///         (membaca alokasi + status) dan JAL. Karena JAL dibuat atomik
///         di dalam constructor JajalSale, urutan deploy menjadi:
///         (1) JajalCheckIn, (2) JajalSale (menciptakan JAL), (3) deployer
///         memanggil bindSale(alamat sale) — diverifikasi on-chain di
///         dalamnya: JAL.minter() == sale, registry sale == registry
///         kontrak ini, dan sale.checkIn() == kontrak ini (cek arah
///         balik, patch M-1) — (4) AgentCraft. bindSale hanya bisa dipanggil
///         deployer dan hanya satu kali; alamat yang terikat tidak bisa
///         diganti. Verifikasi pasca-deploy wajib membaca sale() dan jal()
///         di sini serta checkIn() di JajalSale sebelum situs diumumkan.
contract JajalCheckIn {
    // ------------------------------------------------------------------
    // Parameter tetap
    // ------------------------------------------------------------------
    /// @notice Biaya check-in: tepat 0,0001 BNB.
    uint256 public constant CHECKIN_FEE = 0.0001 ether;
    /// @notice Jumlah hari check-in berbeda (kumulatif) yang memicu badge.
    uint256 public constant STREAK_TARGET = 7;
    /// @notice Persen bonus dari alokasi JAL final peserta.
    uint256 public constant BONUS_PERCENT = 35;
    /// @notice Cadangan bonus di kontrak ini (diminting sale saat
    ///         graduation; harus sama dengan JajalSale.CHECKIN_ALLOCATION).
    uint256 public constant CHECKIN_ALLOCATION = 300_000_000 ether;
    /// @notice Akhir program check-in: 14 Des 2026 23:59:59 WIB
    ///         (unix 1797267599 = SALE_END + 9 hari; revisi kalender
    ///         terkunci Awa 2026-11-19 ~19:25 WIB — sebelumnya 31 Des).
    ///         Setelah waktu ini: claimBonus tertutup, dan sisa cadangan
    ///         JAL dapat dibakar siapa pun lewat burnRemainder().
    ///         Konstanta tetap — dilaporkan ke Awa sebelum deploy.
    uint256 public constant PROGRAM_END = 1797267599;
    /// @notice Batas akhir check-in: 8 Des 2026 23:59:59 WIB
    ///         (unix 1796749199 = SALE_END + 3 hari). Check-in diterima
    ///         sampai waktu ini SELAMA sale tidak gagal — termasuk
    ///         jendela pasca-vonis 6–8 Des setelah graduation. Bila sale
    ///         gagal, check-in berhenti lebih dulu di SALE_END lewat
    ///         gerbang saleFailed(). Konstanta terpisah dari
    ///         PROGRAM_END (revisi kalender yang sama).
    uint256 public constant CHECKIN_END = 1796749199;
    /// @notice Alamat burn untuk token LP (terkunci permanen).
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    /// @notice URI metadata badge streak (badge.json yang di-host bersama
    ///         situs; gambar badge resmi versi "35% BONUS" di-host di
    ///         sebelahnya sebagai badge-streak.webp).
    ///         ASUMSI DEPLOY — WAJIB DICEK SABTU SEBELUM DEPLOY: nilai ini
    ///         mengasumsikan situs terbit di https://jajal.agent/ — bila
    ///         domain final berbeda, ubah SATU konstanta ini lalu
    ///         kompilasi ulang; tidak ada tempat lain yang menyimpan URI.
    string public constant BADGE_METADATA_URI = "https://jajal-agent.pages.dev/badge.json";

    // ------------------------------------------------------------------
    // Alamat eksternal (immutable, ditetapkan saat deploy)
    // ------------------------------------------------------------------
    /// @notice Registry Agent ID resmi: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
    IAgentIdRegistry public immutable registry;
    /// @notice Penerima 50% fee check-in (biaya tim): wallet personal Awa
    ///         0xd07A27a34E1b729B4e3742596f68D949EAC0331f. Diungkap terbuka.
    address public immutable feeRecipient;
    /// @notice WBNB BSC: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
    address public immutable wbnb;
    /// @notice Alamat yang men-deploy kontrak ini. Hanya dipakai SATU KALI
    ///         untuk bindSale(); bukan owner — tidak ada hak lain.
    address public immutable deployer;

    // ------------------------------------------------------------------
    // Pengikatan sale (satu kali, lihat @dev di atas)
    // ------------------------------------------------------------------
    /// @notice Alamat JajalSale yang terikat (0 sebelum bindSale).
    address public sale;
    /// @notice Alamat token JAL (dibaca dari sale saat bindSale).
    address public jal;

    // ------------------------------------------------------------------
    // State check-in
    // ------------------------------------------------------------------
    uint256 public totalCheckIns;
    /// @notice Total BNB dana pool yang sedang tertahan (belum di-LP-kan
    ///         dan belum di-refund).
    uint256 public poolBalance;
    /// @notice Total bonus JAL yang sudah dibayarkan dari cadangan.
    uint256 public bonusPaidTotal;

    /// @notice streakOf = hitungan KUMULATIF hari check-in berbeda
    ///         (hari UTC) menuju badge — setiap hari sah menambah 1,
    ///         hari terlewat tidak mengurangi. (Revisi kalender
    ///         2026-11-19: sebelumnya streak BERURUTAN yang ter-reset
    ///         oleh hari terlewat. Nama view tidak berubah; maknanya
    ///         yang berubah — lihat BUILD-REPORT + CHECKIN-DESIGN-NOTES.)
    mapping(address => uint256) public streakOf;
    mapping(address => uint256) public checkInCountOf;
    /// @notice Bagian pool (bagian tertahan dari fee) per alamat —
    ///         akumulasi persis yang dapat ditarik kembali lewat
    ///         refundPool() bila sale gagal. Jumlah seluruh poolShareOf
    ///         selalu sama dengan poolBalance (invariant 1:1).
    mapping(address => uint256) public poolShareOf;
    mapping(address => bool) public bonusClaimed;
    mapping(address => bool) public poolRefunded;
    /// @notice Hari check-in terakhir per alamat, disimpan sebagai
    ///         dayIndex + 1 agar 0 berarti "belum pernah".
    mapping(address => uint256) private _lastDayPlusOne;

    // ------------------------------------------------------------------
    // Badge streak — ERC-721 minimal SOULBOUND (maks 1 per alamat)
    // ------------------------------------------------------------------
    string public constant name = "jajal.agent Streak Badge";
    string public constant symbol = "JSTRK";
    uint256 private _nextTokenId = 1;
    /// @notice badgeOf[alamat] = tokenId badge (0 = belum punya).
    mapping(address => uint256) public badgeOf;
    mapping(uint256 => address) private _badgeOwner;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event SaleBound(address indexed sale, address indexed jal);
    event CheckedIn(address indexed user, uint256 day, uint256 streak, uint256 totalForUser);
    event BadgeMinted(address indexed user, uint256 tokenId);
    event BonusClaimed(address indexed user, uint256 amount);
    event PoolSeeded(uint256 bnbAmount, uint256 jalAmount, uint256 liquidity);
    event PoolRefunded(address indexed user, uint256 amount);
    event RemainderBurned(uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    // ------------------------------------------------------------------
    // Guard reentrancy sederhana (pola yang sama dengan JajalSale)
    // ------------------------------------------------------------------
    uint256 private _lock;

    modifier nonReentrant() {
        require(_lock == 0, "JajalCheckIn: reentrant call");
        _lock = 1;
        _;
        _lock = 0;
    }

    /// @notice Gate Agent ID: pengirim wajib memegang Agent ID.
    modifier onlyAgentIdHolder() {
        require(registry.balanceOf(msg.sender) > 0, "JajalCheckIn: not an Agent ID holder");
        _;
    }

    constructor(address registry_, address feeRecipient_, address wbnb_) {
        require(registry_ != address(0), "JajalCheckIn: registry zero address");
        require(feeRecipient_ != address(0), "JajalCheckIn: fee recipient zero address");
        require(wbnb_ != address(0), "JajalCheckIn: wbnb zero address");
        registry = IAgentIdRegistry(registry_);
        feeRecipient = feeRecipient_;
        wbnb = wbnb_;
        deployer = msg.sender;
    }

    // ------------------------------------------------------------------
    // Pengikatan sale (satu kali oleh deployer — bukan kepemilikan)
    // ------------------------------------------------------------------
    /// @notice Ikat alamat JajalSale + JAL. Hanya deployer, hanya satu
    ///         kali, dan terverifikasi on-chain: token yang ditunjuk sale
    ///         harus menjadikan sale sebagai minter tunggalnya, registry
    ///         sale harus sama dengan registry kontrak ini, dan alamat
    ///         check-in yang tercatat di sale harus menunjuk kontrak ini
    ///         (cek arah balik — patch keputusan pemilik atas temuan
    ///         audit M-1, 2026-11-19).
    function bindSale(address sale_) external {
        require(msg.sender == deployer, "JajalCheckIn: not deployer");
        require(sale == address(0), "JajalCheckIn: sale already bound");
        require(sale_ != address(0), "JajalCheckIn: sale zero address");
        address jal_ = IJajalSale(sale_).jal();
        require(jal_ != address(0), "JajalCheckIn: sale has no token");
        require(IJAL(jal_).minter() == sale_, "JajalCheckIn: sale is not the token minter");
        require(IJajalSale(sale_).registry() == address(registry), "JajalCheckIn: registry mismatch");
        require(IJajalSale(sale_).checkIn() == address(this), "JajalCheckIn: check-in mismatch");

        sale = sale_;
        jal = jal_;

        emit SaleBound(sale_, jal_);
    }

    // ------------------------------------------------------------------
    // Views bantu
    // ------------------------------------------------------------------
    /// @notice Indeks hari UTC saat ini (patokan batas harian check-in).
    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /// @notice Hari UTC check-in terakhir alamat ini (0 bila belum pernah;
    ///         hari genesis tidak pernah terjadi di praktik).
    function lastCheckInDay(address user) public view returns (uint256) {
        uint256 plus = _lastDayPlusOne[user];
        return plus == 0 ? 0 : plus - 1;
    }

    /// @notice True bila alamat ini sudah memegang badge streak.
    function hasBadge(address user) public view returns (bool) {
        return badgeOf[user] != 0;
    }

    /// @notice Sisa cadangan bonus yang belum dibayarkan.
    function bonusReserveRemaining() public view returns (uint256) {
        return CHECKIN_ALLOCATION - bonusPaidTotal;
    }

    /// @notice Bonus yang akan diterima alamat ini bila claimBonus()
    ///         dipanggil sekarang (0 bila belum memenuhi syarat apa pun;
    ///         nilai FCFS aktual bisa lebih kecil di batas cadangan).
    function bonusQuote(address user) public view returns (uint256) {
        if (sale == address(0) || !IJajalSale(sale).finalized()) return 0;
        if (badgeOf[user] == 0 || bonusClaimed[user]) return 0;
        uint256 allocation = IJajalSale(sale).sharesOf(user) * IJajalSale(sale).TOKENS_PER_SHARE();
        return (allocation * BONUS_PERCENT) / 100;
    }

    // ------------------------------------------------------------------
    // Check-in
    // ------------------------------------------------------------------
    /// @notice Check-in harian. Syarat: memegang Agent ID, sale sudah
    ///         terikat dan belum dinyatakan gagal, membayar tepat
    ///         CHECKIN_FEE, dan belum check-in pada hari UTC ini.
    ///         Fee langsung dibagi: 50% ke feeRecipient, 50% tertahan
    ///         sebagai dana pool. Hitungan hari check-in berbeda
    ///         bersifat KUMULATIF: mencapai 7 meminting badge soulbound
    ///         (satu kali per alamat); hari terlewat tidak memutus
    ///         hitungan. Check-in tetap terbuka setelah graduation
    ///         sampai CHECKIN_END (8 Des — jendela pasca-vonis, agar
    ///         hitungan bisa tuntas walau sale habis lebih awal) dan
    ///         tertutup permanen bila sale gagal (di SALE_END) atau
    ///         setelah CHECKIN_END.
    function checkIn() external payable onlyAgentIdHolder nonReentrant {
        require(sale != address(0), "JajalCheckIn: sale not bound");
        require(block.timestamp <= CHECKIN_END, "JajalCheckIn: check-in closed");
        require(!IJajalSale(sale).saleFailed(), "JajalCheckIn: sale failed, program ended");
        require(msg.value == CHECKIN_FEE, "JajalCheckIn: exact fee required");

        uint256 day = currentDay();
        uint256 lastPlus = _lastDayPlusOne[msg.sender];
        require(lastPlus <= day, "JajalCheckIn: already checked in today");

        // effects: hitungan kumulatif — setiap hari UTC berbeda yang
        // sah menambah tepat 1 (hari yang sama sudah ditolak gerbang
        // di atas); hari terlewat TIDAK memutus/mengurangi hitungan
        // (revisi kalender 2026-11-19, menggantikan streak berurutan
        // yang ter-reset ke 1 oleh hari terlewat).
        uint256 streak = streakOf[msg.sender] + 1;
        streakOf[msg.sender] = streak;
        _lastDayPlusOne[msg.sender] = day + 1;
        checkInCountOf[msg.sender] += 1;
        totalCheckIns += 1;

        uint256 poolShare = msg.value / 2;
        uint256 teamShare = msg.value - poolShare;
        poolShareOf[msg.sender] += poolShare;
        poolBalance += poolShare;

        if (streak >= STREAK_TARGET && badgeOf[msg.sender] == 0) {
            _mintBadge(msg.sender);
        }

        emit CheckedIn(msg.sender, day, streak, checkInCountOf[msg.sender]);

        // interaction terakhir: kirim bagian fee tim
        (bool ok, ) = feeRecipient.call{value: teamShare}("");
        require(ok, "JajalCheckIn: team fee transfer failed");
    }

    // ------------------------------------------------------------------
    // Bonus streak (setelah graduation)
    // ------------------------------------------------------------------
    /// @notice Klaim bonus JAL untuk pemegang badge: 35% x alokasi JAL
    ///         final dari sale, dari cadangan 300.000.000 JAL di kontrak
    ///         ini. Satu kali per alamat. FCFS: bila sisa cadangan lebih
    ///         kecil dari bonus penuh, pengklaim menerima sisa itu; bila
    ///         cadangan sudah habis, revert. Tanpa gate Agent ID (penarikan
    ///         hak sendiri; badge sendiri hanya bisa diperoleh pemegang
    ///         Agent ID).
    function claimBonus() external nonReentrant {
        require(sale != address(0), "JajalCheckIn: sale not bound");
        require(block.timestamp <= PROGRAM_END, "JajalCheckIn: program ended");
        require(IJajalSale(sale).finalized(), "JajalCheckIn: not graduated");
        require(badgeOf[msg.sender] != 0, "JajalCheckIn: no streak badge");
        require(!bonusClaimed[msg.sender], "JajalCheckIn: bonus already claimed");
        uint256 allocation = IJajalSale(sale).sharesOf(msg.sender) * IJajalSale(sale).TOKENS_PER_SHARE();
        require(allocation > 0, "JajalCheckIn: no sale allocation");

        uint256 bonus = (allocation * BONUS_PERCENT) / 100;
        uint256 remaining = CHECKIN_ALLOCATION - bonusPaidTotal;
        require(remaining > 0, "JajalCheckIn: bonus reserve exhausted");
        if (bonus > remaining) bonus = remaining;

        bonusClaimed[msg.sender] = true;
        bonusPaidTotal += bonus;

        require(IJAL(jal).transfer(msg.sender, bonus), "JajalCheckIn: bonus transfer failed");

        emit BonusClaimed(msg.sender, bonus);
    }

    // ------------------------------------------------------------------
    // Dana pool -> LP (setelah graduation)
    // ------------------------------------------------------------------
    /// @notice Tanam seluruh dana pool yang tertahan ke pair JAL/WBNB.
    ///         Permissionless dan bisa dipanggil berkali-kali (setiap
    ///         panggilan menanam akumulasi sejak panggilan sebelumnya).
    ///         Mekanisme sisi-tunggal: separuh BNB pool ditukar ke JAL
    ///         lewat pair (harga pasar, rumus getAmountOut PancakeSwap
    ///         fee 0,25%), lalu sisa WBNB + JAL hasil tukar ditanam
    ///         LANGSUNG ke pair dan LP diterbitkan ke alamat burn — pola
    ///         yang sama dengan finalize() JajalSale (perbaikan audit #4).
    ///         Cadangan bonus JAL tidak tersentuh: JAL yang ditanam hanya
    ///         hasil pertukaran di fungsi ini.
    function seedPoolToLP() external nonReentrant {
        require(sale != address(0), "JajalCheckIn: sale not bound");
        require(IJajalSale(sale).finalized(), "JajalCheckIn: not graduated");
        uint256 amount = poolBalance;
        require(amount > 0, "JajalCheckIn: nothing to seed");
        address pairAddr = IJajalSale(sale).pair();
        require(pairAddr != address(0), "JajalCheckIn: no pair");

        poolBalance = 0;

        IPancakePair pairC = IPancakePair(pairAddr);
        IWBNB(wbnb).deposit{value: amount}();

        // tukar separuh WBNB -> JAL lewat pair
        bool wbnbIsToken0 = pairC.token0() == wbnb;
        (uint112 r0, uint112 r1, ) = pairC.getReserves();
        (uint256 reserveWbnb, uint256 reserveJal) = wbnbIsToken0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));
        uint256 swapIn = amount / 2;
        uint256 jalOut = _getAmountOut(swapIn, reserveWbnb, reserveJal);
        require(jalOut > 0, "JajalCheckIn: swap output zero");
        require(IWBNB(wbnb).transfer(pairAddr, swapIn), "JajalCheckIn: WBNB swap transfer failed");
        if (wbnbIsToken0) {
            pairC.swap(0, jalOut, address(this), "");
        } else {
            pairC.swap(jalOut, 0, address(this), "");
        }

        // tanam sisa WBNB + JAL hasil tukar langsung ke pair
        require(IWBNB(wbnb).transfer(pairAddr, amount - swapIn), "JajalCheckIn: WBNB seed transfer failed");
        require(IJAL(jal).transfer(pairAddr, jalOut), "JajalCheckIn: JAL seed transfer failed");
        uint256 liquidity = pairC.mint(BURN_ADDRESS);
        require(liquidity > 0, "JajalCheckIn: no liquidity minted");

        emit PoolSeeded(amount, jalOut, liquidity);
    }

    /// @notice Rumus getAmountOut PancakeSwap V2 (fee 0,25%).
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 9975;
        return (amountInWithFee * reserveOut) / (reserveIn * 10_000 + amountInWithFee);
    }

    // ------------------------------------------------------------------
    // Refund bagian pool bila sale gagal (refundPool)
    // ------------------------------------------------------------------
    /// @notice Tarik kembali TEPAT seluruh bagian pool sendiri bila sale
    ///         gagal: 50% x total fee check-in yang pernah dibayar alamat
    ///         ini (poolShareOf). Satu kali per alamat. Setiap klaim
    ///         terdukung 1:1 oleh saldo tertahan — poolShareOf semua
    ///         peserta selalu berjumlah persis poolBalance, karena dana
    ///         pool tidak pernah dipakai sebelum status sale jelas
    ///         (seedPoolToLP mensyaratkan graduation, yang mustahil
    ///         bersamaan dengan kegagalan). Bagian tim (50%) TIDAK
    ///         dikembalikan lewat jalur apa pun. Tanpa gate Agent ID
    ///         (aset sendiri). Di situs, fungsi ini tampil sebagai
    ///         tombol "claimPoolRefund".
    function refundPool() external nonReentrant {
        require(sale != address(0), "JajalCheckIn: sale not bound");
        require(IJajalSale(sale).saleFailed(), "JajalCheckIn: sale not failed");
        require(!poolRefunded[msg.sender], "JajalCheckIn: already refunded");
        uint256 amount = poolShareOf[msg.sender];
        require(amount > 0, "JajalCheckIn: nothing to refund");

        poolRefunded[msg.sender] = true;
        poolShareOf[msg.sender] = 0;
        poolBalance -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "JajalCheckIn: refund failed");

        emit PoolRefunded(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Bakar sisa cadangan setelah program berakhir
    // ------------------------------------------------------------------
    /// @notice Bakar SELURUH saldo JAL kontrak ini (sisa cadangan bonus
    ///         yang tidak terpakai) ke alamat burn. Permissionless —
    ///         siapa pun boleh memanggilnya SETELAH PROGRAM_END. Hanya
    ///         menyentuh JAL: dana BNB pool/refund tidak terpengaruh
    ///         (seedPoolToLP dan refundPool tetap berjalan dengan aturan
    ///         masing-masing). JAL tidak punya fungsi burn(), jadi
    ///         pembakaran = transfer ke alamat dead yang sama dengan
    ///         pembakaran LP di JajalSale — token keluar dari peredaran
    ///         secara permanen. Bila saldo 0, panggilan berhasil tanpa
    ///         memindahkan apa pun (idempoten).
    function burnRemainder() external nonReentrant {
        require(jal != address(0), "JajalCheckIn: sale not bound");
        require(block.timestamp > PROGRAM_END, "JajalCheckIn: program not ended");
        uint256 amount = IJAL(jal).balanceOf(address(this));
        if (amount > 0) {
            require(IJAL(jal).transfer(BURN_ADDRESS, amount), "JajalCheckIn: burn transfer failed");
        }
        emit RemainderBurned(amount);
    }

    // ------------------------------------------------------------------
    // Badge soulbound — ERC-721 minimal
    // ------------------------------------------------------------------
    function _mintBadge(address to) internal {
        uint256 tokenId = _nextTokenId++;
        badgeOf[to] = tokenId;
        _badgeOwner[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
        emit BadgeMinted(to, tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "JajalCheckIn: zero address");
        return badgeOf[owner] != 0 ? 1 : 0;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _badgeOwner[tokenId];
        require(owner != address(0), "JajalCheckIn: nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_badgeOwner[tokenId] != address(0), "JajalCheckIn: nonexistent token");
        return BADGE_METADATA_URI;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f; // ERC-721 metadata
    }

    /// @notice Badge bersifat soulbound: semua jalur pemindahan dan
    ///         persetujuan dinonaktifkan permanen.
    function approve(address, uint256) external pure {
        revert("JajalCheckIn: soulbound badge");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("JajalCheckIn: soulbound badge");
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_badgeOwner[tokenId] != address(0), "JajalCheckIn: nonexistent token");
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure {
        revert("JajalCheckIn: soulbound badge");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("JajalCheckIn: soulbound badge");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("JajalCheckIn: soulbound badge");
    }
}
