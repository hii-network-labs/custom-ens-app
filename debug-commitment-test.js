// Script để test commitment flow
// Chạy: node debug-commitment-test.js

const { createPublicClient, http, keccak256, encodePacked, namehash, encodeFunctionData } = require('viem');
const { mainnet } = require('viem/chains');

// Cấu hình contract (thay đổi theo network của bạn)
const ETH_REGISTRAR_CONTROLLER = '0x0596BF7126D91241fC49adeDafAc859DF45eE0d8';
const PUBLIC_RESOLVER = '0xaad90fD5a09629c345BB670854144d7834cfDAa2';
const RPC_URL = 'https://rpc.testnet.hii.network'; // Thay đổi theo RPC của bạn

// ABI cần thiết
const ETH_REGISTRAR_CONTROLLER_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "bytes32", "name": "secret", "type": "bytes32"},
      {"internalType": "address", "name": "resolver", "type": "address"},
      {"internalType": "bytes[]", "name": "data", "type": "bytes[]"},
      {"internalType": "bool", "name": "reverseRecord", "type": "bool"},
      {"internalType": "uint16", "name": "ownerControlledFuses", "type": "uint16"}
    ],
    "name": "makeCommitment",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}],
    "name": "commitments",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minCommitmentAge",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxCommitmentAge",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const PUBLIC_RESOLVER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes32", "name": "node", "type": "bytes32"},
      {"internalType": "uint256", "name": "coinType", "type": "uint256"},
      {"internalType": "bytes", "name": "a", "type": "bytes"}
    ],
    "name": "setAddr",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "node", "type": "bytes32"},
      {"internalType": "string", "name": "key", "type": "string"},
      {"internalType": "string", "name": "value", "type": "string"}
    ],
    "name": "setText",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function debugCommitmentFlow() {
  console.log('=== DEBUG COMMITMENT FLOW ===');
  
  // Tạo public client
  const publicClient = createPublicClient({
    chain: {
      id: 123456, // Thay đổi theo chain ID của bạn
      name: 'Hii Network',
      network: 'hii-testnet',
      nativeCurrency: { name: 'HII', symbol: 'HII', decimals: 18 },
      rpcUrls: {
        default: { http: [RPC_URL] },
        public: { http: [RPC_URL] }
      }
    },
    transport: http(RPC_URL)
  });

  // Test parameters
  const name = 'lucky';
  const owner = '0xb769BEFa05c7D9B08062630E351e865d3F49c56D';
  const duration = BigInt(60 * 60 * 24 * 30); // 30 ngày
  const secret = 'fixed-secret-for-ens-registration';
  const secretHash = keccak256(encodePacked(['string'], [secret]));

  console.log('Test parameters:');
  console.log('- Name:', name);
  console.log('- Owner:', owner);
  console.log('- Duration:', duration.toString());
  console.log('- Secret:', secret);
  console.log('- Secret hash:', secretHash);

  try {
    // 1. Tạo resolver data
    console.log('\n=== STEP 1: CREATE RESOLVER DATA ===');
    const node = namehash(`${name}.hii`);
    console.log('Domain node:', node);

    const encodedSetAddr = encodeFunctionData({
      abi: PUBLIC_RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, BigInt(60), owner]
    });

    const encodedSetText = encodeFunctionData({
      abi: PUBLIC_RESOLVER_ABI,
      functionName: 'setText',
      args: [node, 'email', 'owner@example.com']
    });

    const resolverData = [encodedSetAddr, encodedSetText];
    console.log('Resolver data created:', resolverData.length, 'items');

    // 2. Tạo commitment hash
    console.log('\n=== STEP 2: CREATE COMMITMENT HASH ===');
    const commitmentHash = await publicClient.readContract({
      address: ETH_REGISTRAR_CONTROLLER,
      abi: ETH_REGISTRAR_CONTROLLER_ABI,
      functionName: 'makeCommitment',
      args: [
        name,
        owner,
        duration,
        secretHash,
        PUBLIC_RESOLVER,
        resolverData,
        true, // reverseRecord
        0 // ownerControlledFuses
      ]
    });

    console.log('Generated commitment hash:', commitmentHash);

    // 3. Lấy thông tin timing
    console.log('\n=== STEP 3: GET TIMING INFO ===');
    const minCommitmentAge = await publicClient.readContract({
      address: ETH_REGISTRAR_CONTROLLER,
      abi: ETH_REGISTRAR_CONTROLLER_ABI,
      functionName: 'minCommitmentAge'
    });

    const maxCommitmentAge = await publicClient.readContract({
      address: ETH_REGISTRAR_CONTROLLER,
      abi: ETH_REGISTRAR_CONTROLLER_ABI,
      functionName: 'maxCommitmentAge'
    });

    console.log('Min commitment age:', minCommitmentAge.toString(), 'seconds');
    console.log('Max commitment age:', maxCommitmentAge.toString(), 'seconds');

    // 4. Kiểm tra commitment hiện tại (nếu có)
    console.log('\n=== STEP 4: CHECK CURRENT COMMITMENT ===');
    const currentCommitment = await publicClient.readContract({
      address: ETH_REGISTRAR_CONTROLLER,
      abi: ETH_REGISTRAR_CONTROLLER_ABI,
      functionName: 'commitments',
      args: [commitmentHash]
    });

    console.log('Current commitment timestamp:', currentCommitment.toString());

    if (currentCommitment > 0n) {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const commitmentAge = currentTime - currentCommitment;
      const validStart = currentCommitment + minCommitmentAge;
      const validEnd = currentCommitment + maxCommitmentAge;

      console.log('Current time:', currentTime.toString());
      console.log('Commitment age:', commitmentAge.toString(), 'seconds');
      console.log('Valid window:', `${validStart.toString()} - ${validEnd.toString()}`);
      console.log('Is ready:', commitmentAge >= minCommitmentAge);
      console.log('Is expired:', currentTime > validEnd);
      console.log('Is valid:', commitmentAge >= minCommitmentAge && currentTime <= validEnd);
    } else {
      console.log('No commitment found - need to commit first');
    }

    console.log('\n=== DEBUG COMPLETE ===');

  } catch (error) {
    console.error('Error during debug:', error);
  }
}

// Chạy debug
debugCommitmentFlow().catch(console.error);
