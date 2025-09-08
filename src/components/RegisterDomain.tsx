'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

import { useViemRentPrice, useViemAvailability } from '@/hooks/useViemContract'
import { useRegisterDomain, useCommitmentTiming } from '@/hooks/useENS'

interface RegisterDomainProps {
  onSuccess: () => void
}

export default function RegisterDomain({ onSuccess }: RegisterDomainProps) {
  const { address, isConnected } = useAccount()

  const [domainName, setDomainName] = useState('')
  const [duration, setDuration] = useState(1)
  const [secret, setSecret] = useState('')
  const [step, setStep] = useState<'form' | 'commit' | 'wait' | 'register' | 'success'>('form')
  const [waitTime, setWaitTime] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  
  
  const { data: rentPrice, isLoading: isPriceLoading, formattedPrice } = useViemRentPrice(domainName, duration)
  const { data: isAvailable, isLoading: availabilityLoading, error: availabilityError } = useViemAvailability(domainName)
  const { minCommitmentAge, maxCommitmentAge, isLoading: timingLoading } = useCommitmentTiming()
  const { 
    makeCommitment, 
    registerDomain, 
    isCommitting, 
    isRegistering, 
    commitmentHash,
    error,
    commitHash,
    registerHash
  } = useRegisterDomain()

  // Tự động tạo secret cố định (giống NestJS)
  useEffect(() => {
    if (!secret) {
      console.log('secret not found')
      // Sử dụng secret cố định giống NestJS để đảm bảo consistency
      setSecret('fixed-secret-for-ens-registration')
    }
  }, [])

  // Đếm ngược 60 giây sau khi commit
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 'wait' && waitTime > 0) {
      interval = setInterval(() => {
        setWaitTime(prev => {
          if (prev <= 1) {
            setStep('register')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, waitTime])

  // Theo dõi trạng thái commit transaction
  useEffect(() => {
    if (commitHash && step === 'commit') {
      setStep('wait')
      // Sử dụng thời gian thực tế từ contract
      if (minCommitmentAge) {
        const waitTimeSeconds = Number(minCommitmentAge) + 5 // Thêm 5 giây buffer
        setWaitTime(waitTimeSeconds)
        console.log('Set wait time to:', waitTimeSeconds, 'seconds (minCommitmentAge:', Number(minCommitmentAge), ')')
      } else {
        setWaitTime(60) // Fallback 60 giây
        console.log('Using fallback wait time: 60 seconds')
      }
    }
  }, [commitHash, step, minCommitmentAge])

  // Theo dõi trạng thái register transaction - chỉ reset khi transaction thành công
  useEffect(() => {
    if (registerHash && !isRegistering) {
      // Hiển thị thông báo thành công
      setSuccessMessage(`Domain ${domainName}.hii đã được đăng ký thành công!`)
      setStep('success')
      
      // Chờ 3 giây rồi gọi onSuccess để refresh danh sách và reset form
      setTimeout(() => {
        console.log('Calling onSuccess to refresh domain list...')
        onSuccess() // Gọi để refresh danh sách domain
        
        // Chờ thêm 2 giây nữa để đảm bảo domain list được refresh
        setTimeout(() => {
          // Reset form
          setDomainName('')
          setDuration(1)
          setSecret('fixed-secret-for-ens-registration')
          setStep('form')
          setSuccessMessage('')
        }, 2000)
      }, 3000) // Tăng lên 3 giây để user có thể đọc thông báo
    }
  }, [registerHash, isRegistering, onSuccess, domainName])

  const handleCommit = async () => {
    if (!address || !domainName || !secret) return
    
    setStep('commit')
    await makeCommitment(domainName, address, duration, secret)
  }

  const handleRegister = async () => {
    if (!address || !domainName || !secret || !rentPrice) return
    
    // Calculate total price from rentPrice object
    const totalPrice = rentPrice.base + rentPrice.premium
    await registerDomain(domainName, address, duration, secret, totalPrice)
  }

  const isFormValid = domainName.length >= 3 && duration >= 1 && address && isConnected

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Đăng ký Domain mới
      </h2>

      <div className="max-w-md mx-auto">
        {/* Wallet Connection Check */}
        {!isConnected && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Cần kết nối ví</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Vui lòng kết nối ví MetaMask để đăng ký domain.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Progress Steps - Only show when wallet is connected */}
        {isConnected && (
          <div className="mb-8">
            <div className="flex items-center">
              {[
                { id: 'form', label: 'Thông tin', active: step === 'form' },
                { id: 'commit', label: 'Commit', active: step === 'commit' || step === 'wait' },
                { id: 'register', label: 'Đăng ký', active: step === 'register' },
                { id: 'success', label: 'Hoàn thành', active: step === 'success' },
              ].map((stepItem, index) => (
                <div key={stepItem.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    stepItem.active 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className={`ml-2 text-sm font-medium ${
                    stepItem.active ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {stepItem.label}
                  </div>
                  {index < 3 && (
                    <div className="w-8 h-px bg-gray-300 mx-4"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form - Only show when wallet is connected */}
        {isConnected && step === 'form' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                Tên Domain (không bao gồm .hii)
              </label>
              <input
                type="text"
                id="domain"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="mydomain"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {domainName && (
                <p className="mt-1 text-sm text-gray-600">
                  Domain đầy đủ: <span className="font-mono">{domainName}.hii</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian đăng ký (năm)
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5].map(year => (
                  <option key={year} value={year}>{year} năm</option>
                ))}
              </select>
            </div>

            {/* Price Display */}
            {domainName && duration && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Giá đăng ký:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {isPriceLoading ? (
                      <span className="animate-pulse">Đang tính...</span>
                    ) : formattedPrice ? (
                      `${formattedPrice} HII`
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleCommit}
              disabled={!isFormValid || isPriceLoading || isCommitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {isCommitting ? 'Đang commit...' : 'Bắt đầu đăng ký'}
            </button>
          </div>
        )}

        {/* Commit Step */}
        {isConnected && step === 'commit' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Đang commit...</h3>
            <p className="text-sm text-gray-600">
              Vui lòng xác nhận transaction trong MetaMask
            </p>
          </div>
        )}

        {/* Wait Step */}
        {isConnected && step === 'wait' && (
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-primary-600 mb-4">
              {waitTime}s
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Đang chờ...</h3>
            <p className="text-sm text-gray-600 mb-2">
              Cần chờ {minCommitmentAge ? Number(minCommitmentAge) : 60} giây sau khi commit trước khi có thể đăng ký domain
            </p>
            {minCommitmentAge && maxCommitmentAge && (
              <div className="text-xs text-gray-500">
                <p>Min commitment age: {Number(minCommitmentAge)}s</p>
                <p>Max commitment age: {Number(maxCommitmentAge)}s</p>
                <p>Valid window: {Number(minCommitmentAge)}s - {Number(maxCommitmentAge)}s</p>
              </div>
            )}
          </div>
        )}

        {/* Register Step */}
        {isConnected && step === 'register' && (
          <div className="text-center py-8">
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-green-900 mb-2">Sẵn sàng đăng ký!</h3>
              <p className="text-sm text-green-700 mb-4">
                Domain <span className="font-mono">{domainName}.hii</span> đã sẵn sàng để đăng ký
              </p>
              <div className="text-sm text-green-700">
                <p>Giá: {formattedPrice ? formattedPrice : '0'} HII</p>
                <p>Thời gian: {duration} năm</p>
              </div>
            </div>
            
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {isRegistering ? 'Đang đăng ký...' : 'Xác nhận đăng ký'}
            </button>
          </div>
        )}

        {/* Success Step */}
        {isConnected && step === 'success' && (
          <div className="text-center py-8">
            <div className="bg-green-50 rounded-lg p-8 mb-6">
              <div className="flex justify-center mb-4">
                <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">Đăng ký thành công!</h3>
              <p className="text-lg text-green-700 mb-4">
                {successMessage}
              </p>
              <div className="text-sm text-green-600 mb-4">
                <p>Transaction hash: <span className="font-mono text-xs">{registerHash}</span></p>
                <p className="mt-2">Danh sách domain sẽ được cập nhật trong giây lát...</p>
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    console.log('Manual refresh domain list...')
                    onSuccess()
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Làm mới danh sách
                </button>
                <button
                  onClick={() => {
                    // Reset form ngay lập tức
                    setDomainName('')
                    setDuration(1)
                    setSecret('fixed-secret-for-ens-registration')
                    setStep('form')
                    setSuccessMessage('')
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Đăng ký domain khác
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}