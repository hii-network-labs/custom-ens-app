import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, createWalletClient, custom, http, formatEther, defineChain, keccak256, encodePacked } from 'viem'
import { HNS_CONTRACTS, ETH_REGISTRAR_CONTROLLER_ABI } from '@/config/contracts'
import { TLDConfig, getTLDConfigSync, getDefaultTLDSync } from '../config/tlds'
import { loadContractABI, getContractAddress } from '@/utils/contractLoader'

// Define Hii Network chain
const hiiNetwork = defineChain({
  id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!),
  name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NAME!,
  network: 'hii',
  nativeCurrency: {
    decimals: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_DECIMALS!),
    name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_NAME!,
    symbol: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_SYMBOL!,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Hii Explorer', 
      url: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_EXPLORER! 
    },
  },
});

// Hook to call rentPrice using viem directly
export function useViemRentPrice(name: string | null, duration: number | null = 1, tldConfig?: TLDConfig) {
  const [data, setData] = useState<{base: bigint, premium: bigint} | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fetchRentPrice = useCallback(async () => {
    // Use provided TLD config or default
    const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
    
    if (!name || !duration || name.length < 3 || !currentTLDConfig) {
      setData(null)
      setError(null)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      // Load TLD-specific ABI and contract address
      const contractABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
      const contractAddress = getContractAddress(currentTLDConfig, 'ETHRegistrarController')

      if (!contractAddress) {
        throw new Error(`No registrar controller address found for TLD ${currentTLDConfig.tld}`)
      }

      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        })
      })

      const result = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: contractABI,
        functionName: 'rentPrice',
        args: [name!, BigInt(duration! * 365 * 24 * 60 * 60)] // duration in seconds
      })

      const priceData = result as { base: bigint, premium: bigint }
      
      // Apply scaling correction for .hi TLD (contract returns prices 1,000,000x too high)
      let correctedPriceData = priceData
      // if (currentTLDConfig.tld === '.hi') {
      //   correctedPriceData = {
      //     base: priceData.base / BigInt(1000000),
      //     premium: priceData.premium / BigInt(1000000)
      //   }
      //   console.log('Applied .hi TLD price correction:', {
      //     original: { base: priceData.base.toString(), premium: priceData.premium.toString() },
      //     corrected: { base: correctedPriceData.base.toString(), premium: correctedPriceData.premium.toString() }
      //   })
      // }
      
      setData(correctedPriceData)
      setIsSuccess(true)
      setError(null)

    } catch (err: any) {
      console.error('Rent price fetch failed:', {
        name,
        duration,
        tldConfig: currentTLDConfig,
        error: err
      })
      setError(err.message || 'Failed to fetch rent price')
      setData(null)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, duration, tldConfig])

  useEffect(() => {
    if (name && duration && name.length >= 3) {
      fetchRentPrice()
    }
  }, [name, duration, fetchRentPrice])

  return {
    data,
    isLoading,
    error,
    isSuccess,
    refetch: fetchRentPrice,
    formattedPrice: data ? formatEther(data.base + data.premium) : null
  }
}

// Hook to check domain availability using viem directly
// Enhanced domain status types
export type DomainStatus = {
  available: boolean
  registered: boolean
  expired: boolean
  inGracePeriod: boolean
  owner?: string
  expiryDate?: Date
  statusText: string
}

export function useViemDomainStatus(name: string, tldConfig?: TLDConfig) {
  const [data, setData] = useState<DomainStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fetchDomainStatus = useCallback(async () => {
    // Use provided TLD config or default
    const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
    
    if (!name || name.trim() === '' || name.length < 3 || !currentTLDConfig) {
      setData(null)
      setIsLoading(false)
      setError(null)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      // Load TLD-specific ABI and contract address
      const registrarABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
      const registrarAddress = getContractAddress(currentTLDConfig, 'ETHRegistrarController')
      
      // Also load BaseRegistrarImplementation for ownership and expiry info
      const baseRegistrarABI = await loadContractABI(currentTLDConfig, 'BaseRegistrarImplementation')
      const baseRegistrarAddress = getContractAddress(currentTLDConfig, 'BaseRegistrarImplementation')

      if (!registrarAddress) {
        throw new Error(`No registrar controller address found for TLD ${currentTLDConfig.tld}`)
      }

      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        })
      })

      // Check if domain is available
      const isAvailable = await client.readContract({
        address: registrarAddress as `0x${string}`,
        abi: registrarABI,
        functionName: 'available',
        args: [name]
      }) as boolean

      let domainStatus: DomainStatus = {
        available: isAvailable,
        registered: !isAvailable,
        expired: false,
        inGracePeriod: false,
        statusText: isAvailable ? 'Available' : 'Registered'
      }

      // If not available, get more detailed information
      if (!isAvailable && baseRegistrarAddress && baseRegistrarABI) {
        try {
          // Generate domain hash for base registrar calls
          const domainHash = keccak256(encodePacked(['string'], [name]))
          
          // Check ownership
          const owner = await client.readContract({
            address: baseRegistrarAddress as `0x${string}`,
            abi: baseRegistrarABI,
            functionName: 'ownerOf',
            args: [domainHash]
          }) as string

          // Check expiry date
          const expiryTimestamp = await client.readContract({
            address: baseRegistrarAddress as `0x${string}`,
            abi: baseRegistrarABI,
            functionName: 'nameExpires',
            args: [domainHash]
          }) as bigint

          const expiryDate = new Date(Number(expiryTimestamp) * 1000)
          const now = new Date()
          const gracePeriodEnd = new Date(expiryDate.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days grace period

          const isExpired = now > expiryDate
          const isInGracePeriod = isExpired && now <= gracePeriodEnd

          domainStatus = {
            available: false,
            registered: true,
            expired: isExpired,
            inGracePeriod: isInGracePeriod,
            owner,
            expiryDate,
            statusText: isInGracePeriod ? 'In Grace Period' : isExpired ? 'Expired' : 'Registered'
          }
        } catch (detailError) {
          // If we can't get detailed info, just mark as registered
          console.warn('Could not fetch detailed domain info:', detailError)
          domainStatus.statusText = 'Registered'
        }
      }

      setData(domainStatus)
      setIsSuccess(true)
      setError(null)

    } catch (err: any) {
      console.error('Domain status check failed:', {
        name,
        tldConfig: currentTLDConfig,
        registrarAddress: getContractAddress(currentTLDConfig, 'ETHRegistrarController'),
        error: err,
        errorMessage: err?.message,
        errorCode: err?.code,
        errorData: err?.data,
        errorStack: err?.stack
      })
      setError(err.message || err.toString() || 'Failed to check domain status')
      setData(null)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, tldConfig])

  useEffect(() => {
    fetchDomainStatus()
  }, [fetchDomainStatus])

  return {
    data,
    isLoading,
    error,
    isSuccess,
    refetch: fetchDomainStatus
  }
}

// Keep the original hook for backward compatibility
export function useViemAvailability(name: string, tldConfig?: TLDConfig) {
  const { data, isLoading, error } = useViemDomainStatus(name, tldConfig)
  return {
    data: data?.available ?? null,
    isLoading,
    error
  }
}

// Hook to get account information using viem
export function useViemAccount() {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask is not installed')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
      } else {
        setError('No accounts found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    setIsConnected(false)
    setError(null)
  }, [])

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      })

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
      }
    } catch (err) {
      console.warn('Failed to check wallet connection:', err)
    }
  }, [])

  useEffect(() => {
    checkConnection()

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
        } else {
          setAccount(null)
          setIsConnected(false)
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  return {
    account,
    isConnected,
    isLoading,
    error,
    connect: connectWallet,
    disconnect
  }
}

// Hook for writing to contracts using viem
export function useViemWriteContract() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const writeContract = useCallback(async ({
    address,
    abi,
    functionName,
    args,
    value
  }: {
    address: string
    abi: any[]
    functionName: string
    args?: any[]
    value?: bigint
  }) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask is not installed')
      return
    }

    setIsLoading(true)
    setError(null)
    setTxHash(null)
    setIsSuccess(false)

    try {
      const walletClient = createWalletClient({
        chain: hiiNetwork,
        transport: custom(window.ethereum)
      })

      const [account] = await walletClient.getAddresses()
      if (!account) {
        throw new Error('No account connected')
      }

      const hash = await walletClient.writeContract({
        address: address as `0x${string}`,
        abi,
        functionName,
        args: args || [],
        account,
        value: value || BigInt(0)
      })

      setTxHash(hash)
      setIsSuccess(true)
      return hash
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setTxHash(null)
    setIsSuccess(false)
  }, [])

  return {
    writeContract,
    isLoading,
    error,
    txHash,
    isSuccess,
    reset
  }
}

// Hook to wait for transaction receipt
export function useViemWaitForTransactionReceipt(hash: string | null) {
  const [receipt, setReceipt] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!hash) {
      setReceipt(null)
      setIsLoading(false)
      setError(null)
      setIsSuccess(false)
      return
    }

    const waitForReceipt = async () => {
      setIsLoading(true)
      setError(null)
      setIsSuccess(false)

      try {
        const client = createPublicClient({
          chain: hiiNetwork,
          transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!)
        })

        const receipt = await client.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
          timeout: 60000 // 60 seconds timeout
        })

        setReceipt(receipt)
        setIsSuccess(receipt.status === 'success')
        if (receipt.status !== 'success') {
          setError('Transaction failed')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to get transaction receipt')
      } finally {
        setIsLoading(false)
      }
    }

    waitForReceipt()
  }, [hash])

  return {
    receipt,
    isLoading,
    error,
    isSuccess
  }
}

// Hook to make commitment for domain registration
export function useViemMakeCommitment(
  name: string | null,
  owner: string | null,
  duration: number | null,
  secret: string | null,
  resolver: string | null,
  dataArray: any[] | null,
  reverseRecord: boolean | null,
  ownerControlledFuses: number | null,
  tldConfig?: TLDConfig
) {
  const [commitment, setCommitment] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const makeCommitment = useCallback(async () => {
    const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
    
    if (!name || !owner || !duration || !secret || !resolver || !currentTLDConfig) {
      setError('Missing required parameters for commitment')
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const contractABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
      const contractAddress = getContractAddress(currentTLDConfig, 'ETHRegistrarController')

      if (!contractAddress) {
        throw new Error(`No registrar controller address found for TLD ${currentTLDConfig.tld}`)
      }

      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!)
      })

      const commitmentHash = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: contractABI,
        functionName: 'makeCommitment',
        args: [
          name,
          owner,
          BigInt(duration * 365 * 24 * 60 * 60), // duration in seconds
          secret,
          resolver,
          dataArray || [],
          reverseRecord || false,
          BigInt(ownerControlledFuses || 0)
        ]
      }) as string

      setCommitment(commitmentHash)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to make commitment')
    } finally {
      setIsLoading(false)
    }
  }, [name, owner, duration, secret, resolver, dataArray, reverseRecord, ownerControlledFuses, tldConfig])

  useEffect(() => {
    if (name && owner && duration && secret && resolver) {
      makeCommitment()
    }
  }, [makeCommitment])

  return {
    commitment,
    isLoading,
    error,
    isSuccess,
    refetch: makeCommitment
  }
}