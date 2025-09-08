'use client'

import { Domain } from '@/lib/graphql'

interface DomainListProps {
  domains: Domain[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export default function DomainList({ domains, loading, error, onRefresh }: DomainListProps) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Đang tải domains...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Lỗi khi tải domains</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={onRefresh}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Domains của bạn ({domains.length})
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={onRefresh}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Làm mới
          </button>
          {domains.length < 4 && (
            <button
              onClick={() => {
                console.log('Force refresh from blockchain...')
                onRefresh()
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              title="Làm mới từ blockchain (nếu GraphQL thiếu domains)"
            >
              Force Refresh
            </button>
          )}
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có domains</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bạn chưa sở hữu domain nào. Hãy đăng ký domain đầu tiên!
          </p>
        </div>
      ) : (
        <>
          {domains.length < 4 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Có thể thiếu domains</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>GraphQL có thể chưa index đầy đủ các domain mới. Thử click "Force Refresh" để fetch từ blockchain.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <div key={domain.id} className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {domain.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Label:</span>
                      <span className="ml-2 font-mono">{domain.labelName}</span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Owner:</span>
                      <span className="ml-2 font-mono text-xs">
                        {domain.owner.id.slice(0, 6)}...{domain.owner.id.slice(-4)}
                      </span>
                    </div>
                    
                    {domain.expiryDate && (
                      <div>
                        <span className="font-medium">Hết hạn:</span>
                        <span className="ml-2">
                          {new Date(parseInt(domain.expiryDate) * 1000).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium">Tạo lúc:</span>
                      <span className="ml-2">
                        {new Date(parseInt(domain.createdAt) * 1000).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    
                    {domain.resolver && (
                      <div>
                        <span className="font-medium">Resolver:</span>
                        <span className="ml-2 font-mono text-xs">
                          {domain.resolver.id.slice(0, 6)}...{domain.resolver.id.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    domain.isMigrated 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {domain.isMigrated ? 'Migrated' : 'Legacy'}
                  </span>
                  
                  {domain.expiryDate && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      parseInt(domain.expiryDate) * 1000 > Date.now()
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {parseInt(domain.expiryDate) * 1000 > Date.now() ? 'Còn hạn' : 'Hết hạn'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}