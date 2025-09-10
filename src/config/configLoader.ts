// Configuration loader for TLD data
// This module provides functions to load TLD configuration from JSON
// In the future, this can be easily adapted to load from CDN

import tldConfigData from './tlds.json'

export interface TLDContractAddresses {
  registrarController: string
  nameWrapper: string
  publicResolver: string
}

export interface TLDConfigData {
  tld: string
  name: string
  description: string
  color: string
  isPrimary: boolean
  abiFolder: string
  contracts: TLDContractAddresses
  defaultEmail: string
}

export interface TLDConfigFile {
  tlds: TLDConfigData[]
  metadata: {
    version: string
    lastUpdated: string
    description: string
  }
}

/**
 * Load TLD configuration from JSON file
 * In the future, this function can be modified to fetch from CDN
 * @returns Promise<TLDConfigFile> - The TLD configuration data
 */
export async function loadTLDConfig(): Promise<TLDConfigFile> {
  try {
    // Currently loading from local JSON file
    // TODO: Replace with CDN fetch in the future
    // const response = await fetch('https://cdn.example.com/tld-config.json')
    // const config = await response.json()
    
    return tldConfigData as TLDConfigFile
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
  const config = await loadTLDConfig()
  return config.tlds
}

/**
 * Get configuration for a specific TLD
 * @param tld - The TLD to get configuration for (e.g., '.hii')
 * @returns Promise<TLDConfigData | undefined> - TLD configuration or undefined if not found
 */
export async function getTLDConfigData(tld: string): Promise<TLDConfigData | undefined> {
  const configs = await getAllTLDConfigs()
  return configs.find(config => config.tld === tld)
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
  const configs = await getAllTLDConfigs()
  return configs.map(config => config.tld)
}

/**
 * Get the primary TLD configuration
 * @returns Promise<TLDConfigData | undefined> - Primary TLD configuration
 */
export async function getPrimaryTLDConfig(): Promise<TLDConfigData | undefined> {
  const configs = await getAllTLDConfigs()
  return configs.find(config => config.isPrimary)
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