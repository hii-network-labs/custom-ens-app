// TLD Configuration for HNS (HII Name Service)
import { getAllTLDConfigs, getTLDConfigData, getSupportedTLDStrings, getPrimaryTLDConfig, type TLDConfigData } from './configLoader'

export interface TLDConfig {
  tld: string
  name: string
  description: string
  color: string
  registrarController?: string
  nameWrapper?: string
  publicResolver?: string
  isPrimary?: boolean
  // Default email for domain registration
  defaultEmail?: string
}

// Cache for loaded TLD configurations
let cachedTLDConfigs: TLDConfig[] | null = null

// Convert TLDConfigData to TLDConfig format
function convertToTLDConfig(configData: TLDConfigData): TLDConfig {
  return {
    tld: configData.tld,
    name: configData.name,
    description: configData.description,
    color: configData.color,
    isPrimary: configData.isPrimary,

    registrarController: configData.contracts.registrarController,
    nameWrapper: configData.contracts.nameWrapper,
    publicResolver: configData.contracts.publicResolver,
    defaultEmail: configData.defaultEmail,
  }
}

// Load and cache TLD configurations
async function loadTLDConfigs(): Promise<TLDConfig[]> {
  if (cachedTLDConfigs) {
    return cachedTLDConfigs
  }
  
  try {
    const configData = await getAllTLDConfigs()
    cachedTLDConfigs = configData.map(convertToTLDConfig)
    return cachedTLDConfigs
  } catch (error) {
    console.error('Failed to load TLD configurations:', error)
    // Fallback to empty array if loading fails
    return []
  }
}

// Get default TLD configurations (async version)
export async function getDefaultTLDConfigs(): Promise<TLDConfig[]> {
  return await loadTLDConfigs()
}

// Synchronous version for backward compatibility (uses cached data)
export const DEFAULT_TLD_CONFIGS: TLDConfig[] = []

// Get supported TLDs from configuration
export async function getSupportedTLDs(): Promise<string[]> {
  try {
    return await getSupportedTLDStrings()
  } catch (error) {
    console.error('Failed to get supported TLDs:', error)
    return []
  }
}

// Synchronous version for backward compatibility (uses cached data)
export function getSupportedTLDsSync(): string[] {
  // Use cached data if available, otherwise fallback to default TLDs
  return cachedTLDConfigs?.map(config => config.tld) || ['.hii', '.hi', '.t1']
}

// Get default TLD (first supported TLD or fallback)
export async function getDefaultTLD(): Promise<string> {
  try {
    const primaryConfig = await getPrimaryTLDConfig()
    if (primaryConfig) {
      return primaryConfig.tld
    }
    const configs = await getDefaultTLDConfigs()
    return configs[0]?.tld || '.hii'
  } catch (error) {
    console.error('Failed to get default TLD:', error)
    return '.hii'
  }
}

// Synchronous version for backward compatibility
export function getDefaultTLDSync(): string {
  const envDefault = process.env.NEXT_PUBLIC_DEFAULT_TLD
  if (envDefault) {
    return envDefault
  }
  // Fallback to cached data if available
  const primaryConfig = cachedTLDConfigs?.find(config => config.isPrimary)
  return primaryConfig?.tld || cachedTLDConfigs?.[0]?.tld || '.hii'
}

// Get default email for a TLD
export async function getDefaultEmail(tld?: string): Promise<string> {
  try {
    if (tld) {
      const config = await getTLDConfigData(tld)
      if (config) {
        return config.defaultEmail || process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hii.network'
      }
    } else {
      const primaryConfig = await getPrimaryTLDConfig()
      if (primaryConfig) {
        return primaryConfig.defaultEmail || process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hii.network'
      }
    }
    return process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hii.network'
  } catch (error) {
    console.error('Failed to get default email:', error)
    return process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hii.network'
  }
}

// Synchronous version for backward compatibility
export function getDefaultEmailSync(tld?: string): string {
  if (cachedTLDConfigs) {
    const config = tld ? cachedTLDConfigs.find(c => c.tld === tld) : cachedTLDConfigs.find(c => c.isPrimary)
    if (config) {
      return config.defaultEmail || 'contact@hii.network'
    }
  }
  return 'contact@hii.network'
}

// Get TLD configuration by TLD string (async)
export async function getTLDConfig(tld: string): Promise<TLDConfig | undefined> {
  const configs = await getDefaultTLDConfigs()
  return configs.find(config => config.tld === tld)
}

// Synchronous version for backward compatibility
export function getTLDConfigSync(tld: string): TLDConfig | undefined {
  return cachedTLDConfigs?.find(config => config.tld === tld)
}

// Get available TLD configurations (async)
export async function getAvailableTLDConfigs(): Promise<TLDConfig[]> {
  return await getDefaultTLDConfigs()
}

// Synchronous version for backward compatibility
export function getAvailableTLDConfigsSync(): TLDConfig[] {
  return cachedTLDConfigs || []
}

// Check if TLD is supported (async)
export async function isTLDSupported(tld: string): Promise<boolean> {
  const supportedTLDs = await getSupportedTLDs()
  return supportedTLDs.includes(tld)
}

// Synchronous version for backward compatibility
export function isTLDSupportedSync(tld: string): boolean {
  const supportedTLDs = getSupportedTLDsSync()
  return supportedTLDs.includes(tld)
}

// Extract TLD from full domain name (async)
export async function extractTLD(fullDomain: string): Promise<string | null> {
  const supportedTLDs = await getSupportedTLDs()
  for (const tld of supportedTLDs) {
    if (fullDomain.endsWith(tld)) {
      return tld
    }
  }
  return null
}

// Synchronous version for backward compatibility
export function extractTLDSync(fullDomain: string): string | null {
  const supportedTLDs = getSupportedTLDsSync()
  for (const tld of supportedTLDs) {
    if (fullDomain.endsWith(tld)) {
      return tld
    }
  }
  return null
}

// Extract domain name without TLD (async)
export async function extractDomainName(fullDomain: string): Promise<string> {
  const tld = await extractTLD(fullDomain)
  if (tld) {
    return fullDomain.slice(0, -tld.length)
  }
  return fullDomain
}

// Synchronous version for backward compatibility
export function extractDomainNameSync(fullDomain: string): string {
  const tld = extractTLDSync(fullDomain)
  if (tld) {
    return fullDomain.slice(0, -tld.length)
  }
  return fullDomain
}

// Get contract address for specific TLD and contract type
export function getTLDContractAddress(tld: string, contractType: 'registrarController'): string | undefined {
  const config = getTLDConfigSync(tld)
  if (!config) return undefined
  
  return config[contractType]
}

// Async version
export async function getTLDContractAddressAsync(tld: string, contractType: 'registrarController'): Promise<string | undefined> {
  const config = await getTLDConfig(tld)
  if (!config) return undefined
  
  return config[contractType]
}

// Format full domain name
export function formatFullDomain(domainName: string, tld: string): string {
  if (!domainName) return ''
  return `${domainName}${tld}`
}

// Get TLD-specific color classes for UI
export function getTLDColorClasses(tld: string): {
  text: string
  bg: string
  border: string
  hover: string
} {
  const config = getTLDConfigSync(tld)
  const color = config?.color || 'blue'
  
  const colorMap = {
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100'
    },
    purple: {
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100'
    },
    green: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      hover: 'hover:bg-green-100'
    },
    red: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      hover: 'hover:bg-red-100'
    }
  }
  
  return colorMap[color as keyof typeof colorMap] || colorMap.blue
}

// Export constants for easy access
// Initialize cache on module load
loadTLDConfigs().catch(console.error)

// TLD constants (synchronous versions for immediate access)
export const TLD_CONSTANTS = {
  get SUPPORTED_TLDS() {
    return getSupportedTLDsSync()
  },
  get DEFAULT_TLD() {
    return getDefaultTLDSync()
  },
  get AVAILABLE_CONFIGS() {
    return getAvailableTLDConfigsSync()
  },
} as const