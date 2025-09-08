import Head from 'next/head'
import ENSApp from '@/components/ENSApp'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">ENS Domain Registration</h1>
        
        <ENSApp />
      </div>
    </div>
  )
}