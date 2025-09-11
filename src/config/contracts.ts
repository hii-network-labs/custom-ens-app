// HNS Contract Addresses and ABIs
// This file contains the contract addresses and ABIs for the HNS (HII Name Service) system

import { getTLDConfigData } from './tldDataFetcher'

// Shared contract addresses from environment variables (used by all TLDs)
export const SHARED_CONTRACTS = {
  registry: process.env.NEXT_PUBLIC_CONTRACT_REGISTRY || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  baseRegistrarImplementation: process.env.NEXT_PUBLIC_CONTRACT_BASE_REGISTRAR_IMPLEMENTATION || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
  reverseRegistrar: process.env.NEXT_PUBLIC_CONTRACT_REVERSE_REGISTRAR || '0x084b1c3C81545d370f3634392De611CaaBFf8148',
  universalResolver: process.env.NEXT_PUBLIC_CONTRACT_UNIVERSAL_RESOLVER || '0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62',
  multicall: process.env.NEXT_PUBLIC_CONTRACT_MULTICALL || '0xcA11bde05977b3631167028862bE2a173976CA11',
  bulkRenewal: process.env.NEXT_PUBLIC_CONTRACT_BULK_RENEWAL || '0xff252725f6122A92551A5FA9a6b6bf10eb0Be035',
  dnsRegistrar: process.env.NEXT_PUBLIC_CONTRACT_DNS_REGISTRAR || '0x58774Bb8acD458A640aF0B88238369A167546ef2',
  dnssecImpl: process.env.NEXT_PUBLIC_CONTRACT_DNSSEC_IMPL || '0x0fc3152971714E5ed7723FAE3fE13C8F8191C3b9',
  dummyOracle: process.env.NEXT_PUBLIC_CONTRACT_DUMMY_ORACLE || '0x0000000000000000000000000000000000000000',
} as const

// Legacy export for backward compatibility
export const HNS_CONTRACTS = SHARED_CONTRACTS

// TLD-specific contract addresses (fetched from TLD configuration)
export interface TLDContracts {
  registrarController: string
  nameWrapper: string
  publicResolver: string
}

/**
 * Get TLD-specific contract addresses for a given TLD
 * @param tld The TLD string (e.g., '.hii', '.hi')
 * @returns Promise resolving to TLD-specific contract addresses
 */
export async function getTLDContracts(tld: string): Promise<TLDContracts | null> {
  try {
    const tldConfig = await getTLDConfigData(tld)
    if (!tldConfig) {
      console.warn(`No configuration found for TLD: ${tld}`)
      return null
    }
    
    return {
      registrarController: tldConfig.contracts.registrarController,
      nameWrapper: tldConfig.contracts.nameWrapper,
      publicResolver: tldConfig.contracts.publicResolver,
    }
  } catch (error) {
    console.error(`Failed to get TLD contracts for ${tld}:`, error)
    return null
  }
}

/**
 * Get all contract addresses (shared + TLD-specific) for a given TLD
 * @param tld The TLD string (e.g., '.hii', '.hi')
 * @returns Promise resolving to complete contract configuration
 */
export async function getAllContracts(tld: string) {
  const tldContracts = await getTLDContracts(tld)
  
  return {
    // Shared contracts (same for all TLDs)
    ...SHARED_CONTRACTS,
    // TLD-specific contracts
    ...(tldContracts || {}),
  }
}

// Export contract addresses for easy access (backward compatibility)
export const CONTRACT_ADDRESSES = SHARED_CONTRACTS

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