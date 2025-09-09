// Địa chỉ các contract HNS trên Hii Network
export const HNS_CONTRACTS = {
  MULTICALL: process.env.NEXT_PUBLIC_CONTRACT_MULTICALL as `0x${string}`,
  BASE_REGISTRAR_IMPLEMENTATION: process.env.NEXT_PUBLIC_CONTRACT_BASE_REGISTRAR_IMPLEMENTATION as `0x${string}`,
  BULK_RENEWAL: process.env.NEXT_PUBLIC_CONTRACT_BULK_RENEWAL as `0x${string}`,
  DNS_REGISTRAR: process.env.NEXT_PUBLIC_CONTRACT_DNS_REGISTRAR as `0x${string}`,
  DNSSEC_IMPL: process.env.NEXT_PUBLIC_CONTRACT_DNSSEC_IMPL as `0x${string}`,
  ETH_REGISTRAR_CONTROLLER: process.env.NEXT_PUBLIC_CONTRACT_ETH_REGISTRAR_CONTROLLER as `0x${string}`,
  NAME_WRAPPER: process.env.NEXT_PUBLIC_CONTRACT_NAME_WRAPPER as `0x${string}`,
  PUBLIC_RESOLVER: process.env.NEXT_PUBLIC_CONTRACT_PUBLIC_RESOLVER as `0x${string}`,
  REGISTRY: process.env.NEXT_PUBLIC_CONTRACT_REGISTRY as `0x${string}`,
  REVERSE_REGISTRAR: process.env.NEXT_PUBLIC_CONTRACT_REVERSE_REGISTRAR as `0x${string}`,
  UNIVERSAL_RESOLVER: process.env.NEXT_PUBLIC_CONTRACT_UNIVERSAL_RESOLVER as `0x${string}`,
  DUMMY_ORACLE: process.env.NEXT_PUBLIC_CONTRACT_DUMMY_ORACLE as `0x${string}`,
  LEGACY_ETH_REGISTRAR_CONTROLLER: process.env.NEXT_PUBLIC_CONTRACT_LEGACY_ETH_REGISTRAR_CONTROLLER as `0x${string}`,
  LEGACY_PUBLIC_RESOLVER: process.env.NEXT_PUBLIC_CONTRACT_LEGACY_PUBLIC_RESOLVER as `0x${string}`,
} as const

// ABI cho HNS Registry Contract
export const HNS_REGISTRY_ABI = [
  {
    "inputs": [
      {"internalType": "bytes32", "name": "node", "type": "bytes32"},
      {"internalType": "address", "name": "owner", "type": "address"}
    ],
    "name": "setOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
    "name": "resolver",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
    "name": "ttl",
    "outputs": [{"internalType": "uint64", "name": "", "type": "uint64"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// ABI cho ETH Registrar Controller
export const ETH_REGISTRAR_CONTROLLER_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "available",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"}
    ],
    "name": "rentPrice",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "base", "type": "uint256"},
          {"internalType": "uint256", "name": "premium", "type": "uint256"}
        ],
        "internalType": "struct IPriceOracle.Price",
        "name": "price",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}],
    "name": "commit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}],
    "name": "commitments",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "bytes32", "name": "secret", "type": "bytes32"},
      {"internalType": "address", "name": "resolver", "type": "address"},
      {"internalType": "bytes[]", "name": "data", "type": "bytes[]"},
      {"internalType": "bool", "name": "reverseRecord", "type": "bool"},
      {"internalType": "uint16", "name": "ownerControlledFuses", "type": "uint16"}
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"}
    ],
    "name": "renew",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "bytes32", "name": "secret", "type": "bytes32"},
      {"internalType": "address", "name": "resolver", "type": "address"},
      {"internalType": "bytes[]", "name": "data", "type": "bytes[]"},
      {"internalType": "bool", "name": "reverseRecord", "type": "bool"},
      {"internalType": "uint16", "name": "ownerControlledFuses", "type": "uint16"}
    ],
    "name": "makeCommitment",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "pure",
    "type": "function"
  }
] as const