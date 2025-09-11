// Configuration loader for TLD data
// This module provides functions to load TLD configuration
// Supports both local JSON and CDN sources via tldDataFetcher

import {
  fetchTLDData,
  getAllTLDConfigs as fetchAllTLDConfigs,
  getTLDConfigData as fetchTLDConfigData,
  getSupportedTLDStrings as fetchSupportedTLDStrings,
  getPrimaryTLDConfig as fetchPrimaryTLDConfig,
  type TLDConfigData,
  type TLDDataResponse
} from './tldDataFetcher'

// Re-export types for backward compatibility
export interface TLDContractAddresses {
  registrarController: string
  nameWrapper: string
  publicResolver: string
}

export type { TLDConfigData }

// Legacy interface name for backward compatibility
export interface TLDConfigFile extends TLDDataResponse {}

/**
 * Load TLD configuration (supports both local JSON and CDN)
 * @returns Promise<TLDConfigFile> - The TLD configuration data
 */
export async function loadTLDConfig(): Promise<TLDConfigFile> {
  try {
    return await fetchTLDData()
  } catch (error) {
    console.error('Failed to load TLD configuration:', error)
    throw new Error('Unable to load TLD configuration')
  }
}

/**
 * Get all available TLD configurations
 * @returns Promise<TLDConfigData[]> - Array of TLD configurations
 */
export async function getAllTLDConfigs(): Promise<TLDConfigData[]> {
  return await fetchAllTLDConfigs()
}

/**
 * Get configuration for a specific TLD
 * @param tld - The TLD to get configuration for (e.g., '.hii')
 * @returns Promise<TLDConfigData | undefined> - TLD configuration or undefined if not found
 */
export async function getTLDConfigData(tld: string): Promise<TLDConfigData | undefined> {
  return await fetchTLDConfigData(tld)
}

/**
 * Get contract address for a specific TLD and contract type
 * @param tld - The TLD (e.g., '.hii')
 * @param contractType - The contract type ('registrarController', 'nameWrapper', 'publicResolver')
 * @returns Promise<string | undefined> - Contract address or undefined if not found
 */
export async function getContractAddress(
  tld: string, 
  contractType: keyof TLDContractAddresses
): Promise<string | undefined> {
  const config = await getTLDConfigData(tld)
  return config?.contracts[contractType]
}

/**
 * Get all supported TLD strings
 * @returns Promise<string[]> - Array of supported TLD strings
 */
export async function getSupportedTLDStrings(): Promise<string[]> {
  return await fetchSupportedTLDStrings()
}

/**
 * Get the primary TLD configuration
 * @returns Promise<TLDConfigData | undefined> - Primary TLD configuration
 */
export async function getPrimaryTLDConfig(): Promise<TLDConfigData | undefined> {
  return await fetchPrimaryTLDConfig()
}

/**
 * Check if a TLD is supported
 * @param tld - The TLD to check
 * @returns Promise<boolean> - True if supported, false otherwise
 */
export async function isTLDSupportedAsync(tld: string): Promise<boolean> {
  const supportedTLDs = await getSupportedTLDStrings()
  return supportedTLDs.includes(tld)
}