import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi'
import { parseEther, keccak256, encodePacked, namehash, getAddress, encodeFunctionData, createPublicClient, http } from 'viem'

import { HNS_CONTRACTS, ETH_REGISTRAR_CONTROLLER_ABI, HNS_REGISTRY_ABI } from '@/config/contracts'
import ETHRegistrarControllerABI from '@/contracts/ABIs/ETHRegistrarController.json'
import { fetchDomainsByOwner, Domain } from '@/lib/graphql'
import PublicResolverABI from '@/contracts/ABIs/PublicResolver.json'
import { useToast } from '@/components/Toast'

// Sleep function similar to NestJS
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function to create resolver data similar to NestJS
async function makeData(domain: string, address: string, email?: string): Promise<readonly `0x${string}`[]> {
  try {
    const node = namehash(domain)
    const normalizedAddress = getAddress(address)
    
    // Encode setAddr function call similar to NestJS - using ABI from PublicResolver
    const encodedSetAddr = encodeFunctionData({
      abi: PublicResolverABI.abi,
      functionName: 'setAddr',
      args: [
        node,
        BigInt(60), // ETH coin type
        normalizedAddress
      ]
    })

    const dataList: `0x${string}`[] = [encodedSetAddr]

    if (email) {
      // Encode setText function call similar to NestJS - using ABI from PublicResolver
      const encodedSetText = encodeFunctionData({
        abi: PublicResolverABI.abi,
        functionName: 'setText',
        args: [
          node,
          'email',
          email
        ]
      })
      dataList.push(encodedSetText)
    }

    return dataList
  } catch (error) {

    throw new Error(`Cannot create data for domain ${domain}: ${error}`)
  }
}

// Hook to check commitment validity
export function useCommitmentValidity(commitmentHash: string | null) {
  const result = useReadContract({
    address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'commitments',
    args: commitmentHash ? [commitmentHash] : undefined,
    query: {
      enabled: !!commitmentHash
    }
  })

  return {
    ...result,
    isValid: result.data ? Number(result.data) > 0 : false
  }
}

export function useCommitmentTiming() {
  const minAgeResult = useReadContract({
    address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'minCommitmentAge'
  })

  const maxAgeResult = useReadContract({
    address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'maxCommitmentAge'
  })

  return {
    minAge: minAgeResult.data ? Number(minAgeResult.data) : 60,
    maxAge: maxAgeResult.data ? Number(maxAgeResult.data) : 86400,
    isLoading: minAgeResult.isLoading || maxAgeResult.isLoading
  }
}

export function useDomainAvailability(name: string) {
  const result = useReadContract({
    address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'available',
    args: name ? [name] : undefined,
    query: {
      enabled: !!name && name.length > 0
    }
  })

  return {
    ...result,
    isAvailable: result.data
  }
}

// Hook to get user's domain list
export function useUserDomains() {
  const { address } = useAccount()
  const { addToast } = useToast()
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    if (!address) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Try GraphQL first, fallback to blockchain if needed
      try {
        const userDomains = await fetchDomainsByOwner(address)
        setDomains(userDomains)
      } catch (graphqlError) {
        // Fallback to blockchain fetch
        try {
          const blockchainDomains = await fetchDomainsFromBlockchain(address)
          setDomains(blockchainDomains)
        } catch (blockchainError) {
          setDomains([])
          setError('Failed to fetch domains')
        }
      }
    } catch (err) {
      setError('Failed to fetch domains')
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch domains'
       setError(errorMessage)
       addToast({ type: 'error', title: 'Error', message: errorMessage })
    } finally {
      setLoading(false)
    }
  }, [address])

  return {
    domains,
    loading,
    error,
    refetch: fetchDomains
  }
}

// Hook to get domain registration price
export function useRentPrice(name: string, duration: number) {

  
  const result = useReadContract({
    address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [name, BigInt(duration * 365 * 24 * 60 * 60)], // duration in seconds
    chainId: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!), // Hii Network chain ID
    query: {
      enabled: !!name && name.length >= 3 && duration > 0,
      retry: 3,
      retryDelay: 1000
    }
  })
  

  
  return result
}

// Hook to register new domain
export function useRegisterDomain() {
  const { address: account, isConnected, status } = useAccount()
  const { data: balance } = useBalance({ address: account })
  const publicClient = usePublicClient()
  const { addToast } = useToast()

  const [isCommitting, setIsCommitting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [commitmentHash, setCommitmentHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estimatedGas, setEstimatedGas] = useState<bigint | null>(null)
  const [hasShownCommitSuccess, setHasShownCommitSuccess] = useState(false)
  const [hasShownRegisterSuccess, setHasShownRegisterSuccess] = useState(false)
  
  const { writeContract: writeCommit, data: commitHash } = useWriteContract()
  const { writeContract: writeRegister, data: registerHash } = useWriteContract()
  
  const { isLoading: isCommitConfirming, isSuccess: isCommitSuccess } = useWaitForTransactionReceipt({
    hash: commitHash,
  })
  
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess, isError: isRegisterError, error: registerError } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  // Reset states when commit is successful
  useEffect(() => {
    if (isCommitSuccess && !hasShownCommitSuccess) {
      setIsCommitting(false)
      setHasShownCommitSuccess(true)
      addToast({ 
        type: 'success', 
        title: 'Success', 
        message: 'Commitment submitted successfully! Please wait 60 seconds before registering.',
        duration: 5000
      })
    }
  }, [isCommitSuccess, hasShownCommitSuccess, addToast])

  // Reset states when register succeeds or fails
  useEffect(() => {
    if (isRegisterSuccess && !hasShownRegisterSuccess) {
      setIsRegistering(false)
      setHasShownRegisterSuccess(true)
      addToast({ 
        type: 'success', 
        title: 'Success', 
        message: 'Domain registered successfully!',
        duration: 5000
      })
    }
    if (isRegisterError) {
      setIsRegistering(false)
      const errorMessage = registerError?.message || 'Registration failed. Please try again.'
      

      
      // Handle specific error types
      let finalErrorMessage = ''
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        finalErrorMessage = 'Transaction failed: Insufficient balance. Please check your balance and try again.'
      } else if (errorMessage.includes('gas')) {
        finalErrorMessage = `Transaction failed: Gas error. ${errorMessage}`
      } else if (errorMessage.includes('nonce')) {
        finalErrorMessage = `Transaction failed: Nonce error. ${errorMessage}`
      } else if (errorMessage.includes('revert')) {
        finalErrorMessage = `Transaction failed: Contract revert. ${errorMessage}`
      } else if (errorMessage.includes('user rejected')) {
        finalErrorMessage = 'Transaction cancelled by user.'
      } else {
        finalErrorMessage = `Transaction failed: ${errorMessage}`
      }
      setError(finalErrorMessage)
      addToast({ 
        type: 'error', 
        title: 'Registration Error', 
        message: finalErrorMessage,
        duration: 8000
      })
    }
  }, [isRegisterSuccess, isRegisterError, registerError, hasShownRegisterSuccess, addToast])



  // Step 1: Create commitment
  const makeCommitment = useCallback(async (
    name: string,
    owner: string,
    duration: number,
    secret: string
  ) => {
    if (!owner || owner === '0x0000000000000000000000000000000000000000') {
      setError('Please connect your wallet first or wallet address is invalid')
      return
    }
    
    if (!isConnected) {
      setError('Wallet is not connected. Please connect your wallet first.')
      return
    }

    if (!account) {
      setError('Account not available. Please connect your wallet first.')
      return
    }
    
    // Reset notification flags for new registration
    setHasShownCommitSuccess(false)
    setHasShownRegisterSuccess(false)
    setError(null)
    setIsCommitting(true)
    
    try {
      // Create resolver data
      const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')

      // Use contract function to create commitment hash (similar to backend)
      if (!publicClient) {
        throw new Error('Public client not available')
      }

      const commitmentHash = await publicClient.readContract({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        abi: ETHRegistrarControllerABI.abi,
        functionName: 'makeCommitment',
        args: [
          name,
          owner as `0x${string}`,
          BigInt(60 * 60 * 24 * 30), // 30 days like NestJS
          keccak256(encodePacked(['string'], [secret])),
          HNS_CONTRACTS.PUBLIC_RESOLVER,
          resolverData,
          true, // Set reverseRecord to true
          0
        ]
      })
      


      setCommitmentHash(commitmentHash as string)
      
      // Send commitment transaction
      writeCommit({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        abi: ETHRegistrarControllerABI.abi,
        functionName: 'commit',
        args: [commitmentHash],
        gas: BigInt(50000),
        account: account as `0x${string}`
      })
    } catch (err) {

      const errorMessage = err instanceof Error ? err.message : 'Failed to make commitment'
       setError(errorMessage)
       setIsCommitting(false)
       addToast({ type: 'error', title: 'Commitment Error', message: errorMessage })
    }
  }, [writeCommit, isConnected, account, publicClient])

  // Step 2: Register domain after waiting 60 seconds
  const registerDomain = useCallback(async (
    name: string,
    owner: string,
    duration: number,
    secret: string,
    price: bigint,
    skipBalanceCheck: boolean = false
  ) => {
    if (!commitmentHash) {
      setError('No commitment found. Please commit first.')
      return
    }

    if (!isConnected) {
      setError('Wallet is not connected. Please connect your wallet first.')
      return
    }

    if (!account) {
      setError('Account not available. Please connect your wallet first.')
      return
    }

    if (!owner || owner === '0x0000000000000000000000000000000000000000') {
      setError('Please connect your wallet first or wallet address is invalid')
      return
    }

    // Ensure owner address matches connected account
    if (owner.toLowerCase() !== account.toLowerCase()) {
      setError('Owner address must match connected wallet address')
      return
    }

    if (!balance && !skipBalanceCheck) {
      setError('Unable to check balance. Please try again.')
      return
    }

    setError(null)
    setIsRegistering(true)
    
    try {
      const secretHash = keccak256(encodePacked(['string'], [secret]))
      
      // Check commitment age before register
      if (publicClient && commitmentHash) {
        try {

          
          const commitmentTimestamp = await publicClient.readContract({
            address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETH_REGISTRAR_CONTROLLER_ABI,
            functionName: 'commitments',
            args: [commitmentHash as `0x${string}`]
          })
          
          const minCommitmentAge = await publicClient.readContract({
            address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'minCommitmentAge'
          }) as bigint
          
          const maxCommitmentAge = await publicClient.readContract({
            address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'maxCommitmentAge'
          }) as bigint
          
          const currentTime = BigInt(Math.floor(Date.now() / 1000))
          const commitmentAge = currentTime - commitmentTimestamp
          const validStart = commitmentTimestamp + minCommitmentAge
          const validEnd = commitmentTimestamp + maxCommitmentAge
          

          
          // Check if commitment exists
          if (commitmentTimestamp === BigInt(0)) {
            throw new Error('Commitment not found or already used')
          }
          
          // Check if commitment has expired
          if (currentTime > validEnd) {
            throw new Error(`Commitment expired. Valid window: ${validStart} - ${validEnd}, current: ${currentTime}`)
          }
          
          // Wait additional 5 seconds like NestJS to ensure commitment is old enough
          const requiredAge = minCommitmentAge + BigInt(5)
          if (commitmentAge < requiredAge) {
            const waitTime = Number(requiredAge - commitmentAge)
            setError(`Waiting for commitment to mature... ${waitTime} seconds`)
            
            // Wait automatically
            await sleep(waitTime * 1000)
          }
        } catch (error) {

          throw new Error(`Commitment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        throw new Error('Public client or commitment hash not available')
      }
      
      // Fix gas calculation logic - don't include gas cost in total cost
      // Only calculate rent price + small buffer for gas
      const gasBuffer = price / BigInt(20) // 5% buffer cho gas
      const totalCost = price + gasBuffer
      
      // Gas limit for register transaction - use actual gas estimate
      let finalGasLimit = BigInt(500000) // Default gas limit
      
      try {
        // Create resolver data similar to NestJS
        const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')

        // Try to estimate gas for register transaction
        if (publicClient) {
          const estimatedGas = await publicClient.estimateContractGas({
            address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'register',
            args: [
              name,
              owner as `0x${string}`,
              BigInt(60 * 60 * 24 * 30), // 30 days like NestJS
              secretHash,
              HNS_CONTRACTS.PUBLIC_RESOLVER,
              resolverData,
              true, // Set reverseRecord to true
              0
            ],
            value: price,
            account: account as `0x${string}`
          })
          finalGasLimit = (estimatedGas * BigInt(120)) / BigInt(100) // Add 20% like NestJS

        } else {

        }
      } catch (gasError) {

        // Use default gas limit if estimation fails
      }

      // Check balance before transaction (unless skipped)
      if (!skipBalanceCheck && balance && balance.value < totalCost) {
        const shortfall = totalCost - balance.value
        const shortfallFormatted = (Number(shortfall) / 10 ** 18).toFixed(6)
        const balanceFormatted = (Number(balance.value) / 10 ** 18).toFixed(6)
        const totalCostFormatted = (Number(totalCost) / 10 ** 18).toFixed(6)
        

        
        // Try with skip balance check if balance is sufficient for rent price
        if (balance.value >= price) {
          return registerDomain(name, owner, duration, secret, price, true)
        }
        
        setError(`Insufficient balance. Current: ${balanceFormatted} HII. Required: ${totalCostFormatted} HII. Short: ${shortfallFormatted} HII`)
        setIsRegistering(false)
        return
      }

  
      // if (!skipBalanceCheck && balance) {
      //   console.log('=== BALANCE CHECK PASSED ===')
      //   console.log('Balance value:', balance.value.toString())
      //   console.log('Total cost:', totalCost.toString())
      //   console.log('Balance >= TotalCost:', balance.value >= totalCost)
      //   console.log('Proceeding with transaction...')
      //   console.log('============================')
      // }
      
      // console.log('=== CALLING WRITE REGISTER ===')
      // console.log('Contract address:', ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER)
      // console.log('Function name: register')
      // console.log('Value:', price.toString())
      // console.log('Gas:', finalGasLimit.toString())
      // console.log('Account parameter:', account)
      // console.log('Owner parameter:', owner)
      // console.log('Args:', [
      //   name,
      //   owner as `0x${string}`,
      //   BigInt(duration * 365 * 24 * 60 * 60),
      //   secretHash,
      //   ENS_CONTRACTS.PUBLIC_RESOLVER,
      //   [],
      //   false,
      //   0,
      //   BigInt(0)
      // ])
      // console.log('Current timestamp:', new Date().toISOString())
      // console.log('Commitment age:', commitmentHash ? 'Available' : 'Not available')
      // console.log('=============================')
      
      try {
        // Create resolver data similar to NestJS
        const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')



        writeRegister({
          address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
          abi: ETHRegistrarControllerABI.abi,
          functionName: 'register',
          args: [
            name,
            owner as `0x${string}`,
            BigInt(60 * 60 * 24 * 30), // 30 days like NestJS
            secretHash,
            HNS_CONTRACTS.PUBLIC_RESOLVER,
            resolverData as readonly `0x${string}`[],
            true, // Set reverseRecord to true
            0
          ],
          value: price, // Use original price
          gas: finalGasLimit, // Use final gas limit
          account: account as `0x${string}` // Ensure using correct account
        })
      } catch (writeError) {
        setError(`Transaction error: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`)
        setIsRegistering(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register domain'
       setError(errorMessage)
       setIsRegistering(false)
       addToast({ type: 'error', title: 'Registration Error', message: errorMessage })
    }
  }, [writeRegister, commitmentHash, balance, isConnected, account, publicClient, addToast]);

  return {
    makeCommitment,
    registerDomain,
    isCommitting: isCommitting || isCommitConfirming,
    isRegistering: isRegistering || isRegisterConfirming,
    commitmentHash,
    error,
    commitHash,
    registerHash,
    estimatedGas
  }
}

// Hook to renew domain
export function useRenewDomain() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Reset loading state when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      setLoading(false)
    }
  }, [isSuccess])

  const renewDomain = useCallback(async (
    name: string,
    duration: number,
    price: bigint
  ) => {
    setError(null)
    setLoading(true)
    
    try {
      writeContract({
        address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'renew',
        args: [name, BigInt(duration * 365 * 24 * 60 * 60)],
        value: price
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew domain')
      setLoading(false)
    }
  }, [writeContract])

  return {
    renewDomain,
    loading: loading || isConfirming,
    error,
    hash,
    isSuccess
  }
}

// Hook to transfer domain ownership
export function useTransferDomain() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { address } = useAccount()
  const { writeContract, data: hash, reset: resetTransaction } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Reset loading state when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      setLoading(false)
    }
  }, [isSuccess])

  const transferDomain = useCallback(async (
    domainName: string,
    newOwner: string
  ) => {
    setError(null)
    setLoading(true)
    
    try {
      // Calculate node hash for domain
      const node = namehash(`${domainName}.hii`)
      
      // Check if domain is wrapped in NameWrapper
      const publicClient = createPublicClient({
        chain: {
          id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!),
          name: 'Hii Network',
          network: 'hii-testnet',
          nativeCurrency: { name: 'HII', symbol: 'HII', decimals: 18 },
          rpcUrls: {
            default: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] },
            public: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] }
          }
        },
        transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!)
      })
      
      // Check owner from ENS Registry
      const registryOwner = await publicClient.readContract({
        address: HNS_CONTRACTS.REGISTRY,
        abi: HNS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node]
      })
      

      
      // If owner is NameWrapper, check BaseRegistrar ownership
      if (registryOwner.toLowerCase() === HNS_CONTRACTS.NAME_WRAPPER.toLowerCase()) {

        
        // Calculate tokenId from label hash
        const labelHash = keccak256(encodePacked(['string'], [domainName.split('.')[0]]))
        const tokenId = BigInt(labelHash)
        
        // Check token owner in BaseRegistrar
        const baseRegistrarOwner = await publicClient.readContract({
          address: HNS_CONTRACTS.BASE_REGISTRAR_IMPLEMENTATION,
          abi: [
            {
              "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
              "name": "ownerOf",
              "outputs": [{"internalType": "address", "name": "", "type": "address"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'ownerOf',
          args: [tokenId]
        })
        

        
        // If BaseRegistrar owner is user, use BaseRegistrar transfer
        if (baseRegistrarOwner.toLowerCase() === address?.toLowerCase()) {

          
          writeContract({
            address: HNS_CONTRACTS.BASE_REGISTRAR_IMPLEMENTATION,
            abi: [
              {
                "inputs": [
                  {"internalType": "address", "name": "from", "type": "address"},
                  {"internalType": "address", "name": "to", "type": "address"},
                  {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
                ],
                "name": "transferFrom",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'transferFrom',
            args: [address as `0x${string}`, newOwner as `0x${string}`, tokenId]
          })
        } else {

          
          // Get current resolver
          const currentResolver = await publicClient.readContract({
            address: HNS_CONTRACTS.REGISTRY,
            abi: HNS_REGISTRY_ABI,
            functionName: 'resolver',
            args: [node]
          })
          
          // Get current TTL
          const currentTTL = await publicClient.readContract({
            address: HNS_CONTRACTS.REGISTRY,
            abi: HNS_REGISTRY_ABI,
            functionName: 'ttl',
            args: [node]
          })
          
          
          
          writeContract({
            address: HNS_CONTRACTS.NAME_WRAPPER,
            abi: [
              {
                "inputs": [
                  {"internalType": "bytes32", "name": "node", "type": "bytes32"},
                  {"internalType": "address", "name": "owner", "type": "address"},
                  {"internalType": "address", "name": "resolver", "type": "address"},
                  {"internalType": "uint64", "name": "ttl", "type": "uint64"}
                ],
                "name": "setRecord",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'setRecord',
            args: [node, newOwner as `0x${string}`, currentResolver, currentTTL]
          })
        }
      } else {

        
        writeContract({
          address: HNS_CONTRACTS.REGISTRY,
          abi: HNS_REGISTRY_ABI,
          functionName: 'setOwner',
          args: [node, newOwner as `0x${string}`]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer domain')
      setLoading(false)
    }
  }, [writeContract])

  const resetTransferState = useCallback(() => {
    resetTransaction()
    setLoading(false)
    setError(null)
  }, [resetTransaction])

  return {
    transferDomain,
    loading: loading || isConfirming,
    error,
    hash,
    isSuccess,
    resetTransferState
  }
}

// Function to fetch domains directly from blockchain
async function fetchDomainsFromBlockchain(ownerAddress: string): Promise<Domain[]> {
  try {

    
    // Import viem modules
    const { createPublicClient, http } = await import('viem')
    
    // Create public client to read from blockchain
    const publicClient = createPublicClient({
      chain: {
        id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!),
        name: 'Hii Network',
        network: 'hii-testnet',
        nativeCurrency: { name: 'HII', symbol: 'HII', decimals: 18 },
        rpcUrls: {
          default: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] },
          public: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] }
        }
      },
      transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!)
    })

    const domains: Domain[] = []
    
    // Get NameRegistered events from ETHRegistrarController
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - BigInt(10000) // Get latest 10000 blocks
    

    
    const filter = {
      address: HNS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
      topics: [
        keccak256(encodePacked(['string'], ['NameRegistered(string,bytes32,uint256)']))
      ],
      fromBlock,
      toBlock: currentBlock
    }
    
    const logs = await publicClient.getLogs(filter)

    
    // Process each event
    for (const log of logs) {
      try {
        // Decode event data
        const { decodeEventLog } = await import('viem')
        const decoded = decodeEventLog({
          abi: ETHRegistrarControllerABI.abi,
          data: log.data,
          topics: log.topics
        })
        
        if (decoded.eventName === 'NameRegistered') {
          const { name, labelHash, expires } = decoded.args as any
          
          // Create domain node
          const domainName = `${name}.hii`
          const node = namehash(domainName)
          
          // Check current owner
          const currentOwner = await publicClient.readContract({
            address: HNS_CONTRACTS.REGISTRY,
        abi: HNS_REGISTRY_ABI,
            functionName: 'owner',
            args: [node]
          })
          
          // Only get domains belonging to this owner

          
          if (currentOwner.toLowerCase() === ownerAddress.toLowerCase()) {
            // Use default values for resolver and TTL
            const resolverAddress = '0x0000000000000000000000000000000000000000'
            const ttl = BigInt(0)
            
            const domain: Domain = {
              id: node,
              name: domainName,
              labelName: name,
              labelhash: labelHash,
              owner: {
                id: currentOwner
              },
              resolver: resolverAddress !== '0x0000000000000000000000000000000000000000' ? {
                id: resolverAddress
              } : undefined,
              ttl: ttl.toString(),
              isMigrated: true,
              createdAt: new Date(Number(expires) * 1000).toISOString(),
              expiryDate: new Date(Number(expires) * 1000).toISOString()
            }
            
            domains.push(domain)

          }
        }
      } catch (error) {

        continue
      }
    }
    

    return domains
    
  } catch (error) {

    return []
  }
}