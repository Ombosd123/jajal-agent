// abi.js — GENERATED from ~/workspace/jajal/artifacts (JAL, JajalSale, AgentCraft).
// REGISTRY_ABI is a hand-written minimal ABI for the SPACE ID Agent ID registry.
// Do not edit ABI entries by hand; regenerate from the artifacts after any contract change.
//
// SALE_ABI regenerated 2026-11-19 (late) from the wave-enforcing
// JajalSale artifact (owner reopening build, claims in on-chain waves):
// adds FINALIZE_OPENS, WAVE_1_OPENS..WAVE_4_OPENS, CHECKIN_ALLOCATION,
// checkIn, lotCount, lotOf, claimableOf, nextClaimOpensAt, waveOpensAt,
// claimedPaidOf, cashbackPaidOf. No old function/view removed or renamed;
// the only signature delta is the constructor (a 5th address parameter:
// the JajalCheckIn address), which this site never calls.
//
// CHECKIN_ABI (appended at the bottom of this file) is GENERATED from the
// final artifacts/JajalCheckIn.json (design-change build, 2026-11-19) and its
// function names are verified against that artifact: checkIn / claimBonus /
// refundPool. At deploy time, re-check the names once against the deployed
// contract (see SITE-REPORT.md, deploy checklist). app.js calls the views
// defensively, so a missing view degrades to "—" instead of breaking the page.
window.JAJAL_ABIS = {
 "SALE_ABI": [
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "registry_",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "router_",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "wbnb_",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "teamBeneficiary_",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "checkIn_",
     "type": "address"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "constructor"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "user",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "shares",
     "type": "uint256"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "cost",
     "type": "uint256"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "sharesSold",
     "type": "uint256"
    }
   ],
   "name": "Bought",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "user",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "jalAmount",
     "type": "uint256"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "cashback",
     "type": "uint256"
    }
   ],
   "name": "Claimed",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "pair",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "poolSeed",
     "type": "uint256"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "jalForPool",
     "type": "uint256"
    }
   ],
   "name": "Finalized",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "user",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "sharesSold",
     "type": "uint256"
    }
   ],
   "name": "FreeClaimed",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "user",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "Refunded",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "beneficiary",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "TeamClaimed",
   "type": "event"
  },
  {
   "inputs": [],
   "name": "BURN_ADDRESS",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "CHECKIN_ALLOCATION",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "FINALIZE_OPENS",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "FREE_SHARES",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "MAX_PAID_PER_WALLET",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "MAX_PER_WALLET",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "PRICE_STEP",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "SALE_END",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TEAM_ALLOCATION",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TEAM_CLIFF",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TEAM_VESTING_PERIOD",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TOKENS_PER_SHARE",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TOTAL_SHARES",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "TRANCHE_SIZE",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "WAVE_1_OPENS",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "WAVE_2_OPENS",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "WAVE_3_OPENS",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "WAVE_4_OPENS",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint256",
     "name": "n",
     "type": "uint256"
    }
   ],
   "name": "buy",
   "outputs": [],
   "stateMutability": "payable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "cashbackPaidOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "checkIn",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "claim",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "claimFree",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "claimTeam",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "user",
     "type": "address"
    }
   ],
   "name": "claimableOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "shares",
     "type": "uint256"
    },
    {
     "internalType": "uint256",
     "name": "jalAmount",
     "type": "uint256"
    },
    {
     "internalType": "uint256",
     "name": "cashback",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "claimed",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "claimedPaidOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "claimsOpen",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint256",
     "name": "n",
     "type": "uint256"
    }
   ],
   "name": "costFor",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "currentSharePrice",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "finalize",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "finalized",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "freeClaimed",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "graduationTime",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "jal",
   "outputs": [
    {
     "internalType": "contract JAL",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "user",
     "type": "address"
    }
   ],
   "name": "lotCount",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "user",
     "type": "address"
    },
    {
     "internalType": "uint256",
     "name": "i",
     "type": "uint256"
    }
   ],
   "name": "lotOf",
   "outputs": [
    {
     "internalType": "uint32",
     "name": "startPos",
     "type": "uint32"
    },
    {
     "internalType": "uint32",
     "name": "shares",
     "type": "uint32"
    },
    {
     "internalType": "uint256",
     "name": "paid",
     "type": "uint256"
    },
    {
     "internalType": "bool",
     "name": "lotClaimed",
     "type": "bool"
    },
    {
     "internalType": "uint256",
     "name": "opensAt",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "user",
     "type": "address"
    }
   ],
   "name": "nextClaimOpensAt",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "earliest",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "paidBy",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "paidSharesOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "pair",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "refund",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "refunded",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "registry",
   "outputs": [
    {
     "internalType": "contract IAgentIdRegistry",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "router",
   "outputs": [
    {
     "internalType": "contract IPancakeRouter",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "saleFailed",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "sharesOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "sharesSold",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "teamBeneficiary",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "teamClaimed",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "teamReleasable",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "teamVested",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint256",
     "name": "t",
     "type": "uint256"
    }
   ],
   "name": "teamVestedAt",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "totalRaised",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint256",
     "name": "position",
     "type": "uint256"
    }
   ],
   "name": "waveOpensAt",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "pure",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "wbnb",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "stateMutability": "payable",
   "type": "receive"
  }
 ],
 "CRAFT_ABI": [
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "registry_",
     "type": "address"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "constructor"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "endorser",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "address",
     "name": "target",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "Endorsed",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "agent",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "SkillRegistered",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "agent",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "SkillUnregistered",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "endorser",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "address",
     "name": "target",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "Unendorsed",
   "type": "event"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "target",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "endorse",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "agent",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "endorsementCount",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "endorser",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "target",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "hasEndorsed",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "",
     "type": "uint8"
    }
   ],
   "name": "hasSkill",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "registerSkill",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "registry",
   "outputs": [
    {
     "internalType": "contract IAgentIdRegistry",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "skillCountOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "",
     "type": "uint8"
    }
   ],
   "name": "skillGen",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "name": "skills",
   "outputs": [
    {
     "internalType": "string",
     "name": "",
     "type": "string"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "skillsCount",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "agent",
     "type": "address"
    }
   ],
   "name": "skillsOf",
   "outputs": [
    {
     "internalType": "uint8[]",
     "name": "out",
     "type": "uint8[]"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "totalAgents",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "target",
     "type": "address"
    },
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "unendorse",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "uint8",
     "name": "skillId",
     "type": "uint8"
    }
   ],
   "name": "unregisterSkill",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  }
 ],
 "JAL_ABI": [
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "minter_",
     "type": "address"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "constructor"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "owner",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "address",
     "name": "spender",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "value",
     "type": "uint256"
    }
   ],
   "name": "Approval",
   "type": "event"
  },
  {
   "anonymous": false,
   "inputs": [
    {
     "indexed": true,
     "internalType": "address",
     "name": "from",
     "type": "address"
    },
    {
     "indexed": true,
     "internalType": "address",
     "name": "to",
     "type": "address"
    },
    {
     "indexed": false,
     "internalType": "uint256",
     "name": "value",
     "type": "uint256"
    }
   ],
   "name": "Transfer",
   "type": "event"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "allowance",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "spender",
     "type": "address"
    },
    {
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "approve",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "name": "balanceOf",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "decimals",
   "outputs": [
    {
     "internalType": "uint8",
     "name": "",
     "type": "uint8"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "to",
     "type": "address"
    },
    {
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "mint",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "minter",
   "outputs": [
    {
     "internalType": "address",
     "name": "",
     "type": "address"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "name",
   "outputs": [
    {
     "internalType": "string",
     "name": "",
     "type": "string"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "symbol",
   "outputs": [
    {
     "internalType": "string",
     "name": "",
     "type": "string"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [],
   "name": "totalSupply",
   "outputs": [
    {
     "internalType": "uint256",
     "name": "",
     "type": "uint256"
    }
   ],
   "stateMutability": "view",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "to",
     "type": "address"
    },
    {
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "transfer",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "function"
  },
  {
   "inputs": [
    {
     "internalType": "address",
     "name": "from",
     "type": "address"
    },
    {
     "internalType": "address",
     "name": "to",
     "type": "address"
    },
    {
     "internalType": "uint256",
     "name": "amount",
     "type": "uint256"
    }
   ],
   "name": "transferFrom",
   "outputs": [
    {
     "internalType": "bool",
     "name": "",
     "type": "bool"
    }
   ],
   "stateMutability": "nonpayable",
   "type": "function"
  }
 ],
 "REGISTRY_ABI": [
  {
   "type": "function",
   "name": "balanceOf",
   "stateMutability": "view",
   "inputs": [
    {
     "name": "owner",
     "type": "address"
    }
   ],
   "outputs": [
    {
     "name": "",
     "type": "uint256"
    }
   ]
  },
  {
   "type": "function",
   "name": "tokenOfOwnerByIndex",
   "stateMutability": "view",
   "inputs": [
    {
     "name": "owner",
     "type": "address"
    },
    {
     "name": "index",
     "type": "uint256"
    }
   ],
   "outputs": [
    {
     "name": "",
     "type": "uint256"
    }
   ]
  },
  {
   "type": "function",
   "name": "tokenURI",
   "stateMutability": "view",
   "inputs": [
    {
     "name": "tokenId",
     "type": "uint256"
    }
   ],
   "outputs": [
    {
     "name": "",
     "type": "string"
    }
   ]
  },
  {
   "type": "function",
   "name": "ownerOf",
   "stateMutability": "view",
   "inputs": [
    {
     "name": "tokenId",
     "type": "uint256"
    }
   ],
   "outputs": [
    {
     "name": "",
     "type": "address"
    }
   ]
  }
 ]
};

// ============================================================
//  CHECKIN_ABI — GENERATED from artifacts/JajalCheckIn.json
//  (final artifact, design-change build 2026-11-19). Function names
//  verified against the artifact: checkIn / claimBonus / refundPool.
//  Regenerate after any contract change; do not edit by hand.
// ============================================================
window.JAJAL_ABIS.CHECKIN_ABI = [
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "registry_",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "feeRecipient_",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "wbnb_",
    "type": "address"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "BadgeMinted",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "amount",
    "type": "uint256"
   }
  ],
  "name": "BonusClaimed",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "day",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "streak",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "totalForUser",
    "type": "uint256"
   }
  ],
  "name": "CheckedIn",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "amount",
    "type": "uint256"
   }
  ],
  "name": "PoolRefunded",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "bnbAmount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "jalAmount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "liquidity",
    "type": "uint256"
   }
  ],
  "name": "PoolSeeded",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "amount",
    "type": "uint256"
   }
  ],
  "name": "RemainderBurned",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "sale",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "jal",
    "type": "address"
   }
  ],
  "name": "SaleBound",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "from",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "to",
    "type": "address"
   },
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "Transfer",
  "type": "event"
 },
 {
  "inputs": [],
  "name": "BONUS_PERCENT",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "BURN_ADDRESS",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "CHECKIN_ALLOCATION",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "CHECKIN_FEE",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "PROGRAM_END",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "STREAK_TARGET",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "approve",
  "outputs": [],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "badgeOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "owner",
    "type": "address"
   }
  ],
  "name": "balanceOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "sale_",
    "type": "address"
   }
  ],
  "name": "bindSale",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "bonusClaimed",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "bonusPaidTotal",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "user",
    "type": "address"
   }
  ],
  "name": "bonusQuote",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "bonusReserveRemaining",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "burnRemainder",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "checkIn",
  "outputs": [],
  "stateMutability": "payable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "checkInCountOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "claimBonus",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "currentDay",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "deployer",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "feeRecipient",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "getApproved",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "user",
    "type": "address"
   }
  ],
  "name": "hasBadge",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "isApprovedForAll",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "jal",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "user",
    "type": "address"
   }
  ],
  "name": "lastCheckInDay",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "name",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "ownerOf",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "poolBalance",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "poolRefunded",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "poolShareOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "refundPool",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "registry",
  "outputs": [
   {
    "internalType": "contract IAgentIdRegistry",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "safeTransferFrom",
  "outputs": [],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   },
   {
    "internalType": "bytes",
    "name": "",
    "type": "bytes"
   }
  ],
  "name": "safeTransferFrom",
  "outputs": [],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "sale",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "seedPoolToLP",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "name": "setApprovalForAll",
  "outputs": [],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "streakOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "bytes4",
    "name": "interfaceId",
    "type": "bytes4"
   }
  ],
  "name": "supportsInterface",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "symbol",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "tokenURI",
  "outputs": [
   {
    "internalType": "string",
    "name": "",
    "type": "string"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "totalCheckIns",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "transferFrom",
  "outputs": [],
  "stateMutability": "pure",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "wbnb",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 }
];
