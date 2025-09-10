// Debug script to check price oracles used by both TLD contracts
const { createPublicClient, http } = require('viem');

// Network configuration
const hiiNetwork = {
  id: 22988,
  name: 'Hii Network',
  network: 'hii',
  nativeCurrency: {
    decimals: 18,
    name: 'HII',
    symbol: 'HII',
  },
  rpcUrls: {
    default: {
      http: ['http://103.69.98.80:8545'],
    },
  },
};

// Contract addresses
const HII_REGISTRAR = '0x67F2401715f4B032d47063BAa0c2e4add77bF0B3';
const HI_REGISTRAR = '0x449f3CC30Cb557f32282dd606A692eB225593C62';

// ABI for prices() function to get price oracle address
const PRICES_ABI = [
  {
    "inputs": [],
    "name": "prices",
    "outputs": [
      {"internalType": "contract IPriceOracle", "name": "", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Simple ABI for price oracle's price function
const PRICE_ORACLE_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "expires", "type": "uint256"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"}
    ],
    "name": "price",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "base", "type": "uint256"},
          {"internalType": "uint256", "name": "premium", "type": "uint256"}
        ],
        "internalType": "struct IPriceOracle.Price",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkPriceOracles() {
  const client = createPublicClient({
    chain: hiiNetwork,
    transport: http(hiiNetwork.rpcUrls.default.http[0])
  });

  const testName = 'lalala12';
  const duration = BigInt(365 * 24 * 60 * 60); // 1 year in seconds
  const expires = BigInt(0); // New registration

  try {
    console.log('=== Price Oracle Investigation ===\n');
    
    // Get price oracle addresses
    console.log('--- Getting Price Oracle Addresses ---');
    
    const hiiPriceOracleAddress = await client.readContract({
      address: HII_REGISTRAR,
      abi: PRICES_ABI,
      functionName: 'prices'
    });
    
    const hiPriceOracleAddress = await client.readContract({
      address: HI_REGISTRAR,
      abi: PRICES_ABI,
      functionName: 'prices'
    });
    
    console.log('HII Registrar Controller:', HII_REGISTRAR);
    console.log('HII Price Oracle Address:', hiiPriceOracleAddress);
    console.log('\nHI Registrar Controller:', HI_REGISTRAR);
    console.log('HI Price Oracle Address:', hiPriceOracleAddress);
    
    console.log('\n--- Direct Price Oracle Calls ---');
    
    // Call price oracles directly
    const hiiDirectPrice = await client.readContract({
      address: hiiPriceOracleAddress,
      abi: PRICE_ORACLE_ABI,
      functionName: 'price',
      args: [testName, expires, duration]
    });
    
    const hiDirectPrice = await client.readContract({
      address: hiPriceOracleAddress,
      abi: PRICE_ORACLE_ABI,
      functionName: 'price',
      args: [testName, expires, duration]
    });
    
    console.log('\nHII Price Oracle Direct Call:');
    console.log('  Base:', hiiDirectPrice.base.toString());
    console.log('  Premium:', hiiDirectPrice.premium.toString());
    console.log('  Total (HII):', (Number(hiiDirectPrice.base + hiiDirectPrice.premium) / 1e18).toString());
    
    console.log('\nHI Price Oracle Direct Call:');
    console.log('  Base:', hiDirectPrice.base.toString());
    console.log('  Premium:', hiDirectPrice.premium.toString());
    console.log('  Total (HII):', (Number(hiDirectPrice.base + hiDirectPrice.premium) / 1e18).toString());
    
    console.log('\n--- Analysis ---');
    const hiiTotal = hiiDirectPrice.base + hiiDirectPrice.premium;
    const hiTotal = hiDirectPrice.base + hiDirectPrice.premium;
    const ratio = Number(hiTotal) / Number(hiiTotal);
    
    console.log('Same Price Oracles?', hiiPriceOracleAddress.toLowerCase() === hiPriceOracleAddress.toLowerCase());
    console.log('Price Ratio (HI/HII):', ratio.toString());
    
    if (ratio === 1000000) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('The .hi TLD price oracle is configured with prices that are 1,000,000x higher than .hii');
      console.log('This suggests the .hi price oracle was configured with incorrect base prices or units.');
    }
    
  } catch (error) {
    console.error('Error checking price oracles:', error);
  }
}

checkPriceOracles();