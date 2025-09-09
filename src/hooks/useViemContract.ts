import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, createWalletClient, custom, http, formatEther, defineChain, keccak256, encodePacked } from 'viem'
import { HNS_CONTRACTS, ETH_REGISTRAR_CONTROLLER_ABI } from '@/config/contracts'

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
export function useViemRentPrice(name: string | null, duration: number | null = 1) {
  const [data, setData] = useState<{base: bigint, premium: bigint} | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fetchRentPrice = useCallback(async () => {

    
    if (!name || !duration || name.length < 3) {

      setData(null)
      setError(null)
      setIsSuccess(false)
      return
    }


    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {

      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        })
      })


      const result = await client.readContract({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER as `0x${string}`,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'rentPrice',
        args: [name!, BigInt(duration! * 365 * 24 * 60 * 60)] // duration in seconds
      })


      const priceData = result as { base: bigint, premium: bigint }
      setData(priceData)
      setIsSuccess(true)
      setError(null)

    } catch (err: any) {

      setError(err.message || 'Failed to fetch rent price')
      setData(null)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, duration])

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
export function useViemAvailability(name: string) {
  const [data, setData] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fetchAvailability = useCallback(async () => {
    if (!name || name.length < 3) {
      setData(null)
      setError(null)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {

      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        })
      })


      const result = await client.readContract({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER as `0x${string}`,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'available',
        args: [name]
      })


      setData(result as boolean)
      setIsSuccess(true)
      setError(null)

    } catch (err: any) {

      setError(err.message || 'Failed to check availability')
      setData(null)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [name])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  return {
    data,
    isLoading,
    error,
    isSuccess,
    refetch: fetchAvailability
  }
}

// Hook to get wallet address from MetaMask replacing wagmi useAccount
export function useViemAccount() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not installed')
      setIsLoading(false)
      return
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        setError(null)
      } else {
        setAddress(null)
        setIsConnected(false)
        setError(null)
      }
    } catch (err: any) {

      setError(err.message || 'Failed to check wallet connection')
      setAddress(null)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
          setError(null)
        } else {
          setAddress(null)
          setIsConnected(false)
          setError(null)
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed')
      return
    }

    try {
      setIsLoading(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        setError(null)
      }
    } catch (err: any) {

      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    address,
    isConnected,
    isLoading,
    error,
    connect,
    refetch: checkConnection
  }
}

// Hook to replace wagmi useWriteContract
export function useViemWriteContract() {
  const [data, setData] = useState<string | null>(null) // transaction hash
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const writeContract = useCallback(async (params: {
    address: string
    abi: any[]
    functionName: string
    args?: any[]
    value?: bigint
  }) => {
    if (!window.ethereum) {
      setError('MetaMask not installed')
      return
    }

    try {
      setIsPending(true)
      setError(null)

      const walletClient = createWalletClient({
        chain: hiiNetwork,
        transport: custom(window.ethereum)
      })

      const [account] = await walletClient.getAddresses()
      
      if (!account) {
        throw new Error('No account connected')
      }

      const hash = await walletClient.writeContract({
        address: params.address as `0x${string}`,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
        account
      })

      setData(hash)
      return hash
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return {
    writeContract,
    data,
    isPending,
    error
  }
}

// Hook to replace wagmi useWaitForTransactionReceipt
export function useViemWaitForTransactionReceipt(hash: string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<any>(null)

  useEffect(() => {
    if (!hash) {
      setIsLoading(false)
      setIsSuccess(false)
      setError(null)
      setReceipt(null)
      return
    }

    const waitForReceipt = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const client = createPublicClient({
          chain: hiiNetwork,
          transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
            timeout: 30000,
            retryCount: 3,
            retryDelay: 1000,
          })
        })

        const receipt = await client.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
          timeout: 60000 // 60 seconds
        })

        setReceipt(receipt)
        setIsSuccess(receipt.status === 'success')
        if (receipt.status !== 'success') {
          setError('Transaction failed')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to get transaction receipt')
        setIsSuccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    waitForReceipt()
  }, [hash])

  return {
    isLoading,
    isSuccess,
    error,
    receipt
  }
}

// Hook to create commitment hash using viem directly
export function useViemMakeCommitment(
  name: string | null,
  owner: string | null,
  duration: number | null,
  secret: string | null,
  resolver: string | null,
  dataArray: any[] | null,
  reverseRecord: boolean | null,
  ownerControlledFuses: number | null
) {
  const [commitmentData, setCommitmentData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fetchCommitment = useCallback(async () => {
    if (!name || !owner || !duration || !secret || !resolver || dataArray === null || reverseRecord === null || ownerControlledFuses === null) {
      setCommitmentData(null)
      setError(null)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const client = createPublicClient({
        chain: hiiNetwork,
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        })
      })

      const result = await client.readContract({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER as `0x${string}`,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'makeCommitment',
        args: [
          name,
          owner as `0x${string}`,
          BigInt(duration * 365 * 24 * 60 * 60),
          secret as `0x${string}`,
          resolver as `0x${string}`,
          dataArray,
          reverseRecord,
          ownerControlledFuses
        ]
      })

      setCommitmentData(result as string)
      setIsSuccess(true)
      setError(null)

    } catch (err: any) {
      setError(err.message || 'Failed to make commitment')
      setCommitmentData(null)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, owner, duration, secret, resolver, dataArray, reverseRecord, ownerControlledFuses])

  useEffect(() => {
    fetchCommitment()
  }, [fetchCommitment])

  return {
    data: commitmentData,
    isLoading,
    error,
    isSuccess,
    refetch: fetchCommitment
  }
}