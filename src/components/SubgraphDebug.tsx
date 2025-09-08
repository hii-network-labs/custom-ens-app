'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { testSubgraphConnection, testSubgraphWithOwner } from '@/lib/graphql'

export default function SubgraphDebug() {
  const { address } = useAccount()
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleTest = async () => {
    setIsTesting(true)
    setResult('')
    
    try {
      console.log('=== MANUAL SUBGRAPH TEST ===')
      await testSubgraphConnection()
      if (address) {
        await testSubgraphWithOwner(address)
      }
      setResult('Test completed. Check console for details.')
    } catch (error) {
      setResult(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTesting(false)
    }
  }

  if (!address) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Please connect wallet to test subgraph</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Subgraph Debug</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Address: <span className="font-mono">{address}</span>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Subgraph URL: <span className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL || 'http://103.69.99.58:8000/subgraphs/name/graphprotocol/ens_hii'}
            </span>
          </p>
        </div>
        
        <button
          onClick={handleTest}
          disabled={isTesting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {isTesting ? 'Testing...' : 'Test Subgraph Connection'}
        </button>
        
        {result && (
          <div className="p-3 bg-white rounded border">
            <p className="text-sm">{result}</p>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <p>This will test the subgraph connection and show all domains in the console.</p>
          <p>Expected: 4 valid domains (myawesomeapp.hii, hucaca.hii, lalala.hii, aioshimaaaaa.hii)</p>
        </div>
      </div>
    </div>
  )
}
