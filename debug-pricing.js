// Debug script to compare pricing between .hii and .hi TLDs
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

// Simple ABI for rentPrice function
const RENT_PRICE_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"}
    ],
    "name": "rentPrice",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "base", "type": "uint256"},
          {"internalType": "uint256", "name": "premium", "type": "uint256"}
        ],
        "internalType": "struct IPriceOracle.Price",
        "name": "price",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function comparePricing() {
  const client = createPublicClient({
    chain: hiiNetwork,
    transport: http(hiiNetwork.rpcUrls.default.http[0])
  });

  const testName = 'lalala12';
  const duration = BigInt(365 * 24 * 60 * 60); // 1 year in seconds

  try {
    console.log('Testing pricing for:', testName);
    console.log('Duration:', duration.toString(), 'seconds (1 year)');
    console.log('\n--- .hii TLD Pricing ---');
    
    const hiiPrice = await client.readContract({
      address: HII_REGISTRAR,
      abi: RENT_PRICE_ABI,
      functionName: 'rentPrice',
      args: [testName, duration]
    });
    
    console.log('HII Contract Address:', HII_REGISTRAR);
    console.log('Base Price:', hiiPrice.base.toString());
    console.log('Premium:', hiiPrice.premium.toString());
    console.log('Total (wei):', (hiiPrice.base + hiiPrice.premium).toString());
    console.log('Total (HII):', (Number(hiiPrice.base + hiiPrice.premium) / 1e18).toString());
    
    console.log('\n--- .hi TLD Pricing ---');
    
    const hiPrice = await client.readContract({
      address: HI_REGISTRAR,
      abi: RENT_PRICE_ABI,
      functionName: 'rentPrice',
      args: [testName, duration]
    });
    
    console.log('HI Contract Address:', HI_REGISTRAR);
    console.log('Base Price:', hiPrice.base.toString());
    console.log('Premium:', hiPrice.premium.toString());
    console.log('Total (wei):', (hiPrice.base + hiPrice.premium).toString());
    console.log('Total (HII):', (Number(hiPrice.base + hiPrice.premium) / 1e18).toString());
    
    console.log('\n--- Price Comparison ---');
    const hiiTotal = hiiPrice.base + hiiPrice.premium;
    const hiTotal = hiPrice.base + hiPrice.premium;
    const ratio = Number(hiTotal) / Number(hiiTotal);
    
    console.log('HII Total:', (Number(hiiTotal) / 1e18).toString(), 'HII');
    console.log('HI Total:', (Number(hiTotal) / 1e18).toString(), 'HII');
    console.log('Price Ratio (HI/HII):', ratio.toString());
    console.log('HI is', ratio.toFixed(0) + 'x more expensive than HII');
    
  } catch (error) {
    console.error('Error comparing pricing:', error);
  }
}

comparePricing();