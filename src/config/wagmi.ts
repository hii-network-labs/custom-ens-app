import { http, createConfig } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define the custom Hii Network chain using environment variables
export const hiiNetwork = defineChain({
  id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID || '1'),
  name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NAME || 'Hii Network',
  nativeCurrency: {
    decimals: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_DECIMALS || '18'),
    name: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_NAME || 'HII',
    symbol: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_NATIVE_CURRENCY_SYMBOL || 'HII',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC || 'https://rpc.hii.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hii Explorer',
      url: process.env.NEXT_PUBLIC_CUSTOM_NETWORK_EXPLORER || 'https://explorer.hii.network',
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
    [hiiNetwork.id]: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC || 'https://rpc.hii.network'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}