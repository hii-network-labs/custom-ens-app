import Head from 'next/head'
import HNSApp from '@/components/HNSApp'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>HNS Domain Registration - HII Name Service</title>
        <meta name="description" content="Register and manage HNS domains on Hii Network - Decentralized Web3 naming service" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">HNS Domain Registration</h1>
        
        <HNSApp />
      </div>
    </div>
  )
}