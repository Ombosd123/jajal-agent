// config.js — jajal.agent site configuration.
//
// ============================================================
//  DEPLOYED — Saturday 21 Nov 2026. All four contracts are live on
//  BSC mainnet and verified on Sourcify. Addresses and deploy blocks
//  below are the read-back values from the deployment transactions.
// ============================================================
window.JAJAL_CONFIG = {
  // --- Contract addresses (BSC mainnet) ---
  // JajalSale — deployed in block 134822155.
  SALE_ADDRESS: "0xDF31E312a9f6eA014FeBA0e43A96Bc8aB86f5AA9",
  // AgentCraft — deployed in block 134823306.
  AGENTCRAFT_ADDRESS: "0xe28a15CC8fFb590630B771D5C3B8FB3644AbB7f1",
  // JajalCheckIn — deployed in block 134820377.
  CHECKIN_ADDRESS: "0x7b1624Da7bb5DDC580118c93D8F3Df53b058178d",
  // JAL is created by the JajalSale constructor (same transaction / block
  // as the sale), so at runtime the site reads the real JAL address from
  // sale.jal(). This field is the matching fallback / documentation value.
  JAL_ADDRESS: "0x018E15cA219CCe9138022F45d52FD21ADe147d46",

  // --- Deploy blocks (first block to scan for directory events) ---
  SALE_DEPLOY_BLOCK: 134822155,
  AGENTCRAFT_DEPLOY_BLOCK: 134823306,
  CHECKIN_DEPLOY_BLOCK: 134820377,

  // --- Fixed network / ecosystem values ---
  // Official SPACE ID Agent ID registry on BSC (ERC-721, non-transferable).
  AGENT_ID_REGISTRY: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  CHAIN_ID: 56,
  CHAIN_NAME: "BNB Smart Chain",
  // Sale deadline: 5 Dec 2026, 16:59:59 UTC. Mirrors SALE_END in the contract.
  SALE_END: 1796489999,
  // Earliest moment the pool can open: 4 Dec 2026, 17:00:00 UTC.
  // Mirrors FINALIZE_OPENS in the contract — finalize() reverts before this
  // timestamp even if the sale has already sold out. Used by the finalize
  // panel and the claim-wave panel.
  FINALIZE_OPENS: 1796403600,
  // Check-in fee per the spec: 0.0001 BNB. Used only as a fallback until the
  // final JajalCheckIn ABI is confirmed at deploy; when the contract is live
  // the site prefers the fee read from the contract itself (CHECK_IN_FEE).
  CHECKIN_FEE_FALLBACK_WEI: "100000000000000",

  // Public BSC RPC endpoints used for read-only calls (no wallet needed).
  READ_RPCS: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-rpc.publicnode.com",
    "https://bsc-dataseed1.defibit.io"
  ],

  // Official project account on X.
  X_HANDLE: "jajall9rry",
  X_URL: "https://x.com/jajall9rry",

  // Explorer helpers.
  BSCSCAN: "https://bscscan.com",
  sourcifyUrl: function (address) {
    return "https://sourcify.dev/#/lookup/" + address;
  }
};
