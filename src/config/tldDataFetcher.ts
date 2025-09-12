// TLD Data Fetcher - Abstraction layer for TLD configuration data
// Supports both local JSON file and future CDN integration

import tldConfigData from './tlds.json'

export interface TLDConfigData {
  tld: string
  name: string
  description: string
  color: string
  isPrimary?: boolean
  contracts: {
    registrarController: string
    nameWrapper: string
    publicResolver: string
  }
  defaultEmail?: string
}

export interface TLDDataResponse {
  tlds: TLDConfigData[]
  metadata: {
    version: string
    lastUpdated: string
    description: string
  }
}

// Configuration for data source
const TLD_DATA_SOURCE = process.env.NEXT_PUBLIC_TLD_DATA_SOURCE || 'local'
const TLD_CDN_URL = process.env.NEXT_PUBLIC_TLD_CDN_URL || 'https://cdn.hii.network/tlds.json'

// Cache for CDN data to avoid repeated requests
let cdnCache: TLDDataResponse | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch TLD configuration data from local JSON file
 */
function fetchLocalTLDData(): Promise<TLDDataResponse> {
  return Promise.resolve(tldConfigData as TLDDataResponse)
}

/**
 * Fetch TLD configuration data from CDN
 */
async function fetchCDNTLDData(): Promise<TLDDataResponse> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (cdnCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return cdnCache
  }
  
  try {

    const response = await fetch(TLD_CDN_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`CDN request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json() as TLDDataResponse
    
    // Validate the data structure
    if (!data.tlds || !Array.isArray(data.tlds)) {
      throw new Error('Invalid TLD data structure from CDN')
    }
    
    // Update cache
    cdnCache = data
    cacheTimestamp = now
    
    
    return data
    
  } catch (error) {
    console.error('Failed to fetch TLD data from CDN:', error)
      // Falling back to local TLD data
    
    // Fallback to local data if CDN fails
    return fetchLocalTLDData()
  }
}

/**
 * Main function to fetch TLD configuration data
 * Automatically switches between local and CDN based on configuration
 */
export async function fetchTLDData(): Promise<TLDDataResponse> {
  switch (TLD_DATA_SOURCE) {
    case 'cdn':
      return fetchCDNTLDData()
    case 'local':
    default:
      return fetchLocalTLDData()
  }
}

/**
 * Get all TLD configurations
 */
export async function getAllTLDConfigs(): Promise<TLDConfigData[]> {
  const data = await fetchTLDData()
  return data.tlds
}

/**
 * Get a specific TLD configuration by TLD string
 */
export async function getTLDConfigData(tld: string): Promise<TLDConfigData | undefined> {
  const configs = await getAllTLDConfigs()
  return configs.find(config => config.tld === tld)
}

/**
 * Get supported TLD strings
 */
export async function getSupportedTLDStrings(): Promise<string[]> {
  const configs = await getAllTLDConfigs()
  return configs.map(config => config.tld)
}

/**
 * Get the primary TLD configuration
 */
export async function getPrimaryTLDConfig(): Promise<TLDConfigData | undefined> {
  const configs = await getAllTLDConfigs()
  return configs.find(config => config.isPrimary === true) || configs[0]
}

/**
 * Clear CDN cache (useful for testing or forced refresh)
 */
export function clearTLDCache(): void {
  cdnCache = null
  cacheTimestamp = 0

}

/**
 * Get current data source information
 */
export function getTLDDataSourceInfo(): {
  source: string
  cdnUrl?: string
  cacheStatus?: {
    cached: boolean
    timestamp?: number
    age?: number
  }
} {
  const info: any = {
    source: TLD_DATA_SOURCE
  }
  
  if (TLD_DATA_SOURCE === 'cdn') {
    info.cdnUrl = TLD_CDN_URL
    info.cacheStatus = {
      cached: cdnCache !== null,
      timestamp: cacheTimestamp,
      age: cdnCache ? Date.now() - cacheTimestamp : 0
    }
  }
  
  return info
}