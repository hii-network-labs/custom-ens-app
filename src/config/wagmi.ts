import { http, createConfig } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define Hii Network chain
export const hiiNetwork = defineChain({
  id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!),
  name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NAME!,
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_NAME!,
    symbol: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_SYMBOL!,
    decimals: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_DECIMALS!),
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hii Explorer',
      url: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_EXPLORER!,
    },
  },
})

// Configure wagmi with Hii Network
export const config = createConfig({
  chains: [hiiNetwork],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Custom ENS App',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    }),
  ],
  transports: {
    [hiiNetwork.id]: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!, {
      timeout: 30000, // 30 seconds timeout
      retryCount: 3,
      retryDelay: 1000, // 1 second delay between retries
    }),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}