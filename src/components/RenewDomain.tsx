'use client'

import { useState } from 'react'
import { formatEther } from 'viem'
import { useRentPrice, useRenewDomain } from '@/hooks/useENS'
import { Domain } from '@/lib/graphql'

interface RenewDomainProps {
  domains: Domain[]
  onSuccess: () => void
}

export default function RenewDomain({ domains, onSuccess }: RenewDomainProps) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [duration, setDuration] = useState(1)
  
  const domainName = selectedDomain ? selectedDomain.replace('.hii', '') : ''
  const { data: rentPrice, isLoading: isPriceLoading } = useRentPrice(domainName, duration)
  const { renewDomain, loading, error } = useRenewDomain()

  const handleRenew = async () => {
    if (!selectedDomain || !rentPrice) return
    
    try {
      // Calculate total price from rentPrice object
      const totalPrice = rentPrice.base + rentPrice.premium
      await renewDomain(domainName, duration, totalPrice)
      onSuccess()
      // Reset form
      setSelectedDomain('')
      setDuration(1)
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
        Gia hạn Domain
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        {domains.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Bạn chưa có domain nào để gia hạn.</p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="domain-select" className="block text-sm font-medium text-gray-700 mb-2">
                Chọn Domain
              </label>
              <select
                id="domain-select"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Chọn domain --</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.name}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDomainData && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Thông tin Domain</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Tên:</span>
                    <span className="ml-2">{selectedDomainData.name}</span>
                  </div>
                  {selectedDomainData.expiryDate && (
                    <div>
                      <span className="font-medium">Hết hạn:</span>
                      <span className={`ml-2 ${
                        isExpired ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        {new Date(parseInt(selectedDomainData.expiryDate) * 1000).toLocaleDateString('vi-VN')}
                      </span>
                      {isExpired && (
                        <span className="ml-2 text-red-600 text-xs">(Đã hết hạn)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian gia hạn (năm)
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

            {selectedDomain && duration && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Giá gia hạn:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {isPriceLoading ? (
                      <span className="animate-pulse">Đang tính...</span>
                    ) : rentPrice ? (
                      `${formatEther(rentPrice.base + rentPrice.premium)} HII`
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                {selectedDomainData?.expiryDate && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Hết hạn mới:</span>
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
              {loading ? 'Đang gia hạn...' : 'Gia hạn Domain'}
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
                <h3 className="text-sm font-medium text-red-800">Lỗi gia hạn</h3>
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