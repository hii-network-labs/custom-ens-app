'use client'

import { useState } from 'react'
import { isAddress } from 'viem'
import { useTransferDomain } from '@/hooks/useENS'
import { Domain } from '@/lib/graphql'

interface TransferDomainProps {
  domains: Domain[]
  onSuccess: () => void
}

export default function TransferDomain({ domains, onSuccess }: TransferDomainProps) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [confirmTransfer, setConfirmTransfer] = useState(false)
  
  const { transferDomain, loading, error } = useTransferDomain()

  const handleTransfer = async () => {
    if (!selectedDomain || !newOwner || !confirmTransfer) return
    
    const domainName = selectedDomain.replace('.hii', '')
    
    try {
      await transferDomain(domainName, newOwner)
      onSuccess()
      // Reset form
      setSelectedDomain('')
      setNewOwner('')
      setConfirmTransfer(false)
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  const selectedDomainData = domains.find(d => d.name === selectedDomain)
  const isValidAddress = newOwner ? isAddress(newOwner) : false
  const isFormValid = selectedDomain && isValidAddress && confirmTransfer

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Chuyển nhượng Domain
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        {domains.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Bạn chưa có domain nào để chuyển nhượng.</p>
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
                  <div>
                    <span className="font-medium">Owner hiện tại:</span>
                    <span className="ml-2 font-mono text-xs">
                      {selectedDomainData.owner.id}
                    </span>
                  </div>
                  {selectedDomainData.expiryDate && (
                    <div>
                      <span className="font-medium">Hết hạn:</span>
                      <span className="ml-2">
                        {new Date(parseInt(selectedDomainData.expiryDate) * 1000).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="new-owner" className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ ví mới
              </label>
              <input
                type="text"
                id="new-owner"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  newOwner && !isValidAddress 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
              />
              {newOwner && !isValidAddress && (
                <p className="mt-1 text-sm text-red-600">
                  Địa chỉ ví không hợp lệ
                </p>
              )}
              {newOwner && isValidAddress && (
                <p className="mt-1 text-sm text-green-600">
                  Địa chỉ ví hợp lệ
                </p>
              )}
            </div>

            {selectedDomain && isValidAddress && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Cảnh báo</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Bạn sắp chuyển domain <strong>{selectedDomain}</strong> cho địa chỉ:
                      </p>
                      <p className="font-mono text-xs mt-1 break-all">{newOwner}</p>
                      <p className="mt-2">
                        <strong>Hành động này không thể hoàn tác!</strong> Hãy chắc chắn địa chỉ ví đích là chính xác.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="confirm-transfer"
                type="checkbox"
                checked={confirmTransfer}
                onChange={(e) => setConfirmTransfer(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="confirm-transfer" className="ml-2 block text-sm text-gray-900">
                Tôi hiểu rằng hành động này không thể hoàn tác và xác nhận chuyển nhượng domain
              </label>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!isFormValid || loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Đang chuyển nhượng...' : 'Chuyển nhượng Domain'}
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
                <h3 className="text-sm font-medium text-red-800">Lỗi chuyển nhượng</h3>
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