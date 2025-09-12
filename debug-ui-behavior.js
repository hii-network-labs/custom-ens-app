const { createPublicClient, http, keccak256, encodePacked } = require('viem');
const fs = require('fs');
const path = require('path');

// Load TLD configuration
const tldConfigPath = path.join(__dirname, 'src/config/tlds.json');
const tldConfig = JSON.parse(fs.readFileSync(tldConfigPath, 'utf8'));

// Find .hi TLD configuration
const hiTLD = tldConfig.tlds.find(tld => tld.tld === '.hi');
if (!hiTLD) {
  console.error('.hi TLD configuration not found');
  process.exit(1);
}

console.log('Using .hi TLD configuration:', hiTLD);

// Network configuration
const hiiNetwork = {
  id: 22988,
  name: 'Hii Network',
  network: 'hii',
  nativeCurrency: {
    decimals: 18,
    name: 'Hii',
    symbol: 'HII',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.hii.network'],
    },
  },
};

// Contract ABIs
const REGISTRAR_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "available",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const BASE_REGISTRAR_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function debugUIBehavior() {
  try {
    console.log('=== Debugging UI Behavior for lalalal.hi ===\n');
    
    const client = createPublicClient({
      chain: hiiNetwork,
      transport: http('https://rpc.testnet.hii.network')
    });
    
    const registrarAddress = hiTLD.contracts.registrarController;
    const baseRegistrarAddress = '0xE03C133611725147F90f86f581E739BA7e7692E9'; // From env
    
    console.log('Registrar Controller Address:', registrarAddress);
    console.log('Base Registrar Address:', baseRegistrarAddress);
    
    // Step 1: Check availability (what the UI hook does first)
    console.log('\n1. Checking registrar controller availability...');
    try {
      const isAvailable = await client.readContract({
        address: registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'available',
        args: ['lalalal']
      });
      console.log('Registrar says available:', isAvailable);
      
      if (!isAvailable) {
        console.log('\n2. Domain is not available, checking base registrar ownership...');
        
        // Generate domain hash
        const domainHash = keccak256(encodePacked(['string'], ['lalalal']));
        console.log('Domain hash:', domainHash);
        
        try {
          const owner = await client.readContract({
            address: baseRegistrarAddress,
            abi: BASE_REGISTRAR_ABI,
            functionName: 'ownerOf',
            args: [domainHash]
          });
          console.log('Base registrar owner:', owner);
          console.log('Expected NameWrapper address:', hiTLD.contracts.nameWrapper);
          console.log('Owner matches NameWrapper?', owner.toLowerCase() === hiTLD.contracts.nameWrapper.toLowerCase());
        } catch (ownerError) {
          console.log('Error getting owner from base registrar:', ownerError.message);
          if (ownerError.message.includes('execution reverted')) {
            console.log('This suggests the token does not exist in base registrar');
          }
        }
      }
    } catch (availError) {
      console.log('Error checking availability:', availError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugUIBehavior();