// app.js — jajal.agent single-page app.
// Vanilla JS + ethers.js v6 (loaded from CDN in index.html).
// Reads come from public BSC RPC endpoints (config.js); writes go through
// the visitor's own wallet (window.ethereum). No QR / pairing login anywhere.
(function () {
  "use strict";

  var CFG = window.JAJAL_CONFIG;
  var ABIS = window.JAJAL_ABIS;
  var ZERO = "0x0000000000000000000000000000000000000000";
  var SALE_LIVE = CFG.SALE_ADDRESS.toLowerCase() !== ZERO;
  var CRAFT_LIVE = CFG.AGENTCRAFT_ADDRESS.toLowerCase() !== ZERO;
  var CHECKIN_LIVE = CFG.CHECKIN_ADDRESS.toLowerCase() !== ZERO;

  // ---------------- claim waves (ENFORCED BY THE CONTRACT) ----------------
  // Owner reopening decision, 2026-11-19 (~21:37), replacing the site-layer
  // rollout decision from earlier the same evening: staged claims are now
  // enforced on-chain by JajalSale itself. claim() releases only the lots
  // whose wave has opened — a lot's wave is set by its first share position
  // (position = sale order: positions 1–1,000 are the free shares, then the
  // paid tiers in order) — and finalize() is gated until FINALIZE_OPENS, so
  // the pool cannot open before Dec 4, 17:00 UTC even if the sale sells out
  // earlier. The schedule below mirrors the contract constants
  // WAVE_1_OPENS..WAVE_4_OPENS and is used only to render the schedule table
  // and to mark the connected wallet's governing wave; the source of truth
  // for what a wallet can claim right now is the contract's claimableOf() /
  // nextClaimOpensAt() views (see renderClaimWave). The claim panel states
  // the enforcement plainly next to the schedule (see index.html).
  // Wave open times are 17:00 UTC on each date; wave 1 opens at
  // FINALIZE_OPENS (SALE_END = 1796489999 = Dec 5, 16:59 UTC).
  var CLAIM_WAVES = [
    { from: 8001, to: 10000, opens: 1796403600, label: "Dec 4, 2026 · 17:00 UTC" },
    { from: 4001, to: 8000, opens: 1796490000, label: "Dec 5, 2026 · 17:00 UTC" },
    { from: 2001, to: 4000, opens: 1796576400, label: "Dec 6, 2026 · 17:00 UTC" },
    { from: 1, to: 2000, opens: 1796662800, label: "Dec 7, 2026 · 17:00 UTC" }
  ];
  function waveForPosition(pos) {
    for (var i = 0; i < CLAIM_WAVES.length; i++) {
      if (pos >= CLAIM_WAVES[i].from && pos <= CLAIM_WAVES[i].to) return CLAIM_WAVES[i];
    }
    return null;
  }
  function fmtRange(r) {
    return r[0] === r[1]
      ? "position " + r[0].toLocaleString("en-US")
      : "positions " + r[0].toLocaleString("en-US") + "–" + r[1].toLocaleString("en-US");
  }

  // ---------------- helpers ----------------
  function $(id) { return document.getElementById(id); }
  function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : "—"; }
  function fmtBNB(wei) {
    try {
      var s = ethers.formatEther(wei);
      if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, ".0");
      return s + " BNB";
    } catch (e) { return "—"; }
  }
  function fmtJAL(wei) {
    try {
      var s = ethers.formatEther(wei);
      var parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts[0] + " JAL";
    } catch (e) { return "—"; }
  }
  function setStatus(id, msg, kind) {
    var el = $(id);
    if (!el) return;
    el.textContent = msg || "";
    el.className = "status-line" + (kind ? " " + kind : "");
  }
  function errText(e) {
    if (!e) return "Unknown error";
    if (e.reason) return e.reason;
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message.slice(0, 220);
    return String(e).slice(0, 220);
  }
  function explorerLink(addr, label) {
    return '<a href="' + CFG.BSCSCAN + "/address/" + addr + '" target="_blank" rel="noopener">' +
      (label || addr) + "</a>";
  }

  // ---------------- read provider (public RPC, with fallback) ----------------
  var readProvider = null;
  function getReadProvider() {
    if (readProvider) return readProvider;
    var providers = CFG.READ_RPCS.map(function (url) { return new ethers.JsonRpcProvider(url, 56); });
    readProvider = new ethers.FallbackProvider(providers, 56, { quorum: 1 });
    return readProvider;
  }
  function saleRead() { return new ethers.Contract(CFG.SALE_ADDRESS, ABIS.SALE_ABI, getReadProvider()); }
  function craftRead() { return new ethers.Contract(CFG.AGENTCRAFT_ADDRESS, ABIS.CRAFT_ABI, getReadProvider()); }
  function checkinRead() { return new ethers.Contract(CFG.CHECKIN_ADDRESS, ABIS.CHECKIN_ABI, getReadProvider()); }
  function registryRead() { return new ethers.Contract(CFG.AGENT_ID_REGISTRY, ABIS.REGISTRY_ABI, getReadProvider()); }

  // ---------------- wallet ----------------
  var wallet = { address: null, provider: null, signer: null, isHolder: false };
  function saleWrite() { return new ethers.Contract(CFG.SALE_ADDRESS, ABIS.SALE_ABI, wallet.signer); }
  function craftWrite() { return new ethers.Contract(CFG.AGENTCRAFT_ADDRESS, ABIS.CRAFT_ABI, wallet.signer); }
  function checkinWrite() { return new ethers.Contract(CFG.CHECKIN_ADDRESS, ABIS.CHECKIN_ABI, wallet.signer); }

  async function ensureBsc() {
    var chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === CFG.CHAIN_ID) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + CFG.CHAIN_ID.toString(16) }]
      });
    } catch (e) {
      if (e && e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x" + CFG.CHAIN_ID.toString(16),
            chainName: CFG.CHAIN_NAME,
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: CFG.READ_RPCS,
            blockExplorerUrls: [CFG.BSCSCAN]
          }]
        });
      } else { throw e; }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("free-status", "No wallet found. Open this page inside a wallet browser (for example Binance Wallet or MetaMask) to interact.", "error");
      return;
    }
    try {
      await ensureBsc();
      wallet.provider = new ethers.BrowserProvider(window.ethereum);
      wallet.signer = await wallet.provider.getSigner();
      wallet.address = await wallet.signer.getAddress();
      $("connect-btn").textContent = shortAddr(wallet.address);
      var bal = await registryRead().balanceOf(wallet.address);
      wallet.isHolder = bal > 0n;
      $("agentid-badge").classList.toggle("hidden", !wallet.isHolder);
      if (!wallet.isHolder) {
        setStatus("free-status", "This wallet does not hold an Agent ID. An Agent ID is required to claim, buy, register skills, or endorse.", "error");
      }
      await refreshSale();
      await refreshCheckin();
      await refreshMySkills();
      renderAgents();
    } catch (e) {
      setStatus("free-status", "Wallet connection failed: " + errText(e), "error");
    }
  }

  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", function () { location.reload(); });
    window.ethereum.on("chainChanged", function () { location.reload(); });
  }
  $("connect-btn").addEventListener("click", connectWallet);

  // ---------------- countdown ----------------
  function tickCountdown() {
    var el = $("countdown");
    var now = Math.floor(Date.now() / 1000);
    var left = CFG.SALE_END - now;
    if (left <= 0) { el.textContent = "Deadline passed"; return; }
    var d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600),
        m = Math.floor((left % 3600) / 60), s = left % 60;
    el.textContent = d + "d " + h + "h " + m + "m " + s + "s left";
  }
  setInterval(tickCountdown, 1000); tickCountdown();

  // ---------------- sale state ----------------
  var sale = null; // snapshot of on-chain sale state
  var mySale = null; // snapshot for the connected wallet

  async function refreshSale() {
    if (!SALE_LIVE) {
      $("deploy-notice").classList.remove("hidden");
      $("stat-status").textContent = "Not live yet";
      fillFooter();
      return;
    }
    try {
      var c = saleRead();
      var vals = await Promise.all([
        c.sharesSold(), c.totalRaised(), c.currentSharePrice(),
        c.finalized(), c.claimsOpen(), c.saleFailed()
      ]);
      sale = {
        sold: Number(vals[0]), raised: vals[1], price: vals[2],
        finalized: vals[3], claimsOpen: vals[4], failed: vals[5]
      };
      $("stat-sold").textContent = sale.sold.toLocaleString("en-US") + " / 10,000";
      $("progress-bar").style.width = (sale.sold / 100) + "%";
      var freeLeft = Math.max(0, 1000 - sale.sold);
      $("stat-free-left").textContent = freeLeft.toLocaleString("en-US") + " / 1,000";
      $("stat-price").textContent = sale.sold < 1000 ? "Free phase" : fmtBNB(sale.price) + " / share";
      $("stat-raised").textContent = fmtBNB(sale.raised);
      $("stat-status").textContent =
        sale.finalized ? "Pool open — claims live" :
        sale.failed ? "Ended below target — refunds open" :
        sale.sold >= 10000 ? "Sold out — awaiting finalize" :
        sale.sold < 1000 ? "Live — free phase" : "Live — paid phase";

      renderWaveTable();
      $("finalize-box").classList.toggle("hidden", !(sale.sold >= 10000 && !sale.finalized));
      if (sale.sold >= 10000 && !sale.finalized) {
        // finalize() is gated by the contract until FINALIZE_OPENS (Dec 4,
        // 17:00 UTC): hold the button and say so instead of letting the call
        // revert in the visitor's wallet.
        var finOpen = Math.floor(Date.now() / 1000) >= CFG.FINALIZE_OPENS;
        $("finalize-btn").disabled = !finOpen;
        if (!finOpen) {
          setStatus("finalize-status",
            "The contract unlocks finalize on Dec 4, 2026 · 17:00 UTC — the call reverts before then, even though the sale is sold out.");
        }
      }
      $("claim-box").classList.toggle("hidden", !sale.finalized);
      $("refund-box").classList.toggle("hidden", !sale.failed);
      $("free-box").classList.toggle("hidden", sale.finalized || sale.failed);
      $("buy-box").classList.toggle("hidden", sale.finalized || sale.failed);

      if (wallet.address) {
        var mine = await Promise.all([
          c.sharesOf(wallet.address), c.paidSharesOf(wallet.address), c.paidBy(wallet.address),
          c.freeClaimed(wallet.address), c.claimed(wallet.address), c.refunded(wallet.address),
          c.claimableOf(wallet.address), c.nextClaimOpensAt(wallet.address)
        ]);
        mySale = {
          shares: Number(mine[0]), paidShares: Number(mine[1]), paidBy: mine[2],
          freeClaimed: mine[3], claimed: mine[4], refunded: mine[5],
          // Contract views are the source of truth for claim state:
          // claimableOf -> (shares, jalAmount, cashback) releasable right now
          // (all zero before finalize); nextClaimOpensAt -> when the next
          // locked lot opens (0 when nothing is left waiting).
          claimableShares: Number(mine[6][0]), claimableJal: mine[6][1],
          claimableCashback: mine[6][2], nextClaimOpensAt: Number(mine[7])
        };
        await scanMyPositions();
        renderMyPosition();
      }
      updateBuyPreview();
      refreshFreeButton();
      fillFooter();
    } catch (e) {
      $("stat-status").textContent = "Could not load sale data";
    }
  }

  // ---------------- wave schedule table ----------------
  function renderWaveTable() {
    var body = $("claim-waves-body");
    if (!body) return;
    var now = Math.floor(Date.now() / 1000);
    body.innerHTML = "";
    CLAIM_WAVES.forEach(function (w) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-wave-from", w.from);
      if (now >= w.opens) tr.className = "wave-open";
      var td1 = document.createElement("td");
      td1.textContent = w.label + (now >= w.opens ? " — open" : "");
      var td2 = document.createElement("td");
      td2.textContent = w.from.toLocaleString("en-US") + "–" + w.to.toLocaleString("en-US") +
        (w.from === 1 ? " (free shares + tier 1)" : "");
      tr.appendChild(td1);
      tr.appendChild(td2);
      body.appendChild(tr);
    });
  }
  function markWaveRows(gov) {
    var body = $("claim-waves-body");
    if (!body) return;
    body.querySelectorAll("tr").forEach(function (tr) {
      var isMine = gov && Number(tr.getAttribute("data-wave-from")) === gov.from;
      tr.classList.toggle("wave-mine", !!isMine);
    });
  }

  // ---------------- my share positions (from the event log) ----------------
  // The contract records lots (lotOf/lotCount) but no single "my positions"
  // summary, and its events carry everything needed to reconstruct position
  // ranges exactly: FreeClaimed(user, sharesSold) fires with the cumulative
  // sharesSold AFTER the free share lands, so that share's position is the
  // sharesSold value itself; Bought(user, shares, cost, sharesSold)
  // likewise, so a purchase covers positions
  // (sharesSold - shares + 1) .. sharesSold. Scanning both event streams for
  // the connected wallet (user is an indexed topic) rebuilds its ranges.
  // The scan is used ONLY to display the wallet's position ranges and to
  // mark its governing wave in the schedule table. What can actually be
  // claimed is decided by the contract's claimableOf() / nextClaimOpensAt()
  // views (see renderClaimWave), so a failed or unknown scan no longer
  // affects the claim button in any way.
  var myPositions = null; // {ranges: [[start, end], ...], max: n, seen: n}
  var positionsScannedFor = null;

  async function scanMyPositions() {
    if (!SALE_LIVE || !wallet.address) return;
    var me = wallet.address.toLowerCase();
    if (positionsScannedFor === me) return;
    try {
      var c = saleRead();
      var latest = await getReadProvider().getBlockNumber();
      var from = CFG.SALE_DEPLOY_BLOCK > 0 ? CFG.SALE_DEPLOY_BLOCK : 0;
      if (from === 0) from = latest; // deploy block not configured: nothing historical to scan
      var ranges = [];
      var seen = 0;
      if (from <= latest) {
        var filters = [c.filters.FreeClaimed(wallet.address), c.filters.Bought(wallet.address)];
        var chunk = 50000;
        var block = from;
        while (block <= latest) {
          var to = Math.min(block + chunk - 1, latest);
          try {
            for (var f = 0; f < filters.length; f++) {
              var logs = await c.queryFilter(filters[f], block, to);
              logs.forEach(function (log) {
                var soldAfter = Number(log.args.sharesSold);
                var n = log.args.shares !== undefined ? Number(log.args.shares) : 1;
                ranges.push([soldAfter - n + 1, soldAfter]);
                seen += n;
              });
            }
            block = to + 1;
            if (chunk < 200000) chunk *= 2;
          } catch (e) {
            if (chunk <= 2000) throw e;
            chunk = Math.max(2000, Math.floor(chunk / 5));
          }
        }
      }
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var max = ranges.length ? ranges[ranges.length - 1][1] : 0;
      // The reconstruction is only trusted when it accounts for exactly the
      // shares the contract says this wallet holds.
      if (mySale && seen !== mySale.shares) { myPositions = null; return; }
      myPositions = { ranges: ranges, max: max, seen: seen };
      positionsScannedFor = me;
    } catch (e) {
      myPositions = null; // unknown — the panel degrades honestly
    }
  }

  // Format a wave-open timestamp for display: the four wave constants get
  // their schedule labels; anything else is rendered as a UTC date/time.
  function fmtOpensAt(ts) {
    for (var i = 0; i < CLAIM_WAVES.length; i++) {
      if (CLAIM_WAVES[i].opens === ts) return CLAIM_WAVES[i].label;
    }
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = new Date(ts * 1000); // read UTC fields directly — all site times are UTC
    var hh = String(d.getUTCHours()).padStart(2, "0");
    var mm = String(d.getUTCMinutes()).padStart(2, "0");
    return months[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear() +
      " · " + hh + ":" + mm + " UTC";
  }

  function renderClaimWave() {
    var btn = $("claim-btn");
    var el = $("claim-wave-status");
    if (!sale || !sale.finalized || !mySale) return;
    if (mySale.claimed) {
      // claimed() is true only once EVERY lot has been released.
      el.textContent = "You have already claimed everything — nothing left to release.";
      btn.disabled = true;
      markWaveRows(null);
      return;
    }
    if (mySale.shares === 0) {
      el.textContent = "This wallet holds no shares, so there is nothing to claim.";
      btn.disabled = true;
      markWaveRows(null);
      return;
    }
    // The contract views are the source of truth for the button: claimableOf
    // says what claim() would release right now; nextClaimOpensAt says when
    // the next still-locked lot opens (0 = nothing left waiting). Position
    // ranges from the event scan are display-only context.
    var known = myPositions && myPositions.ranges.length > 0 && myPositions.seen === mySale.shares;
    var rangeTxt = known ? " Your shares: " + myPositions.ranges.map(fmtRange).join(" and ") + "." : "";
    var gov = known ? waveForPosition(myPositions.max) : null;
    if (mySale.claimableShares > 0) {
      el.textContent = "You can claim now: " + mySale.claimableShares + " share(s) — " +
        fmtJAL(mySale.claimableJal) + " plus a cashback of " + fmtBNB(mySale.claimableCashback) + "." +
        rangeTxt +
        (mySale.nextClaimOpensAt > 0
          ? " Your remaining lots stay locked in the contract until " + fmtOpensAt(mySale.nextClaimOpensAt) + "."
          : "");
      btn.disabled = false;
    } else if (mySale.nextClaimOpensAt > 0) {
      el.textContent = "Nothing is claimable yet." + rangeTxt +
        " The contract releases your next lot on " + fmtOpensAt(mySale.nextClaimOpensAt) +
        " — claim() reverts until a lot's wave has opened.";
      btn.disabled = true;
    } else {
      el.textContent = "Nothing is claimable right now." + rangeTxt;
      btn.disabled = true;
    }
    markWaveRows(gov);
  }

  function renderMyPosition() {
    if (!mySale) { $("my-position").textContent = ""; return; }
    var txt = "Your holdings: " + mySale.shares + " share(s), paid " + fmtBNB(mySale.paidBy) + ".";
    if (mySale.claimed) txt += " Already claimed.";
    if (mySale.refunded) txt += " Already refunded.";
    $("my-position").textContent = txt;

    if (sale && sale.finalized) {
      var jalAmt = BigInt(mySale.shares) * 100000n * 10n ** 18n;
      var cashback = mySale.paidBy / 2n;
      $("claim-detail").textContent = mySale.claimed
        ? "You have already claimed everything."
        : "Your full entitlement is " + fmtJAL(jalAmt) + " plus a cashback of " + fmtBNB(cashback) +
          " (50% of the BNB you paid). The contract releases it in waves by share position " +
          "(schedule below); free shares receive JAL with no cashback.";
      renderClaimWave();
    }
    if (sale && sale.failed) {
      $("refund-detail").textContent = mySale.refunded
        ? "You have already withdrawn your refund."
        : (mySale.paidBy > 0n
            ? "You can withdraw a 100% refund of " + fmtBNB(mySale.paidBy) + "."
            : "You only hold a free share, which expires — there is no payment to refund.");
      $("refund-btn").disabled = mySale.refunded || mySale.paidBy === 0n;
    }
  }

  // ---------------- free claim (site-level follow gate) ----------------
  var GATE_KEY = "jajal_free_gate_v1";
  var gate = { followed: false, handle: "" };
  try { gate = Object.assign(gate, JSON.parse(localStorage.getItem(GATE_KEY) || "{}")); } catch (e) {}
  function saveGate() { try { localStorage.setItem(GATE_KEY, JSON.stringify(gate)); } catch (e) {} }

  $("follow-link").addEventListener("click", function () {
    gate.followed = true; saveGate();
    $("follow-done").classList.remove("hidden");
    refreshFreeButton();
  });
  if (gate.followed) $("follow-done").classList.remove("hidden");
  var handleInput = $("x-handle");
  handleInput.value = gate.handle || "";
  handleInput.addEventListener("input", function () {
    gate.handle = handleInput.value.trim();
    saveGate(); refreshFreeButton();
  });

  function refreshFreeButton() {
    var btn = $("claim-free-btn");
    var ok = SALE_LIVE && gate.followed && gate.handle.replace(/^@/, "").length >= 1 &&
      wallet.address && wallet.isHolder && sale && !sale.finalized && !sale.failed &&
      sale.sold < 1000 && !(mySale && mySale.freeClaimed) &&
      Math.floor(Date.now() / 1000) <= CFG.SALE_END;
    btn.disabled = !ok;
    if (mySale && mySale.freeClaimed) setStatus("free-status", "You already claimed your free share.", "ok");
  }

  $("claim-free-btn").addEventListener("click", async function () {
    try {
      setStatus("free-status", "Confirm the transaction in your wallet…");
      var tx = await saleWrite().claimFree();
      setStatus("free-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("free-status", "Free share claimed. Welcome aboard.", "ok");
      positionsScannedFor = null; // positions changed — rescan on next refresh
      await refreshSale();
    } catch (e) { setStatus("free-status", "Claim failed: " + errText(e), "error"); }
  });

  // ---------------- buy ----------------
  async function updateBuyPreview() {
    var n = parseInt($("buy-n").value, 10);
    if (!SALE_LIVE || !sale || isNaN(n) || n < 1) { $("buy-cost").textContent = "Cost: —"; return; }
    try {
      var cost = await saleRead().costFor(n);
      $("buy-cost").textContent = "Cost: " + fmtBNB(cost);
      $("buy-btn").disabled = !(wallet.address && wallet.isHolder && !sale.finalized && !sale.failed && sale.sold >= 1000);
    } catch (e) { $("buy-cost").textContent = "Cost: —"; }
    if (mySale) {
      var maxMore = Math.min(10 - mySale.paidShares, 11 - mySale.shares, 10000 - (sale ? sale.sold : 0));
      $("buy-cap").textContent = "You hold " + mySale.shares + " share(s); you can buy up to " +
        Math.max(0, maxMore) + " more (11 per wallet max).";
    } else if (sale && sale.sold < 1000) {
      $("buy-cap").textContent = "Paid shares open once the 1,000 free shares are taken.";
    }
  }
  $("buy-n").addEventListener("input", updateBuyPreview);

  $("buy-btn").addEventListener("click", async function () {
    var n = parseInt($("buy-n").value, 10);
    if (isNaN(n) || n < 1) { setStatus("buy-status", "Enter a share amount of at least 1.", "error"); return; }
    try {
      var cost = await saleRead().costFor(n);
      setStatus("buy-status", "Confirm the transaction in your wallet…");
      var tx = await saleWrite().buy(n, { value: cost });
      setStatus("buy-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("buy-status", "Purchase complete: " + n + " share(s).", "ok");
      positionsScannedFor = null; // positions changed — rescan on next refresh
      await refreshSale();
    } catch (e) { setStatus("buy-status", "Purchase failed: " + errText(e), "error"); }
  });

  // ---------------- finalize / claim / refund ----------------
  $("finalize-btn").addEventListener("click", async function () {
    if (!wallet.address) { setStatus("finalize-status", "Connect your wallet first.", "error"); return; }
    try {
      setStatus("finalize-status", "Confirm the transaction in your wallet…");
      var tx = await saleWrite().finalize();
      setStatus("finalize-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("finalize-status", "Pool opened. Claims are live.", "ok");
      await refreshSale();
    } catch (e) { setStatus("finalize-status", "Finalize failed: " + errText(e), "error"); }
  });

  $("claim-btn").addEventListener("click", async function () {
    try {
      setStatus("claim-status", "Confirm the transaction in your wallet…");
      var tx = await saleWrite().claim();
      setStatus("claim-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("claim-status", "Claimed. Your JAL and cashback are in your wallet.", "ok");
      await refreshSale();
    } catch (e) { setStatus("claim-status", "Claim failed: " + errText(e), "error"); }
  });

  $("refund-btn").addEventListener("click", async function () {
    try {
      setStatus("refund-status", "Confirm the transaction in your wallet…");
      var tx = await saleWrite().refund();
      setStatus("refund-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("refund-status", "Refund withdrawn in full.", "ok");
      await refreshSale();
    } catch (e) { setStatus("refund-status", "Refund failed: " + errText(e), "error"); }
  });

  // ---------------- check-in (JajalCheckIn) ----------------
  // CHECKIN_ABI is generated from the final JajalCheckIn artifact (see
  // abi.js). Every view read goes through tryCall, so if a view is missing,
  // that field degrades to "—" instead of breaking the panel. The write
  // functions are checkIn / claimBonus / refundPool (verified against the
  // final artifact 2026-11-19; re-check once at deploy, SITE-REPORT.md).
  var myCheckin = null; // snapshot for the connected wallet
  var checkinFeeWei = null; // fee read from the contract, when available

  async function tryCall(p) {
    try { return await p; } catch (e) { return null; }
  }
  function utcDayIndex() { return Math.floor(Date.now() / 86400000); }

  async function refreshCheckin() {
    if (!CHECKIN_LIVE) {
      $("ci-status").textContent = "Not live yet";
      $("ci-notlive").classList.remove("hidden");
      return;
    }
    $("ci-notlive").classList.add("hidden");
    try {
      var c = checkinRead();
      var fee = await tryCall(c.CHECKIN_FEE());
      if (fee !== null) {
        checkinFeeWei = fee;
        $("ci-fee").textContent = fmtBNB(fee);
        $("ci-checkin-btn").textContent = "Check In — " + fmtBNB(fee);
      }
      var reserve = await tryCall(c.bonusReserveRemaining());
      if (reserve !== null) $("ci-reserve").textContent = fmtJAL(reserve);
      var pool = await tryCall(c.poolBalance());
      if (pool !== null) $("ci-pool").textContent = fmtBNB(pool);
      $("ci-status").textContent =
        sale && sale.finalized ? "Live — bonus claims open" :
        sale && sale.failed ? "Ended — pool refunds open" : "Live";

      if (wallet.address) {
        var mine = await Promise.all([
          tryCall(c.streakOf(wallet.address)),
          tryCall(c.lastCheckInDay(wallet.address)),
          tryCall(c.totalCheckIns(wallet.address)),
          tryCall(c.hasBadge(wallet.address)),
          tryCall(c.bonusClaimed(wallet.address)),
          tryCall(c.bonusQuote(wallet.address))
        ]);
        myCheckin = {
          streak: mine[0] !== null ? Number(mine[0]) : null,
          lastDay: mine[1] !== null ? Number(mine[1]) : null,
          total: mine[2] !== null ? Number(mine[2]) : null,
          hasBadge: mine[3],
          bonusClaimed: mine[4],
          bonusFor: mine[5]
        };
        renderMyCheckin();
      }
    } catch (e) {
      $("ci-status").textContent = "Could not load check-in data";
    }
  }

  function renderMyCheckin() {
    if (!myCheckin) return;
    var m = myCheckin;
    $("ci-my-hint").textContent = wallet.isHolder
      ? "Your check-in status, read from the contract."
      : "Your wallet does not hold an Agent ID, so it cannot check in.";
    $("ci-my-streak").textContent = m.streak === null ? "—" : m.streak + (m.streak === 1 ? " day" : " days");
    var checkedToday = m.lastDay !== null && m.lastDay === utcDayIndex();
    $("ci-my-today").textContent = m.lastDay === null ? "—" : (checkedToday ? "Yes" : "No");
    $("ci-my-badge").textContent = m.hasBadge === null ? "—" : (m.hasBadge ? "Earned ✓" : "Not yet — needs 7 check-in days");
    if (m.bonusClaimed === true) {
      $("ci-my-bonus").textContent = "Claimed";
    } else if (m.bonusFor !== null && m.bonusFor !== undefined) {
      $("ci-my-bonus").textContent = m.bonusFor > 0n
        ? fmtJAL(m.bonusFor) + (sale && sale.finalized ? "" : " — opens after the pool")
        : "—";
    } else {
      $("ci-my-bonus").textContent = "—";
    }
    $("ci-checkin-btn").disabled = !(wallet.isHolder && !checkedToday);
    var showBonus = m.hasBadge === true && sale && sale.finalized && m.bonusClaimed === false;
    $("ci-bonus-btn").classList.toggle("hidden", !showBonus);
    var showRefund = !!(sale && sale.failed && m.total !== null && m.total > 0);
    $("ci-refund-btn").classList.toggle("hidden", !showRefund);
  }

  $("ci-checkin-btn").addEventListener("click", async function () {
    try {
      var fee = checkinFeeWei !== null ? checkinFeeWei : BigInt(CFG.CHECKIN_FEE_FALLBACK_WEI);
      setStatus("ci-my-status", "Confirm the transaction in your wallet…");
      var tx = await checkinWrite().checkIn({ value: fee });
      setStatus("ci-my-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("ci-my-status", "Checked in for today. Your check-in days add up — missed days don't reset them.", "ok");
      await refreshCheckin();
    } catch (e) { setStatus("ci-my-status", "Check-in failed: " + errText(e), "error"); }
  });

  $("ci-bonus-btn").addEventListener("click", async function () {
    try {
      setStatus("ci-my-status", "Confirm the transaction in your wallet…");
      var tx = await checkinWrite().claimBonus();
      setStatus("ci-my-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("ci-my-status", "Bonus claimed.", "ok");
      await refreshCheckin();
    } catch (e) { setStatus("ci-my-status", "Bonus claim failed: " + errText(e), "error"); }
  });

  $("ci-refund-btn").addEventListener("click", async function () {
    try {
      setStatus("ci-my-status", "Confirm the transaction in your wallet…");
      var tx = await checkinWrite().refundPool();
      setStatus("ci-my-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("ci-my-status", "Check-in pool refund claimed.", "ok");
      await refreshCheckin();
    } catch (e) { setStatus("ci-my-status", "Refund claim failed: " + errText(e), "error"); }
  });

  // ---------------- footer ----------------
  var footerFilled = false;
  async function fillFooter() {
    function setAddr(id, addr, zeroText) {
      var el = $(id);
      if (!addr || addr.toLowerCase() === ZERO) { el.textContent = zeroText; return; }
      el.innerHTML = explorerLink(addr) + ' · <a href="' + CFG.sourcifyUrl(addr) +
        '" target="_blank" rel="noopener">Sourcify</a>';
    }
    setAddr("ft-sale", SALE_LIVE ? CFG.SALE_ADDRESS : null, "announced at launch — 21 Nov 2026");
    setAddr("ft-craft", CRAFT_LIVE ? CFG.AGENTCRAFT_ADDRESS : null, "announced at launch — 21 Nov 2026");
    setAddr("ft-checkin", CHECKIN_LIVE ? CFG.CHECKIN_ADDRESS : null, "announced at launch — 21 Nov 2026");
    if (SALE_LIVE && !footerFilled) {
      try {
        var jalAddr = CFG.JAL_ADDRESS.toLowerCase() !== ZERO ? CFG.JAL_ADDRESS : await saleRead().jal();
        setAddr("ft-jal", jalAddr, "—");
        footerFilled = true;
      } catch (e) { setAddr("ft-jal", null, "—"); }
    } else if (!SALE_LIVE) {
      setAddr("ft-jal", null, "created by the sale contract at launch");
    }
  }

  // ---------------- directory (AgentCraft) ----------------
  var skillNames = [];
  var agentsData = []; // [{address, skills: [{id, name, count, endorsedByMe}], total}]
  var nameCache = {};
  try { nameCache = JSON.parse(localStorage.getItem("jajal_names_v1") || "{}"); } catch (e) {}

  async function resolveAiName(addr) {
    var key = addr.toLowerCase();
    if (nameCache[key]) return nameCache[key];
    try {
      var reg = registryRead();
      var tokenId = await reg.tokenOfOwnerByIndex(addr, 0);
      var uri = await reg.tokenURI(tokenId);
      var meta = null;
      if (uri.indexOf("data:application/json;base64,") === 0) {
        meta = JSON.parse(atob(uri.slice("data:application/json;base64,".length)));
      } else if (uri.indexOf("data:application/json,") === 0) {
        meta = JSON.parse(decodeURIComponent(uri.slice("data:application/json,".length)));
      } else if (/^https?:\/\//.test(uri)) {
        var resp = await fetch(uri);
        meta = await resp.json();
      }
      if (meta && meta.name) {
        nameCache[key] = meta.name;
        try { localStorage.setItem("jajal_names_v1", JSON.stringify(nameCache)); } catch (e) {}
        return meta.name;
      }
    } catch (e) { /* registry may not be enumerable / metadata unreachable — address only */ }
    return null;
  }

  async function scanAgentAddresses() {
    // Collect agent addresses from SkillRegistered + Endorsed events, in
    // block chunks, with a localStorage cache so repeat visits are incremental.
    var cache = { agents: [], lastBlock: 0 };
    try { cache = Object.assign(cache, JSON.parse(localStorage.getItem("jajal_dir_v1") || "{}")); } catch (e) {}
    var known = new Set(cache.agents.map(function (a) { return a.toLowerCase(); }));
    var latest = await getReadProvider().getBlockNumber();
    var from = CFG.AGENTCRAFT_DEPLOY_BLOCK > 0 ? CFG.AGENTCRAFT_DEPLOY_BLOCK : 0;
    if (cache.lastBlock > 0) from = Math.max(from, cache.lastBlock + 1);
    if (from === 0) from = latest; // deploy block not configured yet: nothing historical to scan
    if (from > latest) return cache.agents;

    var craft = craftRead();
    var filters = [craft.filters.SkillRegistered(), craft.filters.Endorsed()];
    var chunk = 50000;
    var block = from;
    while (block <= latest) {
      var to = Math.min(block + chunk - 1, latest);
      try {
        for (var f = 0; f < filters.length; f++) {
          var logs = await craft.queryFilter(filters[f], block, to);
          logs.forEach(function (log) {
            var a = (log.args && (log.args.agent || log.args.target));
            if (a) known.add(a.toLowerCase());
          });
        }
        block = to + 1;
        if (chunk < 200000) chunk *= 2;
      } catch (e) {
        if (chunk <= 2000) throw e;
        chunk = Math.max(2000, Math.floor(chunk / 5));
      }
    }
    cache.agents = Array.from(known);
    cache.lastBlock = latest;
    try { localStorage.setItem("jajal_dir_v1", JSON.stringify(cache)); } catch (e) {}
    return cache.agents;
  }

  async function loadDirectory() {
    if (!CRAFT_LIVE) {
      $("directory-stats").textContent = "The directory contract is not live yet — it launches together with the sale on 21 November 2026.";
      $("agent-list").innerHTML = '<p class="muted">Nothing here yet.</p>';
      $("leaderboard").innerHTML = '<li class="muted">Nothing here yet.</li>';
      $("my-skills").innerHTML = "";
      return;
    }
    try {
      var craft = craftRead();
      var count = Number(await craft.skillsCount());
      skillNames = [];
      for (var i = 0; i < count; i++) skillNames.push(await craft.skills(i));
      var total = await craft.totalAgents();
      $("directory-stats").textContent = total.toString() + " agent(s) registered · " + count + " skills in the directory.";

      var addresses = await scanAgentAddresses();
      agentsData = [];
      for (var a = 0; a < addresses.length; a++) {
        var addr = addresses[a];
        var ids = await craft.skillsOf(addr);
        if (!ids || ids.length === 0) continue; // unregistered everything since the event
        var skills = [];
        var totalEndo = 0;
        for (var s = 0; s < ids.length; s++) {
          var id = Number(ids[s]);
          var cnt = Number(await craft.endorsementCount(addr, id));
          var byMe = false;
          if (wallet.address && wallet.address.toLowerCase() !== addr.toLowerCase()) {
            byMe = await craft.hasEndorsed(wallet.address, addr, id);
          }
          skills.push({ id: id, name: skillNames[id] || ("Skill #" + id), count: cnt, endorsedByMe: byMe });
          totalEndo += cnt;
        }
        agentsData.push({ address: addr, skills: skills, total: totalEndo, aiName: null });
      }
      renderAgents();
      renderLeaderboard();
      // Resolve .ai names in the background, then re-render labels.
      agentsData.forEach(function (ag) {
        resolveAiName(ag.address).then(function (name) {
          if (name) { ag.aiName = name; renderAgents(); renderLeaderboard(); }
        });
      });
    } catch (e) {
      setStatus("directory-status", "Could not load the directory: " + errText(e), "error");
    }
  }

  function agentLabel(ag) {
    var addrHtml = '<span class="mono">' + shortAddr(ag.address) + "</span>";
    if (ag.aiName) return "<strong>" + ag.aiName + "</strong> · " + addrHtml;
    return addrHtml;
  }

  function renderAgents() {
    var box = $("agent-list");
    if (!CRAFT_LIVE) return;
    if (agentsData.length === 0) {
      box.innerHTML = '<p class="muted">No agents have registered skills yet. Be the first.</p>';
      return;
    }
    var me = wallet.address ? wallet.address.toLowerCase() : null;
    box.innerHTML = "";
    agentsData.forEach(function (ag) {
      var card = document.createElement("div");
      card.className = "agent-card";
      var isMe = me && ag.address.toLowerCase() === me;
      var html = '<div class="agent-head"><span class="agent-name">' + agentLabel(ag) +
        (isMe ? " (you)" : "") + '</span><span class="agent-total">' + ag.total + " endorsement(s)</span></div>";
      html += '<div class="agent-skills">';
      ag.skills.forEach(function (sk) {
        html += '<div class="skill-row"><span class="skill-name">' + sk.name + '</span>' +
          '<span class="count">' + sk.count + " endorsement(s)</span>";
        if (!isMe) {
          html += '<button class="btn btn-small" data-endorse="' + ag.address + '" data-skill="' + sk.id + '"' +
            (wallet.address && wallet.isHolder ? "" : " disabled") + ">" +
            (sk.endorsedByMe ? "Unendorse" : "Endorse") + "</button>";
        }
        html += "</div>";
      });
      html += "</div>";
      card.innerHTML = html;
      box.appendChild(card);
    });
    box.querySelectorAll("[data-endorse]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var target = btn.getAttribute("data-endorse");
        var skillId = parseInt(btn.getAttribute("data-skill"), 10);
        var undo = btn.textContent === "Unendorse";
        try {
          setStatus("directory-status", "Confirm the transaction in your wallet…");
          var tx = undo ? await craftWrite().unendorse(target, skillId)
                        : await craftWrite().endorse(target, skillId);
          setStatus("directory-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
          await tx.wait();
          setStatus("directory-status", undo ? "Endorsement removed." : "Endorsement recorded on-chain.", "ok");
          await loadDirectory();
        } catch (e) { setStatus("directory-status", "Failed: " + errText(e), "error"); }
      });
    });
  }

  function renderLeaderboard() {
    var lb = $("leaderboard");
    if (!CRAFT_LIVE) return;
    var sorted = agentsData.slice().sort(function (x, y) { return y.total - x.total; }).slice(0, 10);
    if (sorted.length === 0) { lb.innerHTML = '<li class="muted">No endorsements yet.</li>'; return; }
    lb.innerHTML = "";
    sorted.forEach(function (ag) {
      var li = document.createElement("li");
      li.innerHTML = agentLabel(ag) + " — " + ag.total + " endorsement(s) across " + ag.skills.length + " skill(s)";
      lb.appendChild(li);
    });
  }

  async function refreshMySkills() {
    var box = $("my-skills");
    if (!CRAFT_LIVE || skillNames.length === 0) return;
    if (!wallet.address) {
      $("my-skills-hint").textContent = "Connect your wallet to manage your skills.";
      box.innerHTML = "";
      return;
    }
    $("my-skills-hint").textContent = wallet.isHolder
      ? "Tap a skill to register it; tap again to remove it. Changes are recorded on-chain."
      : "Your wallet does not hold an Agent ID, so skills cannot be registered from it.";
    try {
      var craft = craftRead();
      var mine = await craft.skillsOf(wallet.address);
      var mineSet = new Set(Array.from(mine).map(Number));
      box.innerHTML = "";
      skillNames.forEach(function (name, id) {
        var b = document.createElement("button");
        b.className = "chip" + (mineSet.has(id) ? " on" : "");
        b.textContent = (mineSet.has(id) ? "✓ " : "") + name;
        b.disabled = !wallet.isHolder;
        b.addEventListener("click", async function () {
          try {
            setStatus("skills-status", "Confirm the transaction in your wallet…");
            var tx = mineSet.has(id) ? await craftWrite().unregisterSkill(id)
                                     : await craftWrite().registerSkill(id);
            setStatus("skills-status", "Transaction sent: " + tx.hash + " — waiting for confirmation…");
            await tx.wait();
            setStatus("skills-status", "Skills updated.", "ok");
            await refreshMySkills();
            await loadDirectory();
          } catch (e) { setStatus("skills-status", "Failed: " + errText(e), "error"); }
        });
        box.appendChild(b);
      });
    } catch (e) { setStatus("skills-status", "Could not load your skills: " + errText(e), "error"); }
  }

  // ---------------- init ----------------
  renderWaveTable();
  refreshSale();
  refreshCheckin();
  loadDirectory().then(refreshMySkills);
  setInterval(refreshSale, 30000);
  setInterval(refreshCheckin, 30000);
})();
