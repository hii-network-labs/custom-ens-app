'use client'

import React, { useState, useEffect } from 'react'
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
  
  const { transferDomain, loading, error, isSuccess, resetTransferState } = useTransferDomain()

  const handleTransfer = async () => {
    if (!selectedDomain || !newOwner || !confirmTransfer) return
    
    const domainName = selectedDomain.replace('.hii', '')
    
    try {
      await transferDomain(domainName, newOwner)
      onSuccess()
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  // Reset form when transaction is successful
  useEffect(() => {
    if (isSuccess) {
      setSelectedDomain('')
      setNewOwner('')
      setConfirmTransfer(false)
    }
  }, [isSuccess])

  // Show success message
  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Transfer Successful!</h3>
          <p className="text-sm text-gray-500 mb-4">
            The domain has been successfully transferred to the new owner.
          </p>
          <button
            onClick={() => {
              // Reset the transaction state and form
              resetTransferState()
              setSelectedDomain('')
              setNewOwner('')
              setConfirmTransfer(false)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Transfer Another Domain
          </button>
        </div>
      </div>
    )
  }

  const selectedDomainData = domains.find(d => d.name === selectedDomain)
  const isValidAddress = newOwner ? isAddress(newOwner) : false
  const isFormValid = selectedDomain && isValidAddress && confirmTransfer

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Transfer Domain
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        {domains.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">You don't have any domains to transfer.</p>
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
                  <div>
                    <span className="font-medium">Current Owner:</span>
                    <span className="ml-2 font-mono text-xs">
                      {selectedDomainData.owner.id}
                    </span>
                  </div>
                  {selectedDomainData.expiryDate && (
                    <div>
                      <span className="font-medium">Expires:</span>
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
                New Wallet Address
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
                  Invalid wallet address
                </p>
              )}
              {newOwner && isValidAddress && (
                <p className="mt-1 text-sm text-green-600">
                  Valid wallet address
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
                    <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You are about to transfer domain <strong>{selectedDomain}</strong> to address:
                  </p>
                  <p className="font-mono text-xs mt-1 break-all">
                    {newOwner}
                  </p>
                  <p className="mt-2">
                    <strong>This action cannot be undone!</strong> Make sure the destination wallet address is correct.
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
                I understand that this action cannot be undone and confirm the domain transfer
              </label>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!isFormValid || loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Transferring...' : 'Transfer Domain'}
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
                <h3 className="text-sm font-medium text-red-800">Transfer Error</h3>
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