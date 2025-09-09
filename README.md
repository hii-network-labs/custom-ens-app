# HNS Manager - Hii Network

HNS domain management application on Hii Network built with Next.js, TypeScript, wagmi and viem.

## Features

- 🔗 **Wallet Connection**: Connect MetaMask with Hii Network
- 📋 **Domain Management**: View list of all owned HNS domains
- ✨ **New Registration**: Register new HNS domain with commit-reveal process
- 🔄 **Renewal**: Extend domain usage time
- 🔀 **Transfer**: Transfer domain ownership to another wallet
- 💰 **Pricing**: Display real-time registration/renewal prices
- 📊 **The Graph**: Query data from The Graph API

## Technologies Used

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Web3**: wagmi, viem, MetaMask connector
- **Data**: The Graph Protocol, GraphQL
- **State Management**: React Query (@tanstack/react-query)

## Installation and Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment configuration

The `.env.local` file has been pre-configured for Hii Network:

```env
# Hii Network Configuration
NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID=29342
NEXT_PUBLIC_CUSTOM_NETWORK_NAME="Hii Network"
NEXT_PUBLIC_CUSTOM_NETWORK_RPC="http://103.69.99.57:8545"
# ... other configurations
```

### 3. Run the application

```bash
npm run dev
```

The application will run at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # React components
│   ├── HNSApp.tsx      # Main component
│   ├── DomainList.tsx  # Domain list
│   ├── RegisterDomain.tsx # Register new domain
│   ├── RenewDomain.tsx    # Renew domain
│   └── TransferDomain.tsx # Transfer domain
├── config/             # Configuration
│   ├── wagmi.ts       # wagmi and Hii Network configuration
│   └── contracts.ts   # Contract addresses and ABI
├── hooks/             # Custom hooks
│   └── useENS.ts     # Hooks for HNS contract interactions
├── lib/              # Utilities
│   └── graphql.ts   # GraphQL queries and client
├── pages/           # Next.js pages
│   ├── _app.tsx    # App wrapper with providers
│   └── index.tsx   # Main page
└── styles/         # CSS styles
    └── globals.css # TailwindCSS globals
```

## Usage Guide

### 1. Connect Wallet

- Click "Connect MetaMask" to connect wallet
- MetaMask will automatically add Hii Network if not present
- Confirm connection in MetaMask

### 2. View Domains

- "My Domains" tab displays all owned domains
- Information includes: domain name, owner, expiration date, status

### 3. Register New Domain

- Switch to "Register New" tab
- Enter domain name (without .hii)
- Select registration period (1-5 years)
- View price and click "Start Registration"
- **Step 1**: Commit - confirm transaction in MetaMask
- **Step 2**: Wait 60 seconds (HNS requirement)
- **Step 3**: Register - confirm final transaction

### 4. Renew Domain

- "Renew" tab: select domain and renewal period
- View price and confirm transaction

### 5. Transfer Domain

- "Transfer" tab: select domain and enter new wallet address
- Confirm checkbox and execute transfer
- **Note**: This action cannot be undone!

## Hii Network Information

- **Chain ID**: 29342
- **RPC URL**: http://103.69.99.57:8545
- **Explorer**: https://explorer.testnet.hii.network
- **Native Token**: HII
- **The Graph**: http://103.69.98.81:8000/subgraphs/name/graphprotocol/ens_eth

## HNS Contracts on Hii Network

- **Registry**: 0x8bA3410bd15155F9bb25e46838A21D2eEa0c0945
- **ETH Registrar Controller**: 0x1e7339b9e6dC09BE0650a3163f367574679e7497
- **Public Resolver**: 0xa5895DC687Eb0672fCcd964da618dC99112F2D75
- **Base Registrar**: 0x222349495048799C19995a65b32d86D20f1BA57A

## Important Notes

1. **Testnet**: This is a testnet, no real tokens are used
2. **MetaMask**: MetaMask extension installation required
3. **Network**: Application only works on Hii Network
4. **Commit-Reveal**: Domain registration requires 2 steps and 60-second wait
5. **Gas Fee**: All transactions require gas fees in HII tokens

## Troubleshooting

### Connection Errors
- Check MetaMask is installed and unlocked
- Ensure switched to Hii Network
- Check internet connection

### Transaction Errors
- Check HII token balance
- Increase gas limit if needed
- Try again after a few minutes

### GraphQL Errors
- Check The Graph API connection
- Try refreshing the page
- Check console for detailed errors

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```