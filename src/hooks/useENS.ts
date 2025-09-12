import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi'
import { parseEther, keccak256, encodePacked, namehash, getAddress, encodeFunctionData, createPublicClient, http } from 'viem'

import { HNS_CONTRACTS, ETH_REGISTRAR_CONTROLLER_ABI, HNS_REGISTRY_ABI } from '@/config/contracts'
import { fetchDomainsByOwner, Domain } from '@/lib/graphql'
import { useToast } from '@/components/Toast'
import { TLDConfig, getTLDConfigSync, getDefaultTLDSync, getDefaultEmail, extractTLD, extractDomainName } from '../config/tlds'
import { loadContractABI, getContractAddress } from '@/utils/contractLoader'

// Sleep function similar to NestJS
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function to create resolver data similar to NestJS
async function makeData(domain: string, address: string, email?: string, tldConfig?: TLDConfig): Promise<readonly `0x${string}`[]> {
  try {
    const node = namehash(domain)
    const normalizedAddress = getAddress(address)
    
    // Load PublicResolver ABI dynamically
    const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
    if (!currentTLDConfig) {
      throw new Error('TLD configuration not found')
    }
    
    const publicResolverABI = await loadContractABI(currentTLDConfig, 'PublicResolver')
    
    // Encode setAddr function call similar to NestJS - using ABI from PublicResolver
    const encodedSetAddr = encodeFunctionData({
      abi: publicResolverABI,
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
        abi: publicResolverABI,
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
export function useCommitmentValidity(commitmentHash: string | null, tldConfig?: TLDConfig) {
  // Get current TLD configuration
  const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
  const [abi, setAbi] = useState<any>(null)
  
  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
  const result = useReadContract({
    address: currentTLDConfig?.registrarController as `0x${string}`,
    abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'commitments',
    args: commitmentHash ? [commitmentHash] : undefined,
    query: {
      enabled: !!commitmentHash && !!abi && !!currentTLDConfig?.registrarController
    }
  })

  return {
    ...result,
    isValid: result.data ? Number(result.data) > 0 : false
  }
}

export function useCommitmentTiming(tldConfig?: TLDConfig) {
  // Get current TLD configuration
  const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
  const [abi, setAbi] = useState<any>(null)
  
  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
  const minAgeResult = useReadContract({
    address: currentTLDConfig?.registrarController as `0x${string}`,
    abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'minCommitmentAge',
    query: {
      enabled: !!abi && !!currentTLDConfig?.registrarController
    }
  })

  const maxAgeResult = useReadContract({
    address: currentTLDConfig?.registrarController as `0x${string}`,
    abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'maxCommitmentAge',
    query: {
      enabled: !!abi && !!currentTLDConfig?.registrarController
    }
  })

  return {
    minAge: minAgeResult.data ? Number(minAgeResult.data) : 60,
    maxAge: maxAgeResult.data ? Number(maxAgeResult.data) : 86400,
    isLoading: minAgeResult.isLoading || maxAgeResult.isLoading || !abi
  }
}

export function useDomainAvailability(name: string, tldConfig?: TLDConfig) {
  // Get current TLD configuration
  const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
  const [abi, setAbi] = useState<any>(null)
  
  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
  const result = useReadContract({
    address: currentTLDConfig?.registrarController as `0x${string}`,
    abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'available',
    args: name ? [name] : undefined,
    query: {
      enabled: !!name && name.length > 0 && !!abi && !!currentTLDConfig?.registrarController
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
        // Check if it's an indexing error
        const isIndexingError = graphqlError instanceof Error && graphqlError.message === 'INDEXING_ERROR'
        
        if (isIndexingError) {
          console.warn('GraphQL indexing error detected, falling back to blockchain data')
        }
        
        // Fallback to blockchain fetch
        try {
          const blockchainDomains = await fetchDomainsFromBlockchain(address)
          setDomains(blockchainDomains)
          
          // Show a warning if it was an indexing error
          if (isIndexingError) {
            setError('Domain data loaded from blockchain (GraphQL indexer temporarily unavailable)')
          }
        } catch (blockchainError) {
          setDomains([])
          if (isIndexingError) {
            setError('GraphQL indexer unavailable and blockchain fallback failed. Please try again later.')
          } else {
            setError('Failed to fetch domains')
          }
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
export function useRentPrice(name: string, duration: number, tldConfig?: TLDConfig) {
  // Get current TLD configuration
  const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())
  const [abi, setAbi] = useState<any>(null)
  

  
  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
  const result = useReadContract({
    address: currentTLDConfig?.registrarController as `0x${string}`,
    abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [name, BigInt(duration * 365 * 24 * 60 * 60)], // duration in seconds
    chainId: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!), // Hii Network chain ID
    query: {
      enabled: !!name && name.length >= 3 && duration > 0 && !!abi && !!currentTLDConfig?.registrarController,
      retry: 3,
      retryDelay: 1000
    }
  })
  

  
  return result
}

// Hook to register new domain
export function useRegisterDomain(tldConfig?: TLDConfig) {
  const { address: account, isConnected, status } = useAccount()
  const { data: balance } = useBalance({ address: account })
  const publicClient = usePublicClient()
  const { addToast } = useToast()
  
  // Use provided TLD config or default
  const currentTLDConfig = tldConfig || getTLDConfigSync(getDefaultTLDSync())

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
      
      // Check for specific contract errors and provide user-friendly messages
       if (errorMessage.includes('CommitmentTooNew')) {
         // Commitment is too new - wait longer before registering
       } else if (errorMessage.includes('CommitmentTooOld')) {
         // Commitment is too old - need to commit again
       } else if (errorMessage.includes('NameNotAvailable')) {
         // Domain name is not available for registration
       } else if (errorMessage.includes('DurationTooShort')) {
         // Registration duration is too short
       } else if (errorMessage.includes('InsufficientValue')) {
         // Insufficient payment value sent
       }
      
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
      // Parse the full domain name to extract TLD and domain name
      const extractedTLD = await extractTLD(name)
      const domainNameOnly = await extractDomainName(name)
      

      
      // Get the correct TLD config based on extracted TLD
      const correctTLDConfig = extractedTLD ? getTLDConfigSync(extractedTLD) : currentTLDConfig
      
      if (!correctTLDConfig) {
        throw new Error(`TLD configuration not found for ${extractedTLD || 'current TLD'}`)
      }
      

      
      // Create resolver data using the full domain name
      const defaultEmail = await getDefaultEmail(correctTLDConfig.tld)
      const resolverData = await makeData(name, owner, defaultEmail, correctTLDConfig)

      // Use contract function to create commitment hash (similar to backend)
      if (!publicClient) {
        throw new Error('Public client not available')
      }



      // Load TLD-specific ABI and contract address using correct TLD config
      const contractABI = await loadContractABI(correctTLDConfig, 'ETHRegistrarController')
      const contractAddress = getContractAddress(correctTLDConfig, 'ETHRegistrarController')



      if (!contractAddress) {
        throw new Error('Contract address not found for the selected TLD')
      }

      // Get the correct resolver address for this TLD
      const correctResolverAddress = getContractAddress(correctTLDConfig, 'PublicResolver')
      
      if (!correctResolverAddress) {
        throw new Error('Public resolver address not found for the selected TLD')
      }

      const commitmentHash = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: contractABI,
        functionName: 'makeCommitment',
        args: [
              domainNameOnly,
              owner as `0x${string}`,
              BigInt(duration * 365 * 24 * 60 * 60), // Convert years to seconds
              keccak256(encodePacked(['string'], [secret])),
              correctResolverAddress as `0x${string}`,
              resolverData,
              true, // Set reverseRecord to true
              0
            ]
      })
      


      setCommitmentHash(commitmentHash as string)
      
      // Use the same contract address that was used for makeCommitment
      if (!contractAddress) {
        throw new Error('Contract address not found for commit transaction')
      }
      
      // Send commitment transaction
      writeCommit({
           address: contractAddress as `0x${string}`,
           abi: contractABI,
           functionName: 'commit',
           args: [commitmentHash as `0x${string}`],
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
      
      // Parse the full domain name to extract TLD and domain name
        const extractedTLD = await extractTLD(name)
        const domainNameOnly = await extractDomainName(name)
      
      // Get the correct TLD config based on extracted TLD
      const correctTLDConfig = extractedTLD ? getTLDConfigSync(extractedTLD) : currentTLDConfig
      
      if (!correctTLDConfig) {
        throw new Error(`TLD configuration not found for ${extractedTLD || 'current TLD'}`)
      }
      

      
      // Check commitment age before register
      if (publicClient && commitmentHash) {
        try {

          // Load TLD-specific ABI and contract address using correct TLD config
          const registrarABI = await loadContractABI(correctTLDConfig, 'ETHRegistrarController')
          const registrarAddress = getContractAddress(correctTLDConfig, 'ETHRegistrarController')

          if (!registrarAddress) {
            throw new Error('Contract address not found for the selected TLD')
          }
          
          const commitmentTimestamp = await publicClient.readContract({
            address: registrarAddress as `0x${string}`,
            abi: registrarABI,
            functionName: 'commitments',
            args: [commitmentHash as `0x${string}`]
          }) as bigint
          
          const minCommitmentAge = await publicClient.readContract({
            address: registrarAddress as `0x${string}`,
            abi: registrarABI,
            functionName: 'minCommitmentAge',
            args: []
          }) as bigint

          const maxCommitmentAge = await publicClient.readContract({
            address: registrarAddress as `0x${string}`,
            abi: registrarABI,
            functionName: 'maxCommitmentAge',
            args: []
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
        // Create resolver data using the full domain name
        const defaultEmail = await getDefaultEmail(correctTLDConfig.tld)
        const resolverData = await makeData(name, owner, defaultEmail, correctTLDConfig)

        // Try to estimate gas for register transaction
        if (publicClient) {
          // Load TLD-specific ABI and contract address for gas estimation using correct TLD config
          const gasEstimationABI = await loadContractABI(correctTLDConfig, 'ETHRegistrarController')
          const gasEstimationAddress = getContractAddress(correctTLDConfig, 'ETHRegistrarController')
          
          // Get the correct resolver address for this TLD
          const correctResolverAddress = getContractAddress(correctTLDConfig, 'PublicResolver')
          
          const estimatedGas = await publicClient.estimateContractGas({
            address: gasEstimationAddress as `0x${string}`,
            abi: gasEstimationABI,
            functionName: 'register',
            args: [
              domainNameOnly,
              owner as `0x${string}`,
              BigInt(60 * 60 * 24 * 30), // 30 days like NestJS
              secretHash,
              correctResolverAddress as `0x${string}`,
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
      
      try {
        // Create resolver data using the full domain name
        const defaultEmail = await getDefaultEmail(correctTLDConfig.tld)
        const resolverData = await makeData(name, owner, defaultEmail, correctTLDConfig)

        // Load TLD-specific ABI and contract address for registration using correct TLD config
        const registerABI = await loadContractABI(correctTLDConfig, 'ETHRegistrarController')
        const registerAddress = getContractAddress(correctTLDConfig, 'ETHRegistrarController')
        

        if (!registerAddress) {
          throw new Error('Contract address not found for the selected TLD')
        }
        
        // Get the correct resolver address for this TLD
        const correctResolverAddress = getContractAddress(correctTLDConfig, 'PublicResolver')
        
        if (!correctResolverAddress) {
          throw new Error('Public resolver address not found for the selected TLD')
        }
        
        writeRegister({
            address: registerAddress as `0x${string}`,
            abi: registerABI,
            functionName: 'register',
          args: [
            domainNameOnly,
            owner as `0x${string}`,
            BigInt(duration * 365 * 24 * 60 * 60), // Convert years to seconds
            secretHash,
            correctResolverAddress as `0x${string}`,
            resolverData,
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
export function useRenewDomain(tldConfig?: TLDConfig) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abi, setAbi] = useState<any>(null)

  // Get current TLD configuration - ensure we have a valid config
  const currentTLDConfig = tldConfig
  
  console.log('useRenewDomain HOOK - tldConfig passed:', tldConfig)
  console.log('useRenewDomain HOOK - final currentTLDConfig:', currentTLDConfig)
  
  // Only validate TLD config when it's provided (not on initial mount)
  if (tldConfig && !currentTLDConfig) {
    console.error('useRenewDomain HOOK - No TLD config provided!')
  } else if (currentTLDConfig) {
    console.log('useRenewDomain HOOK - Using registrar controller:', currentTLDConfig.registrarController)
  }

  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
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
      if (!currentTLDConfig) {
        throw new Error('No TLD configuration provided to useRenewDomain hook')
      }
      
      const contractAddress = currentTLDConfig.registrarController as `0x${string}`
      
      if (!contractAddress) {
        throw new Error(`No registrar controller address found for TLD: ${currentTLDConfig.tld}`)
      }
      
      console.log('useRenewDomain - Current TLD config:', currentTLDConfig)
      console.log('useRenewDomain - Contract address being used:', contractAddress)
      console.log('useRenewDomain - Domain name:', name)
      console.log('useRenewDomain - ABI being used:', abi ? 'Custom ABI' : 'Default ABI')
      
      writeContract({
        address: contractAddress,
        abi: abi || ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'renew',
        args: [name, BigInt(duration * 365 * 24 * 60 * 60)],
        value: price
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew domain')
      setLoading(false)
    }
  }, [writeContract, currentTLDConfig, abi])

  return {
    renewDomain,
    loading: loading || isConfirming,
    error,
    hash,
    isSuccess
  }
}

// Hook to transfer domain ownership
export function useTransferDomain(tldConfig?: TLDConfig) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abi, setAbi] = useState<any>(null)
  
  // Get current TLD configuration - don't fallback to default
  const currentTLDConfig = tldConfig
  
  // Debug logging for TLD configuration
  useEffect(() => {
    console.log('useTransferDomain HOOK - tldConfig passed:', tldConfig)
    console.log('useTransferDomain HOOK - final currentTLDConfig:', currentTLDConfig)
    if (currentTLDConfig) {
      console.log('useTransferDomain HOOK - Using NameWrapper:', currentTLDConfig.nameWrapper)
    }
  }, [tldConfig, currentTLDConfig])
  
  useEffect(() => {
    const loadABI = async () => {
      if (currentTLDConfig) {
        try {
          const loadedABI = await loadContractABI(currentTLDConfig, 'ETHRegistrarController')
          setAbi(loadedABI)
        } catch (error) {
          console.error('Failed to load ETH registrar controller ABI:', error)
          setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
        }
      } else {
        setAbi(ETH_REGISTRAR_CONTROLLER_ABI)
      }
    }
    loadABI()
  }, [currentTLDConfig])
  
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
      // Validate TLD config is available
      if (!currentTLDConfig) {
        throw new Error('No TLD configuration available. Please select a domain first.')
      }
      
      console.log('transferDomain - Using TLD config:', currentTLDConfig)
      console.log('transferDomain - NameWrapper address:', currentTLDConfig.nameWrapper)
      
      // Calculate node hash for domain using the selected TLD
      const node = namehash(`${domainName}${currentTLDConfig.tld}`)
      
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
        address: HNS_CONTRACTS.registry as `0x${string}`,
        abi: HNS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node]
      })
      

      
      // If owner is NameWrapper, check BaseRegistrar ownership
      if (currentTLDConfig?.nameWrapper && registryOwner.toLowerCase() === currentTLDConfig.nameWrapper.toLowerCase()) {

        
        // Calculate tokenId from label hash
        const labelHash = keccak256(encodePacked(['string'], [domainName.split('.')[0]]))
        const tokenId = BigInt(labelHash)
        
        // Check token owner in BaseRegistrar
        const baseRegistrarOwner = await publicClient.readContract({
          address: HNS_CONTRACTS.baseRegistrarImplementation as `0x${string}`,
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
            address: HNS_CONTRACTS.baseRegistrarImplementation as `0x${string}`,
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
            address: HNS_CONTRACTS.registry as `0x${string}`,
            abi: HNS_REGISTRY_ABI,
            functionName: 'resolver',
            args: [node]
          })
          
          // Get current TTL
          const currentTTL = await publicClient.readContract({
            address: HNS_CONTRACTS.registry as `0x${string}`,
            abi: HNS_REGISTRY_ABI,
            functionName: 'ttl',
            args: [node]
          })
          
          
          
          writeContract({
              address: currentTLDConfig?.nameWrapper as `0x${string}`,
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
          address: HNS_CONTRACTS.registry as `0x${string}`,
          abi: HNS_REGISTRY_ABI,
          functionName: 'setOwner',
          args: [node, newOwner as `0x${string}`]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer domain')
      setLoading(false)
    }
  }, [writeContract, currentTLDConfig, address])

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
    const { getSupportedTLDs } = await import('@/config/tlds')
    
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
    const supportedTLDs = getSupportedTLDs()
    
    // Get NameRegistered events from all TLD registrar controllers
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - BigInt(10000) // Get latest 10000 blocks
    
    // Process each supported TLD
    const supportedTLDsArray = await supportedTLDs
    for (const tld of supportedTLDsArray) {
      try {
        const tldConfig = getTLDConfigSync(tld)
        if (!tldConfig) continue
        
        const registrarAddress = getContractAddress(tldConfig, 'ETHRegistrarController')
        if (!registrarAddress) continue
        
        const filter = {
          address: registrarAddress as `0x${string}`,
          topics: [
            keccak256(encodePacked(['string'], ['NameRegistered(string,bytes32,uint256)']))
          ],
          fromBlock,
          toBlock: currentBlock
        }
        
        const logs = await publicClient.getLogs(filter)
        
        // Process each event for this TLD
        for (const log of logs) {
          try {
            // Decode event data
            const { decodeEventLog } = await import('viem')
            const registrarABI = await loadContractABI(tldConfig, 'ETHRegistrarController')
            const decoded = decodeEventLog({
              abi: registrarABI,
              data: log.data,
              topics: log.topics
            }) as any
            
            if (decoded.eventName === 'NameRegistered') {
              const { name, labelHash, expires } = decoded.args as any
              
              // Create domain node with correct TLD
              const domainName = `${name}${tld}`
              const node = namehash(domainName)
              
              // Check current owner
              const currentOwner = await publicClient.readContract({
                address: HNS_CONTRACTS.registry as `0x${string}`,
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
      } catch (error) {
        continue
      }
    }
    
    return domains
    
  } catch (error) {
    return []
  }
}