'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { useUserDomains } from '@/hooks/useENS'
import DomainList from './DomainList'
import RegisterDomain from './RegisterDomain'
import RenewDomain from './RenewDomain'
import TransferDomain from './TransferDomain'

type TabType = 'domains' | 'register' | 'renew' | 'transfer'

export default function ENSApp() {
  const [activeTab, setActiveTab] = useState<TabType>('domains')
  const [isClient, setIsClient] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { domains, loading, error, refetch } = useUserDomains()

  // Ensure component only renders on client side to prevent hydration errors
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Tự động fetch domains khi kết nối ví
  useEffect(() => {
    if (isConnected && address) {
      refetch()
    }
  }, [isConnected, address, refetch])

  // Kết nối MetaMask
  const handleConnect = () => {
    connect({ connector: metaMask() })
  }

  // Ngắt kết nối ví
  const handleDisconnect = () => {
    disconnect()
  }

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                ENS Manager - Hii Network
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Kết nối:</span>
                    <span className="ml-2 font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Ngắt kết nối
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Kết nối MetaMask
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Chào mừng đến với ENS Manager
                </h2>
                <p className="text-gray-600 mb-6">
                  Kết nối ví MetaMask của bạn để bắt đầu quản lý ENS domains trên Hii Network.
                </p>
                <button
                  onClick={handleConnect}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
                >
                  Kết nối MetaMask
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'domains', label: 'Domains của tôi', count: domains.length },
                  { id: 'register', label: 'Đăng ký mới' },
                  { id: 'renew', label: 'Gia hạn' },
                  { id: 'transfer', label: 'Chuyển nhượng' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm">
              {activeTab === 'domains' && (
                <DomainList 
                  domains={domains} 
                  loading={loading} 
                  error={error} 
                  onRefresh={refetch}
                />
              )}
              {activeTab === 'register' && <RegisterDomain onSuccess={refetch} />}
              {activeTab === 'renew' && <RenewDomain domains={domains} onSuccess={refetch} />}
              {activeTab === 'transfer' && <TransferDomain domains={domains} onSuccess={refetch} />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}