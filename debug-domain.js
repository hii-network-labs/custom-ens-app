const { createPublicClient, http } = require('viem');
const { GraphQLClient } = require('graphql-request');

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

// GraphQL client
const graphqlClient = new GraphQLClient('https://graph-node.testnet.hii.network/subgraphs/name/graphprotocol/hii_ens');

// Contract addresses and ABIs
// This is the registrar controller for .hi domains
const REGISTRAR_ADDRESS = '0x449f3CC30Cb557f32282dd606A692eB225593C62';
const REGISTRAR_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "available",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const GET_ALL_DOMAINS = `
  query GetAllDomains {
    domains(
      orderBy: createdAt
      orderDirection: desc
      first: 100
      where: { owner_not: null }
    ) {
      id
      name
      labelName
      owner {
        id
      }
    }
  }
`;

async function debugDomain() {
  try {
    console.log('=== Debugging lalalal.hi domain ===\n');
    
    // 1. Check contract availability
    const client = createPublicClient({
      chain: hiiNetwork,
      transport: http('https://rpc.testnet.hii.network')
    });
    
    console.log('1. Checking contract availability for "lalalal"...');
    const isAvailable = await client.readContract({
      address: REGISTRAR_ADDRESS,
      abi: REGISTRAR_ABI,
      functionName: 'available',
      args: ['lalalal']
    });
    console.log('Contract says available:', isAvailable);
    
    // 2. Check subgraph data
    console.log('\n2. Checking subgraph data...');
    const response = await graphqlClient.request(GET_ALL_DOMAINS);
    console.log('Total domains in subgraph:', response.domains.length);
    
    // Find lalalal.hi in subgraph
    const lalalDomain = response.domains.find(d => d.name === 'lalalal.hi');
    if (lalalDomain) {
      console.log('Found lalalal.hi in subgraph:', {
        name: lalalDomain.name,
        labelName: lalalDomain.labelName,
        owner: lalalDomain.owner?.id
      });
    } else {
      console.log('lalalal.hi NOT found in subgraph');
    }
    
    // 3. List all domains for comparison
    console.log('\n3. All domains in subgraph:');
    response.domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.name} (owner: ${domain.owner?.id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDomain();