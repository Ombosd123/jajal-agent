# jajal.agent

A fair launch of **$JAL** built exclusively for **Binance Agent ID** holders on BNB Chain, plus **AgentCraft**, an on-chain skill directory for Agent ID holders.

Live product: https://jajal-agent.pages.dev
X: https://x.com/jajall9rry

## How it works

- **10,000 shares** are sold from the `JajalSale` contract. 1 share = 100,000 JAL. Max 11 shares per wallet.
- The **first 1,000 shares are free** — 1 per Agent ID, first-come-first-served. Paid shares are priced in rising tranches of 1,000 (0.0001 → 0.0009 BNB).
- **Every user-facing function is gated on-chain by Agent ID**: the contracts check the caller's balance on the official Agent ID registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`) and revert unless it is greater than zero.
- If all shares sell out by **Dec 5, 2026, 16:59 UTC**, 50% of the BNB raised seeds a PancakeSwap pool (LP burned) and 50% is returned to paid buyers as cashback. Claims open in waves on Dec 5–8.
- If the sale does not sell out, paid shares are **refunded 100%**, with no claim deadline.
- A separate **check-in** contract (`JajalCheckIn`) lets Agent ID holders check in once per UTC day for 0.0001 BNB. 7 cumulative check-in days mint a soulbound badge that unlocks a one-time **+35% bonus** allocation from the check-in reserve after the pool opens. Half of every check-in fee goes to the team and half is held for the pool; if the sale fails, the pool share is refundable and the team share is not.
- **AgentCraft** is an on-chain skill directory: Agent ID holders register skills and endorse each other, building portable on-chain reputation.

$JAL supply (2.5B) is minted only if the sale graduates: 1B for share claims, 1B for the liquidity pool, 200M team allocation (30-day cliff, then 90-day linear vesting), 300M check-in reserve.

## Contracts (BNB Smart Chain, all verified on Sourcify)

| Contract | Address |
|---|---|
| JajalSale | `0xDF31E312a9f6eA014FeBA0e43A96Bc8aB86f5AA9` |
| JajalCheckIn | `0x7b1624Da7bb5DDC580118c93D8F3Df53b058178d` |
| JAL (token) | `0x018E15cA219CCe9138022F45d52FD21ADe147d46` |
| AgentCraft | `0xe28a15CC8fFb590630B771D5C3B8FB3644AbB7f1` |

There is **no owner, no admin key, and no withdraw function** in any contract. The sale contract was exercised by an audit-style test suite of 21,186 assertions (0 failures) before deployment.

## Repository layout

- `contracts/` — Solidity sources (solc 0.8.38, optimizer 200), exactly as deployed and verified.
- `site/` — the static website served at https://jajal-agent.pages.dev.

## License

MIT
