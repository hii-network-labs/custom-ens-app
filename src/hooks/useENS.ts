import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance, useEstimateGas, usePublicClient } from 'wagmi'
import { parseEther, keccak256, encodePacked, namehash, getAddress, encodeFunctionData, createPublicClient, http } from 'viem'
import { getBytes } from 'ethers'
import { ENS_CONTRACTS, ETH_REGISTRAR_CONTROLLER_ABI, ENS_REGISTRY_ABI } from '@/config/contracts'
import ETHRegistrarControllerABI from '@/contracts/ABIs/ETHRegistrarController.json'
import { fetchDomainsByOwner, Domain, testSubgraphConnection, testSubgraphWithOwner } from '@/lib/graphql'
import PublicResolverABI from '@/contracts/ABIs/PublicResolver.json'
import { useToast } from '@/components/Toast'

// Function sleep giống như NestJS
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function để tạo resolver data giống như NestJS
async function makeData(domain: string, address: string, email?: string): Promise<readonly `0x${string}`[]> {
  try {
    const node = namehash(domain)
    const normalizedAddress = getAddress(address)
    
    // Encode setAddr function call giống như NestJS - sử dụng ABI từ PublicResolver
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
      // Encode setText function call giống như NestJS - sử dụng ABI từ PublicResolver
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
    console.error('Lỗi khi tạo data cho tên miền:', domain, error)
    throw new Error(`Không thể tạo data cho tên miền ${domain}: ${error}`)
  }
}

// Hook để kiểm tra commitment validity
export function useCommitmentValidity(commitmentHash: string | null) {
  const result = useReadContract({
    address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'commitments',
    args: [commitmentHash as `0x${string}`],
    query: {
      enabled: !!commitmentHash
    }
  })

  // Debug commitment validity
  console.log('=== COMMITMENT VALIDITY HOOK ===')
  console.log('Commitment hash:', commitmentHash)
  console.log('Is enabled:', !!commitmentHash)
  console.log('Result:', result)
  console.log('Data:', result.data)
  console.log('Is loading:', result.isLoading)
  console.log('Error:', result.error)
  console.log('================================')

  return result
}

// Hook để lấy thông tin timing từ contract
export function useCommitmentTiming() {
  const minAgeResult = useReadContract({
    address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'minCommitmentAge'
  })

  const maxAgeResult = useReadContract({
    address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETHRegistrarControllerABI.abi,
    functionName: 'maxCommitmentAge'
  })

  return {
    minCommitmentAge: minAgeResult.data as bigint | undefined,
    maxCommitmentAge: maxAgeResult.data as bigint | undefined,
    isLoading: minAgeResult.isLoading || maxAgeResult.isLoading,
    error: minAgeResult.error || maxAgeResult.error
  }
}

// Hook để kiểm tra domain availability
export function useDomainAvailability(name: string) {
  const result = useReadContract({
    address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'available',
    args: [name],
    chainId: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!), // Hii Network chain ID
    query: {
      enabled: !!name && name.length >= 3,
      retry: 3,
      retryDelay: 1000
    }
  })

  // Debug domain availability
  console.log('=== DOMAIN AVAILABILITY HOOK ===')
  console.log('Domain name:', name)
  console.log('Contract address:', ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER)
  console.log('Is enabled:', !!name && name.length >= 3)
  console.log('Result:', result)
  console.log('Data:', result.data)
  console.log('Is loading:', result.isLoading)
  console.log('Error:', result.error)
  console.log('Error details:', result.error?.message)
  console.log('================================')

  return result
}

// Hook để lấy danh sách domains của user
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
      console.log('=== FETCHING USER DOMAINS ===')
      console.log('Address:', address)
      console.log('Address lowercase:', address.toLowerCase())
      
      let allDomains: Domain[] = []
      
      // Test subgraph connection trước
      await testSubgraphConnection()
      await testSubgraphWithOwner(address)
      
      // Thử fetch từ GraphQL trước
      try {
        const userDomains = await fetchDomainsByOwner(address)
        console.log('GraphQL domains found:', userDomains.length)
        console.log('GraphQL domains:', userDomains.map(d => d.name))
        allDomains = [...userDomains]
        
        // Nếu có ít domain hơn expected, thử fetch từ blockchain
        if (userDomains.length < 4) { // Bạn có 4 domains nhưng chỉ thấy 1
          console.log('GraphQL returned fewer domains than expected, trying blockchain fetch...')
          try {
            const blockchainDomains = await fetchDomainsFromBlockchain(address)
            console.log('Blockchain domains found:', blockchainDomains.length)
            console.log('Blockchain domains:', blockchainDomains.map(d => d.name))
            
            // Merge và deduplicate domains
            const existingIds = new Set(allDomains.map(d => d.id))
            const newDomains = blockchainDomains.filter(d => !existingIds.has(d.id))
            allDomains = [...allDomains, ...newDomains]
            
            console.log('Total domains after merge:', allDomains.length)
          } catch (blockchainError) {
            console.log('Blockchain fetch failed:', blockchainError)
          }
        }
        
        setDomains(allDomains)
        
      } catch (graphqlError) {
        console.log('GraphQL fetch failed:', graphqlError)
        // Fallback: fetch từ blockchain trực tiếp
        console.log('Falling back to blockchain fetch...')
        try {
          const blockchainDomains = await fetchDomainsFromBlockchain(address)
          console.log('Blockchain fallback domains:', blockchainDomains.length)
          setDomains(blockchainDomains)
        } catch (blockchainError) {
          console.log('Blockchain fallback also failed:', blockchainError)
          setDomains([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err)
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

// Hook để lấy giá đăng ký domain
export function useRentPrice(name: string, duration: number) {
  console.log('=== RENT PRICE HOOK ===')
  console.log('Name:', name)
  console.log('Duration:', duration)
  console.log('Contract address:', ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER)
  console.log('Duration in seconds:', BigInt(duration * 365 * 24 * 60 * 60))
  console.log('Name length:', name?.length)
  console.log('Duration value:', duration)
  console.log('Enabled:', !!name && name.length >= 3 && duration > 0)
  console.log('========================')
  
  const result = useReadContract({
    address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
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
  
  console.log('=== RENT PRICE RESULT ===')
  console.log('Result:', result)
  console.log('Data:', result.data)
  console.log('Error:', result.error)
  console.log('Error message:', result.error?.message)
  console.log('==========================')
  
  return result
}

// Hook để đăng ký domain mới
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

  // Reset states khi commit thành công
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

  // Reset states khi register thành công hoặc thất bại
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
      
      console.log('=== TRANSACTION ERROR DETAILED ===')
      console.log('Error message:', errorMessage)
      console.log('Full error object:', registerError)
      console.log('Error name:', registerError?.name)
      console.log('Error stack:', registerError?.stack)
      console.log('==================================')
      
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



  // Bước 1: Tạo commitment
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
      console.log('=== FRONTEND COMMITMENT DEBUG ===')
      console.log('Input params:', { name, owner, duration, secret })
      
      // Tạo resolver data giống như NestJS
      const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')
      console.log('Resolver data created:', resolverData)

      // Sử dụng contract function để tạo commitment hash (giống backend)
      if (!publicClient) {
        throw new Error('Public client not available')
      }

      const commitmentHash = await publicClient.readContract({
        address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        abi: ETHRegistrarControllerABI.abi,
        functionName: 'makeCommitment',
        args: [
          name,
          owner as `0x${string}`,
          BigInt(60 * 60 * 24 * 30), // 30 ngày như NestJS
          keccak256(encodePacked(['string'], [secret])),
          ENS_CONTRACTS.PUBLIC_RESOLVER,
          resolverData,
          true, // Set reverseRecord to true
          0
        ]
      })
      
      console.log('=== COMMITMENT HASH COMPARISON ===')
      console.log('Contract-generated commitment hash:', commitmentHash)
      console.log('Commit params:', { 
        name, 
        owner, 
        duration: BigInt(60 * 60 * 24 * 30).toString(),
        secretHash: keccak256(encodePacked(['string'], [secret])),
        resolver: ENS_CONTRACTS.PUBLIC_RESOLVER,
        dataLength: resolverData.length,
        reverseRecord: true,
        fuses: 0
      })
      console.log('RPC URL:', process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC)
      console.log('Contract address:', ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER)

      setCommitmentHash(commitmentHash as string)
      
      // Gửi commitment transaction
      writeCommit({
        address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        abi: ETHRegistrarControllerABI.abi,
        functionName: 'commit',
        args: [commitmentHash],
        gas: BigInt(50000),
        account: account as `0x${string}`
      })
    } catch (err) {
      console.error('=== COMMITMENT ERROR ===')
      console.error('Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to make commitment'
       setError(errorMessage)
       setIsCommitting(false)
       addToast({ type: 'error', title: 'Commitment Error', message: errorMessage })
    }
  }, [writeCommit, isConnected, account, publicClient])

  // Bước 2: Đăng ký domain sau khi chờ 60 giây
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

    // Đảm bảo owner address khớp với account đã kết nối
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
      
      // Kiểm tra commitment age trước khi register
      if (publicClient && commitmentHash) {
        try {
          console.log('=== COMMITMENT AGE CHECK ===')
          console.log('Checking commitment hash:', commitmentHash)
          
          const commitmentTimestamp = await publicClient.readContract({
            address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETH_REGISTRAR_CONTROLLER_ABI,
            functionName: 'commitments',
            args: [commitmentHash as `0x${string}`]
          })
          
          const minCommitmentAge = await publicClient.readContract({
            address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'minCommitmentAge'
          }) as bigint
          
          const maxCommitmentAge = await publicClient.readContract({
            address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'maxCommitmentAge'
          }) as bigint
          
          const currentTime = BigInt(Math.floor(Date.now() / 1000))
          const commitmentAge = currentTime - commitmentTimestamp
          const validStart = commitmentTimestamp + minCommitmentAge
          const validEnd = commitmentTimestamp + maxCommitmentAge
          
          console.log('Commitment timing details:', {
            commitmentHash,
            commitmentTimestamp: commitmentTimestamp.toString(),
            currentTime: currentTime.toString(),
            commitmentAge: commitmentAge.toString(),
            minCommitmentAge: minCommitmentAge.toString(),
            maxCommitmentAge: maxCommitmentAge.toString(),
            validWindow: `${validStart.toString()} - ${validEnd.toString()}`,
            isReady: commitmentAge >= minCommitmentAge,
            isExpired: currentTime > validEnd,
            isValid: commitmentAge >= minCommitmentAge && currentTime <= validEnd
          })
          
          // Kiểm tra commitment có tồn tại không
          if (commitmentTimestamp === BigInt(0)) {
            throw new Error('Commitment not found or already used')
          }
          
          // Kiểm tra commitment có hết hạn không
          if (currentTime > validEnd) {
            throw new Error(`Commitment expired. Valid window: ${validStart} - ${validEnd}, current: ${currentTime}`)
          }
          
          // Đợi thêm 5 giây như NestJS để đảm bảo commitment đủ tuổi
          const requiredAge = minCommitmentAge + BigInt(5)
          if (commitmentAge < requiredAge) {
            const waitTime = Number(requiredAge - commitmentAge)
            console.log(`Đang đợi thời gian cam kết: ${waitTime} giây`)
            setError(`Đang đợi commitment đủ tuổi... ${waitTime} giây`)
            
            // Đợi tự động như NestJS
            await sleep(waitTime * 1000)
            console.log('Commitment đã đủ tuổi, tiếp tục register...')
          }
        } catch (error) {
          console.error('=== COMMITMENT AGE CHECK ERROR ===')
          console.error('Error:', error)
          throw new Error(`Commitment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        throw new Error('Public client or commitment hash not available')
      }
      
      // Sửa logic tính toán gas - không tính gas cost vào total cost
      // Chỉ tính rent price + buffer nhỏ cho gas
      const gasBuffer = price / BigInt(20) // 5% buffer cho gas
      const totalCost = price + gasBuffer
      
      // Gas limit cho register transaction - sử dụng gas estimate thực tế
      let finalGasLimit = BigInt(500000) // Default gas limit
      
      try {
        // Tạo resolver data giống như NestJS
        const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')

        // Thử estimate gas cho register transaction
        if (publicClient) {
          const estimatedGas = await publicClient.estimateContractGas({
            address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
            abi: ETHRegistrarControllerABI.abi,
            functionName: 'register',
            args: [
              name,
              owner as `0x${string}`,
              BigInt(60 * 60 * 24 * 30), // 30 ngày như NestJS
              secretHash,
              ENS_CONTRACTS.PUBLIC_RESOLVER,
              resolverData,
              true, // Set reverseRecord to true
              0
            ],
            value: price,
            account: account as `0x${string}`
          })
          finalGasLimit = (estimatedGas * BigInt(120)) / BigInt(100) // Thêm 20% như NestJS
          console.log('Gas estimation successful:', estimatedGas.toString())
        } else {
          console.log('Public client not available, using default gas limit')
        }
      } catch (gasError) {
        console.log('Gas estimation failed, using default:', gasError)
        // Sử dụng default gas limit nếu estimation thất bại
      }

      // Debug chi tiết với gas calculation mới
      console.log('=== DEBUG BALANCE CHECK ===')
      console.log('Skip Balance Check:', skipBalanceCheck)
      if (balance) {
        console.log('Balance:', {
          value: balance.value.toString(),
          formatted: (Number(balance.value) / 10 ** 18).toFixed(6) + ' HII'
        })
        console.log('Price:', {
          value: price.toString(),
          formatted: (Number(price) / 10 ** 18).toFixed(6) + ' HII'
        })
        console.log('Gas Calculation:', {
          finalGasLimit: finalGasLimit.toString(),
          gasBuffer: gasBuffer.toString(),
          formatted: (Number(gasBuffer) / 10 ** 18).toFixed(6) + ' HII'
        })
        console.log('Cost Calculation:', {
          rentPrice: (Number(price) / 10 ** 18).toFixed(6) + ' HII',
          gasBuffer: (Number(gasBuffer) / 10 ** 18).toFixed(6) + ' HII',
          totalCost: (Number(totalCost) / 10 ** 18).toFixed(6) + ' HII'
        })
        console.log('Balance Check:', {
          hasEnough: balance.value >= totalCost,
          difference: (Number(balance.value - totalCost) / 10 ** 18).toFixed(6) + ' HII'
        })
      } else {
        console.log('No balance data available')
      }
      console.log('==========================')

      console.log('Register params:', {
        name,
        owner,
        duration,
        secret,
        secretHash,
        price: price.toString(),
        balance: balance?.value.toString() || 'N/A',
        gasBuffer: gasBuffer.toString(),
        totalCost: totalCost.toString(),
        skipBalanceCheck,
        commitmentHash,
        contractAddress: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
        resolverAddress: ENS_CONTRACTS.PUBLIC_RESOLVER,
        rpcUrl: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC,
      })

      // Kiểm tra số dư trước khi thực hiện giao dịch (chỉ khi không bỏ qua)
      if (!skipBalanceCheck && balance && balance.value < totalCost) {
        const shortfall = totalCost - balance.value
        const shortfallFormatted = (Number(shortfall) / 10 ** 18).toFixed(6)
        const balanceFormatted = (Number(balance.value) / 10 ** 18).toFixed(6)
        const totalCostFormatted = (Number(totalCost) / 10 ** 18).toFixed(6)
        
        console.log('=== BALANCE CHECK FAILED ===')
        console.log('Balance value:', balance.value.toString())
        console.log('Total cost:', totalCost.toString())
        console.log('Comparison:', balance.value < totalCost)
        console.log('Balance < TotalCost:', balance.value < totalCost)
        console.log('Balance === TotalCost:', balance.value === totalCost)
        console.log('Balance > TotalCost:', balance.value > totalCost)
        console.log('============================')
        
        // Thử với skip balance check nếu balance gần đủ
        if (balance.value >= price) {
          console.log('=== TRYING WITH SKIP BALANCE CHECK ===')
          console.log('Balance is sufficient for rent price, trying with skip balance check')
          return registerDomain(name, owner, duration, secret, price, true)
        }
        
        setError(`Số dư không đủ. Số dư hiện tại: ${balanceFormatted} HII. Cần: ${totalCostFormatted} HII. Thiếu: ${shortfallFormatted} HII`)
        setIsRegistering(false)
        return
      }

      // Debug khi balance check pass
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
        // Tạo resolver data giống như NestJS
        const resolverData = await makeData(`${name}.hii`, owner, 'owner@example.com')

        console.log('=== REGISTER TRANSACTION DEBUG ===')
        console.log('Register params:', {
          name,
          owner,
          duration: BigInt(60 * 60 * 24 * 30).toString(),
          secretHash,
          resolver: ENS_CONTRACTS.PUBLIC_RESOLVER,
          dataLength: resolverData.length,
          reverseRecord: true,
          fuses: 0,
          value: price.toString(),
          gas: finalGasLimit.toString(),
          commitmentHash
        })

        writeRegister({
          address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
          abi: ETHRegistrarControllerABI.abi,
          functionName: 'register',
          args: [
            name,
            owner as `0x${string}`,
            BigInt(60 * 60 * 24 * 30), // 30 ngày như NestJS
            secretHash,
            ENS_CONTRACTS.PUBLIC_RESOLVER,
            resolverData as readonly `0x${string}`[],
            true, // Set reverseRecord to true
            0
          ],
          value: price, // Sử dụng giá gốc
          gas: finalGasLimit, // Sử dụng final gas limit
          account: account as `0x${string}` // Đảm bảo sử dụng đúng account
        })
        console.log('=== WRITE REGISTER CALLED SUCCESSFULLY ===')
      } catch (writeError) {
        console.log('=== WRITE REGISTER ERROR ===')
        console.log('Error:', writeError)
        console.log('Error message:', writeError instanceof Error ? writeError.message : 'Unknown error')
        console.log('==========================')
        setError(`Lỗi khi gửi giao dịch: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`)
        setIsRegistering(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register domain'
       setError(errorMessage)
       setIsRegistering(false)
       addToast({ type: 'error', title: 'Registration Error', message: errorMessage })
    }
  }, [writeRegister, commitmentHash, balance, isConnected, account]);

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

// Hook để gia hạn domain
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
        address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
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

// Hook để chuyển ownership domain
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
      // Tính toán node hash cho domain
      const node = namehash(`${domainName}.hii`)
      
      // Kiểm tra xem domain có được wrapped trong NameWrapper không
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
      
      // Kiểm tra owner từ ENS Registry
      const registryOwner = await publicClient.readContract({
        address: ENS_CONTRACTS.REGISTRY,
        abi: ENS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node]
      })
      
      console.log('Registry owner:', registryOwner)
      console.log('NameWrapper address:', ENS_CONTRACTS.NAME_WRAPPER)
      
      // Nếu owner là NameWrapper, kiểm tra BaseRegistrar ownership
      if (registryOwner.toLowerCase() === ENS_CONTRACTS.NAME_WRAPPER.toLowerCase()) {
        console.log('Domain is wrapped in NameWrapper, checking BaseRegistrar ownership')
        
        // Tính tokenId từ label hash
        const labelHash = keccak256(encodePacked(['string'], [domainName.split('.')[0]]))
        const tokenId = BigInt(labelHash)
        
        // Kiểm tra owner của token trong BaseRegistrar
        const baseRegistrarOwner = await publicClient.readContract({
          address: ENS_CONTRACTS.BASE_REGISTRAR_IMPLEMENTATION,
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
        
        console.log('BaseRegistrar token owner:', baseRegistrarOwner)
        console.log('Current user:', address)
        
        // Nếu BaseRegistrar owner là user, sử dụng BaseRegistrar transfer
        if (baseRegistrarOwner.toLowerCase() === address?.toLowerCase()) {
          console.log('Using BaseRegistrar transferFrom')
          
          writeContract({
            address: ENS_CONTRACTS.BASE_REGISTRAR_IMPLEMENTATION,
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
          console.log('Using NameWrapper setRecord')
          
          // Lấy resolver hiện tại
          const currentResolver = await publicClient.readContract({
            address: ENS_CONTRACTS.REGISTRY,
            abi: ENS_REGISTRY_ABI,
            functionName: 'resolver',
            args: [node]
          })
          
          // Lấy TTL hiện tại
          const currentTTL = await publicClient.readContract({
            address: ENS_CONTRACTS.REGISTRY,
            abi: ENS_REGISTRY_ABI,
            functionName: 'ttl',
            args: [node]
          })
          
          console.log('Current resolver:', currentResolver)
          console.log('Current TTL:', currentTTL)
          
          writeContract({
            address: ENS_CONTRACTS.NAME_WRAPPER,
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
        console.log('Domain is directly owned, using Registry transfer')
        
        writeContract({
          address: ENS_CONTRACTS.REGISTRY,
          abi: ENS_REGISTRY_ABI,
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

// Function để fetch domains trực tiếp từ blockchain
async function fetchDomainsFromBlockchain(ownerAddress: string): Promise<Domain[]> {
  try {
    console.log('=== FETCHING DOMAINS FROM BLOCKCHAIN ===')
    console.log('Owner address:', ownerAddress)
    
    // Import viem modules
    const { createPublicClient, http } = await import('viem')
    
    // Tạo public client để đọc từ blockchain
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
    
    // Lấy events NameRegistered từ ETHRegistrarController
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - BigInt(10000) // Lấy 10000 blocks gần nhất
    
    console.log('Fetching events from block:', fromBlock.toString(), 'to', currentBlock.toString())
    
    const filter = {
      address: ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER,
      topics: [
        keccak256(encodePacked(['string'], ['NameRegistered(string,bytes32,uint256)']))
      ],
      fromBlock,
      toBlock: currentBlock
    }
    
    const logs = await publicClient.getLogs(filter)
    console.log('Found', logs.length, 'NameRegistered events')
    
    // Xử lý từng event
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
          
          // Tạo domain node
          const domainName = `${name}.hii`
          const node = namehash(domainName)
          
          // Kiểm tra owner hiện tại
          const currentOwner = await publicClient.readContract({
            address: ENS_CONTRACTS.REGISTRY,
            abi: ENS_REGISTRY_ABI,
            functionName: 'owner',
            args: [node]
          })
          
          // Chỉ lấy domains thuộc về owner này
          console.log('Checking owner match:', {
            currentOwner: currentOwner,
            ownerAddress: ownerAddress,
            match: currentOwner.toLowerCase() === ownerAddress.toLowerCase()
          })
          
          if (currentOwner.toLowerCase() === ownerAddress.toLowerCase()) {
            // Sử dụng giá trị mặc định cho resolver và TTL
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
            console.log('Added domain:', domainName, 'Owner:', currentOwner)
          }
        }
      } catch (error) {
        console.log('Error processing event:', error)
        continue
      }
    }
    
    console.log('Total domains found from blockchain:', domains.length)
    return domains
    
  } catch (error) {
    console.error('Error fetching domains from blockchain:', error)
    return []
  }
}