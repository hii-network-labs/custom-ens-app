const { createPublicClient, http, keccak256, encodePacked, namehash } = require('viem');
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

const NAME_WRAPPER_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testDomainStatus() {
  try {
    console.log('=== Testing Domain Status Logic for lalalal.hi ===\n');
    
    const client = createPublicClient({
      chain: hiiNetwork,
      transport: http('https://rpc.testnet.hii.network')
    });
    
    const registrarAddress = hiTLD.contracts.registrarController;
    const baseRegistrarAddress = '0xE03C133611725147F90f86f581E739BA7e7692E9'; // From env
    const nameWrapperAddress = hiTLD.contracts.nameWrapper;
    
    console.log('Registrar Controller Address:', registrarAddress);
    console.log('Base Registrar Address:', baseRegistrarAddress);
    console.log('NameWrapper Address:', nameWrapperAddress);
    
    // Step 1: Check registrar controller availability
    console.log('\n1. Checking registrar controller availability...');
    const isAvailable = await client.readContract({
      address: registrarAddress,
      abi: REGISTRAR_ABI,
      functionName: 'available',
      args: ['lalalal']
    });
    console.log('Registrar says available:', isAvailable);
    
    if (!isAvailable) {
      // console.log('\n2. Domain not available, checking base registrar...');
      
      // Generate domain hash
      const domainHash = keccak256(encodePacked(['string'], ['lalalal']));
      // console.log('Domain hash:', domainHash);
      
      try {
        const owner = await client.readContract({
          address: baseRegistrarAddress,
          abi: BASE_REGISTRAR_ABI,
          functionName: 'ownerOf',
          args: [domainHash]
        });
        console.log('Base registrar owner:', owner);
        console.log('Final status: REGISTERED (owned by base registrar)');
      } catch (ownerError) {
        console.log('Base registrar ownerOf failed:', ownerError.message);
        
        // Step 3: Check NameWrapper
        console.log('\n3. Checking NameWrapper...');
        try {
          const fullDomainName = 'lalalal.hi';
          const node = namehash(fullDomainName);
          console.log('Full domain name:', fullDomainName);
          console.log('Namehash node:', node);
          
          const nameWrapperOwner = await client.readContract({
            address: nameWrapperAddress,
            abi: NAME_WRAPPER_ABI,
            functionName: 'ownerOf',
            args: [BigInt(node)]
          });
          
          console.log('NameWrapper owner:', nameWrapperOwner);
          if (nameWrapperOwner && nameWrapperOwner !== '0x0000000000000000000000000000000000000000') {
            console.log('Final status: REGISTERED (wrapped in NameWrapper)');
          } else {
            console.log('Final status: AVAILABLE (no owner found)');
          }
        } catch (nameWrapperError) {
          console.log('NameWrapper ownerOf failed:', nameWrapperError.message);
          console.log('Final status: AVAILABLE (not found in NameWrapper)');
        }
      }
    } else {
      console.log('Final status: AVAILABLE');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDomainStatus();