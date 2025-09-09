'use client'

import { ReactNode } from 'react'

interface LoadingStateProps {
  loading?: boolean
  error?: string | null
  children: ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  emptyState?: ReactNode
  isEmpty?: boolean
  retryAction?: () => void
  className?: string
}

export function LoadingState({
  loading = false,
  error = null,
  children,
  loadingComponent,
  errorComponent,
  emptyState,
  isEmpty = false,
  retryAction,
  className = ""
}: LoadingStateProps) {
  // Loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h3>
          <p className="text-gray-600">Please wait while we fetch your data</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>
    }
    
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-red-900 mb-4">Error Occurred</h3>
          <p className="text-red-600 mb-6 text-sm leading-relaxed">{error}</p>
          {retryAction && (
            <button
              onClick={retryAction}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center space-x-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Empty state
  if (isEmpty && emptyState) {
    return <>{emptyState}</>
  }

  // Success state - render children
  return <>{children}</>
}

// Specialized loading components
export function InlineLoader({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <svg className={`animate-spin ${sizeClasses[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export function SkeletonLoader({ className = '', lines = 3 }: { className?: string, lines?: number }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`bg-gray-200 rounded h-4 mb-3 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}></div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
      
      <div className="space-y-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl"></div>
        ))}
      </div>
      
      <div className="flex space-x-3">
        <div className="flex-1 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1 h-12 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  )
}

export default LoadingState