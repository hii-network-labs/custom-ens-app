'use client'

import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import { useRentPrice, useRenewDomain } from '@/hooks/useENS'
import { Domain } from '@/lib/graphql'

interface RenewDomainProps {
  domains: Domain[]
  onSuccess: () => void
  onNavigateToDomains: () => void
}

export default function RenewDomain({ domains, onSuccess, onNavigateToDomains }: RenewDomainProps) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [duration, setDuration] = useState(1)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [successMessage, setSuccessMessage] = useState('')
  
  const domainName = selectedDomain ? selectedDomain.replace('.hii', '') : ''
  const { data: rentPrice, isLoading: isPriceLoading } = useRentPrice(domainName, duration)
  const { renewDomain, loading, error, hash, isSuccess } = useRenewDomain()

  // Handle transaction success
  useEffect(() => {
    if (hash && isSuccess) {
      setSuccessMessage(`Domain ${selectedDomain} has been renewed successfully for ${duration} year${duration > 1 ? 's' : ''}!`)
      setStep('success')
      onSuccess() // Refresh domain list
    }
  }, [hash, isSuccess, selectedDomain, duration, onSuccess])

  const handleRenew = async () => {
    if (!selectedDomain || !rentPrice) return
    
    try {
      // Calculate total price from rentPrice object
      const totalPrice = rentPrice.base + rentPrice.premium
      await renewDomain(domainName, duration, totalPrice)
      // Don't reset form here - wait for transaction success
    } catch (err) {
      console.error('Renew failed:', err)
    }
  }

  const selectedDomainData = domains.find(d => d.name === selectedDomain)
  const isExpired = selectedDomainData?.expiryDate && 
    parseInt(selectedDomainData.expiryDate) * 1000 < Date.now()

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Renew Domain
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        {step === 'success' ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Renewal Successful!</h3>
              <p className="text-gray-600 mb-4">{successMessage}</p>
              {hash && (
                <div className="text-sm text-green-600 mt-4">
                  <p>Transaction hash:</p>
                  <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded mt-1">{hash}</p>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedDomain('')
                  setDuration(1)
                  setStep('form')
                  setSuccessMessage('')
                }}
                className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Renew Another Domain
              </button>
              <button
                onClick={onNavigateToDomains}
                className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"
              >
                View My Domains
              </button>
            </div>
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">You don&apos;t have any domains to renew.</p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="domain-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Domain
              </label>
              <select
                id="domain-select"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select domain --</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.name}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDomainData && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Domain Information</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Name:</span>
                    <span className="ml-2">{selectedDomainData.name}</span>
                  </div>
                  {selectedDomainData.expiryDate && (
                    <div>
                      <span className="font-medium">Expires:</span>
                      <span className={`ml-2 ${
                        isExpired ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        {new Date(parseInt(selectedDomainData.expiryDate) * 1000).toLocaleDateString('vi-VN')}
                      </span>
                      {isExpired && (
                        <span className="ml-2 text-red-600 text-xs">(Expired)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Renewal Period (years)
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5].map(year => (
                  <option key={year} value={year}>{year} year{year > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {selectedDomain && duration && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Renewal Price:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {isPriceLoading ? (
                      <span className="animate-pulse">Calculating...</span>
                    ) : rentPrice ? (
                      `${formatEther(rentPrice.base + rentPrice.premium)} HII`
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                {selectedDomainData?.expiryDate && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">New Expiry:</span>
                    <span className="ml-2">
                      {new Date(
                        (parseInt(selectedDomainData.expiryDate) + duration * 365 * 24 * 60 * 60) * 1000
                      ).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleRenew}
              disabled={!selectedDomain || !rentPrice || loading || isPriceLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Renewing...' : 'Renew Domain'}
            </button>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Renewal Error</h3>
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