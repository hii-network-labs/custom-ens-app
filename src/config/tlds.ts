// TLD Configuration for HNS (HII Name Service)

export interface TLDConfig {
  tld: string
  name: string
  description: string
  color: string
  registrarController?: string
  nameWrapper?: string
  publicResolver?: string
  isPrimary?: boolean
  // Contract ABI folder name (matches folder in contracts/ABIs/)
  abiFolder?: string
  // Default email for domain registration
  defaultEmail?: string
}

// Default TLD configurations
export const DEFAULT_TLD_CONFIGS: TLDConfig[] = [
  {
    tld: '.hii',
    name: 'HII',
    description: 'Primary HNS domain for Hii Network',
    color: 'blue',
    isPrimary: true,
    abiFolder: 'hii',
    registrarController: process.env.NEXT_PUBLIC_CONTRACT_HII_REGISTRAR_CONTROLLER,
    nameWrapper: process.env.NEXT_PUBLIC_CONTRACT_HII_NAME_WRAPPER,
    publicResolver: process.env.NEXT_PUBLIC_CONTRACT_HII_PUBLIC_RESOLVER,
    defaultEmail: process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hii.network',
  },
  {
    tld: '.hi',
    name: 'HI',
    description: 'Short form domain for quick access',
    color: 'purple',
    isPrimary: false,
    abiFolder: 'hi',
    registrarController: process.env.NEXT_PUBLIC_CONTRACT_HI_REGISTRAR_CONTROLLER,
    nameWrapper: process.env.NEXT_PUBLIC_CONTRACT_HI_NAME_WRAPPER,
    publicResolver: process.env.NEXT_PUBLIC_CONTRACT_HI_PUBLIC_RESOLVER,
    defaultEmail: process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'contact@hi.network',
  },
]

// Get supported TLDs from environment or use defaults
export function getSupportedTLDs(): string[] {
  const envTLDs = process.env.NEXT_PUBLIC_SUPPORTED_TLDS
  if (envTLDs) {
    return envTLDs.split(',').map(tld => tld.trim())
  }
  return DEFAULT_TLD_CONFIGS.map(config => config.tld)
}

// Get default TLD (first supported TLD or fallback)
export function getDefaultTLD(): string {
  const supportedTLDs = getSupportedTLDs()
  const primaryTLD = DEFAULT_TLD_CONFIGS.find(config => config.isPrimary)?.tld
  return primaryTLD || supportedTLDs[0] || '.hii'
}

// Get default email for a TLD
export function getDefaultEmail(tld?: string): string {
  const currentTLD = tld || getDefaultTLD()
  const config = getTLDConfig(currentTLD)
  return config?.defaultEmail || 'contact@hii.network'
}

// Get TLD configuration by TLD string
export function getTLDConfig(tld: string): TLDConfig | undefined {
  return DEFAULT_TLD_CONFIGS.find(config => config.tld === tld)
}

// Get available TLD configurations (filtered by supported TLDs)
export function getAvailableTLDConfigs(): TLDConfig[] {
  const supportedTLDs = getSupportedTLDs()
  return DEFAULT_TLD_CONFIGS.filter(config => supportedTLDs.includes(config.tld))
}

// Check if TLD is supported
export function isTLDSupported(tld: string): boolean {
  return getSupportedTLDs().includes(tld)
}

// Extract TLD from full domain name
export function extractTLD(fullDomain: string): string | null {
  const supportedTLDs = getSupportedTLDs()
  for (const tld of supportedTLDs) {
    if (fullDomain.endsWith(tld)) {
      return tld
    }
  }
  return null
}

// Extract domain name without TLD
export function extractDomainName(fullDomain: string): string {
  const tld = extractTLD(fullDomain)
  if (tld) {
    return fullDomain.slice(0, -tld.length)
  }
  return fullDomain
}

// Get contract address for specific TLD and contract type
export function getTLDContractAddress(tld: string, contractType: 'registrarController'): string | undefined {
  const config = getTLDConfig(tld)
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
  const config = getTLDConfig(tld)
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
export const TLD_CONSTANTS = {
  SUPPORTED_TLDS: getSupportedTLDs(),
  DEFAULT_TLD: getDefaultTLD(),
  AVAILABLE_CONFIGS: getAvailableTLDConfigs(),
} as const