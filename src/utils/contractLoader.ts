// Dynamic contract ABI loader for TLD-specific contracts
import { TLDConfig } from '../config/tlds'

// Contract types that can be loaded
export type ContractType = 'ETHRegistrarController' | 'NameWrapper' | 'PublicResolver' | 'BaseRegistrarImplementation'

// Cache for loaded ABIs to avoid repeated imports
const abiCache = new Map<string, any>()

/**
 * Dynamically load contract ABI based on TLD configuration
 * @param tldConfig - TLD configuration containing abiFolder
 * @param contractType - Type of contract to load
 * @returns Promise resolving to the contract ABI
 */
export async function loadContractABI(tldConfig: TLDConfig, contractType: ContractType): Promise<any> {
  const abiFolder = tldConfig.abiFolder || 'hii' // Default to hii folder
  const cacheKey = `${abiFolder}-${contractType}`
  
  // Return cached ABI if available
  if (abiCache.has(cacheKey)) {
    return abiCache.get(cacheKey)
  }
  
  try {
    // Dynamically import the ABI file
    const abiModule = await import(`@/contracts/ABIs/${abiFolder}/${contractType}.json`)
    const abiData = abiModule.default || abiModule
    
    // Extract ABI array from the JSON structure
    const abi = abiData.abi || abiData
    
    // Cache the loaded ABI
    abiCache.set(cacheKey, abi)
    
    return abi
  } catch (error) {
    console.error(`Failed to load ABI for ${contractType} in ${abiFolder}:`, error)
    
    // Fallback to hii folder if the specific folder fails
    if (abiFolder !== 'hii') {
      try {
        const fallbackAbiModule = await import(`@/contracts/ABIs/hii/${contractType}.json`)
        const fallbackAbiData = fallbackAbiModule.default || fallbackAbiModule
        const abi = fallbackAbiData.abi || fallbackAbiData
        abiCache.set(cacheKey, abi)
        return abi
      } catch (fallbackError) {
        console.error(`Fallback ABI load also failed for ${contractType}:`, fallbackError)
      }
    }
    
    throw new Error(`Could not load ABI for ${contractType}`)
  }
}

/**
 * Get contract address based on TLD configuration and contract type
 * @param tldConfig - TLD configuration
 * @param contractType - Type of contract
 * @returns Contract address or undefined
 */
export function getContractAddress(tldConfig: TLDConfig, contractType: ContractType): string | undefined {
  switch (contractType) {
    case 'ETHRegistrarController':
      return tldConfig.registrarController
    case 'NameWrapper':
      return tldConfig.nameWrapper
    case 'PublicResolver':
      return tldConfig.publicResolver
    case 'BaseRegistrarImplementation':
      // BaseRegistrarImplementation is shared across all TLDs
      return process.env.NEXT_PUBLIC_CONTRACT_BASE_REGISTRAR_IMPLEMENTATION
    default:
      return undefined
  }
}

/**
 * Load both ABI and address for a contract
 * @param tldConfig - TLD configuration
 * @param contractType - Type of contract
 * @returns Promise resolving to object with abi and address
 */
export async function loadContract(tldConfig: TLDConfig, contractType: ContractType): Promise<{
  abi: any
  address: string | undefined
}> {
  const [abi, address] = await Promise.all([
    loadContractABI(tldConfig, contractType),
    Promise.resolve(getContractAddress(tldConfig, contractType))
  ])
  
  return { abi, address }
}

/**
 * Clear the ABI cache (useful for testing or memory management)
 */
export function clearABICache(): void {
  abiCache.clear()
}