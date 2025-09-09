'use client'

import { Domain } from '@/lib/graphql'
import LoadingState, { CardSkeleton } from './LoadingState'

interface DomainListProps {
  domains: Domain[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export default function DomainList({ domains, loading, error, onRefresh }: DomainListProps) {
  const loadingComponent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )

  const emptyStateComponent = (
    <div className="text-center py-12 sm:py-20">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
        No Domains Yet
      </h3>
      <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto px-4">
        You haven't registered any domains yet. Start building your Web3 identity by registering your first ENS domain!
      </p>
      <button
        onClick={() => window.location.hash = '#register'}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center space-x-2 sm:space-x-3 mx-auto"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="hidden sm:inline">Register Your First Domain</span>
        <span className="sm:hidden">Register Domain</span>
      </button>
    </div>
  )

  return (
    <LoadingState
      loading={loading}
      error={error}
      isEmpty={!domains || domains.length === 0}
      loadingComponent={loadingComponent}
      emptyState={emptyStateComponent}
      retryAction={onRefresh}
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              My Domains
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {domains.length} {domains.length === 1 ? 'domain' : 'domains'} registered
            </p>
          </div>
          <div className="flex space-x-2 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex items-center space-x-2 sm:space-x-3 flex-1 sm:flex-none justify-center"
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {domains.length < 4 && (
              <button
                onClick={() => {
                  console.log('Force refresh from blockchain...')
                  onRefresh()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors"
                title="Refresh from blockchain (if GraphQL is missing domains)"
              >
                <span className="hidden sm:inline">Force Refresh</span>
                <span className="sm:hidden">Force</span>
              </button>
            )}
          </div>
        </div>

        {domains.length < 4 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Possible missing domains</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>GraphQL may not have fully indexed new domains. Try clicking "Force Refresh" to fetch from blockchain.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <div key={domain.id} className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105 hover:border-blue-300/50 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors truncate">{domain.name}</h3>
                    <p className="text-sm text-gray-500">ENS Domain</p>
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    domain.isMigrated 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {domain.isMigrated ? 'Migrated' : 'Legacy'}
                  </span>
                  
                  {domain.expiryDate && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      parseInt(domain.expiryDate) * 1000 > Date.now()
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {parseInt(domain.expiryDate) * 1000 > Date.now() ? 'Active' : 'Expired'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Label</span>
                  </div>
                  <span className="text-sm font-mono text-gray-900">{domain.labelName}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Owner</span>
                  </div>
                  <span className="text-sm font-mono text-gray-900">
                    {domain.owner.id.slice(0, 6)}...{domain.owner.id.slice(-4)}
                  </span>
                </div>
                
                {domain.expiryDate && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Expires</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(parseInt(domain.expiryDate) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Created</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(parseInt(domain.createdAt) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                {domain.resolver && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Resolver</span>
                    </div>
                    <span className="text-sm font-mono text-gray-900">
                      {domain.resolver.id.slice(0, 6)}...{domain.resolver.id.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-200/50">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Manage</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingState>
  )
}