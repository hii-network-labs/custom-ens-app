'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

import { useViemRentPrice, useViemAvailability } from '@/hooks/useViemContract'
import { useRegisterDomain, useCommitmentTiming } from '@/hooks/useENS'
import LoadingState, { InlineLoader } from './LoadingState'

interface RegisterDomainProps {
  onSuccess: () => void
  onNavigateToDomains?: () => void
}

export default function RegisterDomain({ onSuccess, onNavigateToDomains }: RegisterDomainProps) {
  const { address, isConnected } = useAccount()

  const [domainName, setDomainName] = useState('')
  const [duration, setDuration] = useState(1)
  const [secret, setSecret] = useState('')
  const [step, setStep] = useState<'form' | 'commit' | 'wait' | 'register' | 'success'>('form')
  const [waitTime, setWaitTime] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  
  
  const { data: rentPrice, isLoading: isPriceLoading, formattedPrice } = useViemRentPrice(domainName, duration)
  const { data: isAvailable, isLoading: availabilityLoading, error: availabilityError } = useViemAvailability(domainName)
  const { minAge: minCommitmentAge, maxAge: maxCommitmentAge, isLoading: timingLoading } = useCommitmentTiming()
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

  // Automatically create fixed secret (similar to NestJS)
  useEffect(() => {
    if (!secret) {
      console.log('secret not found')
      // Use fixed secret similar to NestJS to ensure consistency
      setSecret('fixed-secret-for-ens-registration')
    }
  }, [])

  // Countdown 60 seconds after commit
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

  // Monitor commit transaction status
  useEffect(() => {
    if (commitHash && step === 'commit') {
      setStep('wait')
      // Use actual time from contract
      if (minCommitmentAge) {
        const waitTimeSeconds = Number(minCommitmentAge) + 5 // Add 5 seconds buffer
        setWaitTime(waitTimeSeconds)
        console.log('Set wait time to:', waitTimeSeconds, 'seconds (minCommitmentAge:', Number(minCommitmentAge), ')')
      } else {
        setWaitTime(60) // Fallback 60 seconds
        console.log('Using fallback wait time: 60 seconds')
      }
    }
  }, [commitHash, step, minCommitmentAge])

  // Monitor register transaction status - only reset when transaction succeeds
  useEffect(() => {
    if (registerHash && !isRegistering) {
      // Show success message with full domain name
      setSuccessMessage(`Domain ${domainName}.hii has been registered successfully!`)
      setStep('success')
      
      // Only call onSuccess to refresh list, don't auto-reset form
      console.log('Calling onSuccess to refresh domain list...')
      onSuccess() // Call to refresh domain list
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
        Register New Domain
      </h2>

      <div className="max-w-md mx-auto">
        {/* Wallet Connection Check */}
        {!isConnected && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Wallet Connection Required</h3>
            <p className="text-gray-600">Please connect your wallet to register a domain.</p>
          </div>
        )}
        {/* Progress Steps - Only show when wallet is connected */}
        {isConnected && (
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {[
                { id: 'form', label: 'Enter Domain', sublabel: 'Choose your name', active: step === 'form', completed: ['commit', 'wait', 'register', 'success'].includes(step) },
                { id: 'commit', label: 'Commit', sublabel: 'Secure registration', active: step === 'commit' || step === 'wait', completed: ['register', 'success'].includes(step) },
                { id: 'register', label: 'Register', sublabel: 'Complete purchase', active: step === 'register', completed: step === 'success' },
              ].map((stepItem, index) => (
                <div key={stepItem.id} className="flex items-center">
                  <div className={`flex items-center transition-all duration-300 ${
                    stepItem.active || stepItem.completed ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 ${
                      stepItem.active || stepItem.completed
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white transform scale-110' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {stepItem.completed ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold">{stepItem.label}</div>
                      <div className="text-xs opacity-75">{stepItem.sublabel}</div>
                    </div>
                  </div>
                  {index < 2 && (
                    <div className={`flex-1 h-2 mx-6 rounded-full transition-all duration-500 ${
                      stepItem.completed ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form - Only show when wallet is connected */}
        {isConnected && step === 'form' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Register Your HNS Domain
              </h2>
              <p className="text-gray-600 text-lg">
                Choose a unique name for your Web3 identity
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <label htmlFor="domain" className="block text-lg font-semibold text-gray-900 mb-4">
                Domain Name
              </label>
              <div className="relative">
                <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:border-blue-300 focus-within:border-blue-500 transition-all duration-200">
                  <input
                    type="text"
                    id="domain"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    className="flex-1 px-6 py-4 text-xl font-medium bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
                    placeholder="yourname"
                  />
                  <div className="px-6 py-4 text-xl font-bold text-gray-500 border-l border-gray-200">
                    .hii
                  </div>
                </div>
                {domainName && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Your ENS Domain</p>
                        <p className="text-lg font-bold text-blue-700">{domainName}.hii</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <label htmlFor="duration" className="block text-lg font-semibold text-gray-900 mb-4">
                Registration Period
              </label>
              <div className="flex flex-col items-center space-y-4">
                {/* Direct Number Input */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl px-4 sm:px-8 py-4 sm:py-6 min-w-[200px] sm:min-w-[250px] text-center">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={duration}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (!isNaN(value) && value >= 1 && value <= 10) {
                        setDuration(value)
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value)
                      if (isNaN(value) || value < 1) {
                        setDuration(1)
                      } else if (value > 10) {
                        setDuration(10)
                      }
                    }}
                    className="w-full text-3xl sm:text-4xl font-bold text-blue-700 bg-transparent text-center border-none outline-none mb-1 sm:mb-2"
                  />
                  <div className="text-base sm:text-lg font-medium text-blue-600">{duration === 1 ? 'Year' : 'Years'}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">Registration Period (1-10 years)</div>
                </div>
              </div>

              {/* Quick Selection Buttons */}
              <div className="mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 sm:mb-3 text-center">Quick Selection:</p>
                <div className="flex justify-center space-x-1 sm:space-x-2">
                  {[1, 2, 3, 5, 10].map(year => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setDuration(year)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        duration === year
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                      }`}
                    >
                      {year}y
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Availability and Price Display */}
            {domainName && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isAvailable === true ? 'bg-green-500 animate-pulse' : 
                          isAvailable === false ? 'bg-red-500' : 'bg-gray-400 animate-spin'
                        }`} />
                        <span className="text-lg font-semibold text-gray-900">Availability:</span>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                        isAvailable === true ? 'bg-green-100 text-green-800' : 
                        isAvailable === false ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {availabilityLoading ? 'Checking...' :
                         isAvailable === true ? '✓ Available' : 
                         isAvailable === false ? '✗ Unavailable' : 'Unknown'}
                      </div>
                    </div>
                    
                    {duration && (isAvailable || isPriceLoading || formattedPrice) && (
                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-200">
                        <div className="flex items-center justify-between flex-col sm:flex-row space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-gray-600">Registration Cost</p>
                              <p className="text-xs sm:text-sm text-gray-500">{duration} {duration === 1 ? 'year' : 'years'}</p>
                            </div>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">
                              {isPriceLoading ? (
                                <span className="animate-pulse text-base sm:text-lg">Calculating...</span>
                              ) : formattedPrice ? (
                                `${parseFloat(formattedPrice).toFixed(6)} HII`
                              ) : (
                                'N/A'
                              )}
                            </p>
                            {formattedPrice && (
                              <p className="text-xs sm:text-sm text-gray-500">≈ ${(parseFloat(formattedPrice) * 0.1).toFixed(2)} USD</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleCommit}
                disabled={!isFormValid || isPriceLoading || isCommitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center space-x-3"
              >
                {isCommitting ? (
                    <>
                      <InlineLoader size="md" className="text-white" />
                      <span>Processing Commitment...</span>
                    </>
                  ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
                    </svg>
                    <span>Start Registration</span>
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">
                This will start a 2-step registration process to secure your domain
              </p>
            </div>
          </div>
        )}

        {/* Commit Step */}
        {isConnected && step === 'commit' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Committing...</h3>
                <p className="text-gray-600">
                  Please confirm the transaction in MetaMask
            </p>
          </div>
        )}

        {/* Wait Step */}
        {isConnected && step === 'wait' && (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-8 shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-amber-900 mb-4">
                  Commitment Period
                </h3>
                <p className="text-xl text-amber-800 mb-8">
                  Please wait {waitTime} seconds before you can complete the registration.
                </p>
                <div className="relative">
                  <div className="w-full bg-amber-200 rounded-full h-4 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-4 rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${Math.max(0, Math.min(100, ((60 - waitTime) / 60) * 100))}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-900">
                      {Math.max(0, Math.min(100, Math.round(((60 - waitTime) / 60) * 100)))}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-amber-700 mt-6">
                  This waiting period helps prevent front-running attacks and ensures fair registration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Register Step */}
        {isConnected && step === 'register' && (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-green-900 mb-4">
                  Ready to Register
                </h3>
                <p className="text-lg text-green-800 mb-8">
                  Complete your domain registration now
                </p>
                
                <div className="bg-white rounded-2xl p-6 border border-green-200 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600 font-medium flex-shrink-0">Domain:</span>
                      <span className="text-xl font-bold text-gray-900 truncate text-right">{domainName}.hii</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600 font-medium flex-shrink-0">Duration:</span>
                      <span className="text-lg font-semibold text-gray-900 text-right">{duration} {duration === 1 ? 'year' : 'years'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600 font-medium flex-shrink-0">Total Cost:</span>
                      <div className="text-right min-w-0 flex-1">
                        <span className="text-2xl font-bold text-green-700 font-mono">{formattedPrice ? parseFloat(formattedPrice).toFixed(6) : 'N/A'} HII</span>
                        {formattedPrice && (
                          <div className="text-xs text-gray-500 mt-1">≈ ${(parseFloat(formattedPrice) * 0.1).toFixed(2)} USD</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center space-x-3"
                >
                  {isRegistering ? (
                    <>
                      <InlineLoader size="md" className="text-white" />
                      <span>Registering Domain...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-green-700 mt-4">
                  This transaction will finalize your domain ownership
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {isConnected && step === 'success' && (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 animate-pulse" />
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-6xl mb-6">🎉</div>
                  <h3 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                    Registration Successful!
                  </h3>
                  <p className="text-xl text-green-800 mb-8">
                    Congratulations! Your ENS domain is now registered.
                  </p>
                  <div className="bg-white rounded-2xl p-6 border border-green-200 mb-8">
                    <p className="text-lg text-gray-700">
                      {successMessage}
                    </p>
                    <div className="text-sm text-green-600 mt-4">
                      <p>Transaction hash:</p>
                      <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded mt-1">{registerHash}</p>
                      <p className="mt-2">Domain list will be updated shortly...</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => {
                        // Reset form completely
                        setDomainName('')
                        setDuration(1)
                        setSecret('fixed-secret-for-ens-registration')
                        setStep('form')
                        setSuccessMessage('')
                        setWaitTime(0)
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg"
                    >
                      Register Another Domain
                    </button>
                    <button
                      onClick={() => {
                        console.log('Navigating to domains tab...')
                        onSuccess() // Refresh domain list
                        onNavigateToDomains?.() // Navigate to domains tab
                      }}
                      className="px-6 py-3 bg-white border-2 border-green-500 text-green-700 hover:bg-green-50 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg"
                    >
                      View My Domains
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        <LoadingState
          error={error}
          retryAction={() => {
            // Reset form to initial state
            setDomainName('')
            setDuration(1)
            setSecret('fixed-secret-for-ens-registration')
            setStep('form')
            setSuccessMessage('')
          }}
        >
          {null}
        </LoadingState>
      </div>
    </div>
  )
}