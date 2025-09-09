'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { useUserDomains } from '@/hooks/useENS'
import DomainList from './DomainList'
import RegisterDomain from './RegisterDomain'
import RenewDomain from './RenewDomain'
import TransferDomain from './TransferDomain'

import ErrorBoundary from './ErrorBoundary'
import LoadingState, { InlineLoader } from './LoadingState'

type TabType = 'domains' | 'register' | 'renew' | 'transfer'

export default function HNSApp() {
  const [activeTab, setActiveTab] = useState<TabType>('domains')
  const [isClient, setIsClient] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { domains, loading, error, refetch } = useUserDomains()

  // Ensure component only renders on client side to prevent hydration errors
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Automatically fetch domains when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      refetch()
    }
  }, [isConnected, address, refetch])

  // Connect MetaMask
  const handleConnect = () => {
    connect({ connector: metaMask() })
  }

  // Disconnect wallet
  const handleDisconnect = () => {
    disconnect()
  }

  // Show loading state during hydration
  if (!isClient) {
    return (
      <LoadingState 
        loading={true} 
        loadingComponent={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading ENS App...</h3>
              <p className="text-gray-600">Initializing your decentralized identity platform</p>
            </div>
          </div>
        }
      >
        {null}
      </LoadingState>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  HNS Manager
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Hii Network</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="text-xs sm:text-sm">
                        <span className="text-gray-600 hidden sm:inline">Connected:</span>
                        <span className="ml-0 sm:ml-2 font-mono text-gray-900 font-medium">
                          {address?.slice(0, 4)}...{address?.slice(-3)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
                  >
                    <span className="hidden sm:inline">Disconnect</span>
                    <span className="sm:hidden">✕</span>
                  </button>
                </div>
              ) : (
                <button
                    onClick={handleConnect}
                    disabled={isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center space-x-2"
                  >
                    {isPending ? (
                      <InlineLoader size="md" className="text-white" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
                  </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  Your Web3 Identity
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Connect your wallet to start managing HNS domains on Hii Network. 
                  <br className="hidden sm:block" />
                  One name for all your crypto addresses.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={handleConnect}
                    disabled={isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center space-x-3"
                  >
                    {isPending ? (
                      <InlineLoader size="md" className="text-white" />
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
                  </button>
                  <p className="text-sm text-gray-500">
                    Supported wallets: MetaMask, WalletConnect, and more
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Navigation Tabs */}
            <div className="mb-8 sm:mb-12">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 shadow-lg flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto sm:inline-flex">
                {[
                  { id: 'domains', label: 'My Domains', count: domains.length, icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                  { id: 'register', label: 'Register New', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                  { id: 'renew', label: 'Renew', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
                  { id: 'transfer', label: 'Transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center space-x-1 sm:space-x-2 flex-1 sm:flex-none justify-center sm:justify-start ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id === 'domains' ? 'Domains' : tab.id === 'register' ? 'Register' : tab.id === 'renew' ? 'Renew' : 'Transfer'}</span>
                    {tab.count !== undefined && (
                      <span className={`py-0.5 px-2.5 rounded-full text-xs font-medium ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200/50 p-4 sm:p-8">
              {activeTab === 'domains' && (
                <DomainList 
                  domains={domains} 
                  loading={loading} 
                  error={error} 
                  onRefresh={refetch}
                />
              )}
              {activeTab === 'register' && <RegisterDomain onSuccess={refetch} onNavigateToDomains={() => setActiveTab('domains')} />}
              {activeTab === 'renew' && <RenewDomain domains={domains} onSuccess={refetch} onNavigateToDomains={() => setActiveTab('domains')} />}
              {activeTab === 'transfer' && <TransferDomain domains={domains} onSuccess={refetch} />}
            </div>
          </div>
        )}
      </main>
      </div>
    </ErrorBoundary>
  )
}