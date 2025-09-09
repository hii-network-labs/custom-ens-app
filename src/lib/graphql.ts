import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, namehash } from 'viem'
import { HNS_CONTRACTS } from '@/config/contracts'

// GraphQL client cho The Graph API
export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL || 'http://103.69.99.58:8000/subgraphs/name/graphprotocol/ens_hii'
)

// Query to get all domains (no owner filter)
export const GET_ALL_DOMAINS = `
  query GetAllDomains {
    domains(
      orderBy: createdAt
      orderDirection: desc
      first: 100
    ) {
      id
      name
      labelName
      labelhash
      owner {
        id
      }
      resolver {
        id
      }
      ttl
      isMigrated
      createdAt
      expiryDate
    }
  }
`

// Query to get domain list of an owner (fallback)
export const GET_DOMAINS_BY_OWNER = `
  query GetDomainsByOwner($owner: String!) {
    domains(
      where: { owner: $owner }
      orderBy: createdAt
      orderDirection: desc
      first: 100
    ) {
      id
      name
      labelName
      labelhash
      owner {
        id
      }
      resolver {
        id
      }
      ttl
      isMigrated
      createdAt
      expiryDate
    }
  }
`

// Query to get detailed information of a domain
export const GET_DOMAIN_DETAILS = `
  query GetDomainDetails($id: String!) {
    domain(id: $id) {
      id
      name
      labelName
      labelhash
      owner {
        id
      }
      resolver {
        id
        texts
        coinTypes
        contentHash
      }
      ttl
      isMigrated
      createdAt
      expiryDate
      events {
        id
        blockNumber
        transactionID
        ... on Transfer {
          owner {
            id
          }
        }
        ... on NewOwner {
          owner {
            id
          }
        }
        ... on NewResolver {
          resolver {
            id
          }
        }
      }
    }
  }
`

// Types cho GraphQL responses
export interface Domain {
  id: string
  name: string
  labelName: string
  labelhash: string
  owner: {
    id: string
  }
  resolver?: {
    id: string
    texts?: string[]
    coinTypes?: number[]
    contentHash?: string
  }
  ttl: string
  isMigrated: boolean
  createdAt: string
  expiryDate?: string
}

export interface DomainsResponse {
  domains: Domain[]
}

export interface DomainDetailsResponse {
  domain: Domain
}

// Helper function to fetch owner's domains
export async function fetchDomainsByOwner(owner: string): Promise<Domain[]> {
  try {
    console.log('=== FETCHING DOMAINS FROM GRAPHQL ===')
    console.log('Owner:', owner)
    console.log('Subgraph URL:', process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL)
    
    let response: DomainsResponse
    
    // Try to get all domains first
    try {
      console.log('Trying to fetch all domains first...')
      response = await graphqlClient.request<DomainsResponse>(GET_ALL_DOMAINS)
      console.log('All domains fetched:', response.domains.length)
    } catch (allDomainsError) {
      console.log('Failed to fetch all domains, trying owner filter...', allDomainsError)
      // Fallback: try filtering by owner
      response = await graphqlClient.request<DomainsResponse>(
        GET_DOMAINS_BY_OWNER,
        { owner: owner.toLowerCase() }
      )
    }
    
    console.log('Raw GraphQL response:', response)
    console.log('Domains count:', response.domains.length)
    
    // Filter domains by owner and clean up
    const ownerDomains = []
    
    for (const domain of response.domains) {
      // Check owner match - can be direct owner or NameWrapper
      const directOwnerMatch = domain.owner?.id?.toLowerCase() === owner.toLowerCase()
      
      if (directOwnerMatch) {
        console.log('Domain directly owned by user:', domain.name)
        ownerDomains.push(domain)
        continue
      }
      
      // If not matching direct owner, domain might be wrapped in NameWrapper
      // In this case, domain.owner will be NameWrapper contract address
      // and we need to check NameWrapper owner
      
      console.log('Domain not directly owned by user:', domain.name, 'Owner:', domain.owner?.id)
      
      // Check NameWrapper ownership
      try {
        const ownershipResult = await checkNameWrapperOwnership(domain.name, owner)
        if (ownershipResult.isOwner) {
          console.log('Domain owned by user via NameWrapper:', domain.name)
          
          // Create new domain object with real owner instead of NameWrapper
          const domainWithRealOwner = {
            ...domain,
            owner: {
              id: ownershipResult.realOwner || owner // Use realOwner from NameWrapper
            }
          }
          
          ownerDomains.push(domainWithRealOwner)
        } else {
          console.log('Domain not owned by user via NameWrapper:', domain.name)
        }
      } catch (error) {
        console.log('Error checking NameWrapper ownership for:', domain.name, error)
        // Don't add domain if there's an error
      }
    }
    
    console.log('Domains owned by user:', ownerDomains.length)
    
    // Filter and clean up domains
    const validDomains = ownerDomains.filter(domain => {
      // Skip domains with hash names or null labelName
      const isValid = domain.name && 
                     domain.labelName && 
                     !domain.name.startsWith('[') && 
                     !domain.name.endsWith(']') &&
                     domain.name.includes('.hii')
      
      if (!isValid) {
        console.log('Filtering out invalid domain:', domain)
      }
      
      return isValid
    })
    
    console.log('Valid domains after filtering:', validDomains.length)
    console.log('Valid domains:', validDomains.map(d => d.name))
    
    return validDomains
  } catch (error) {
    console.error('Error fetching domains:', error)
    return []
  }
}

// Helper function to fetch domain details
export async function fetchDomainDetails(id: string): Promise<Domain | null> {
  try {
    const response = await graphqlClient.request<DomainDetailsResponse>(
      GET_DOMAIN_DETAILS,
      { id }
    )
    return response.domain
  } catch (error) {
    console.error('Error fetching domain details:', error)
    return null
  }
}



// Function to check NameWrapper ownership and get real owner
async function checkNameWrapperOwnership(domainName: string, userAddress: string): Promise<{ isOwner: boolean; realOwner?: string }> {
  try {
    // Create public client
    const publicClient = createPublicClient({
      chain: {
        id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID!),
        name: 'Hii Network',
        network: 'hii-testnet',
        nativeCurrency: { name: 'HII', symbol: 'HII', decimals: 18 },
        rpcUrls: {
          default: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] },
          public: { http: [process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!] }
        }
      },
      transport: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC!)
    })

    // NameWrapper contract address
    const NAME_WRAPPER_ADDRESS = HNS_CONTRACTS.NAME_WRAPPER
    
    if (!NAME_WRAPPER_ADDRESS || NAME_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log('NameWrapper address not configured')
      return { isOwner: false }
    }

    // Create domain node
    const node = namehash(domainName)
    
    // Check owner from NameWrapper
    const nameWrapperOwner = await publicClient.readContract({
      address: NAME_WRAPPER_ADDRESS as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
          "name": "ownerOf",
          "outputs": [{"internalType": "address", "name": "owner", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'ownerOf',
      args: [BigInt(node)]
    })

    const isOwner = nameWrapperOwner.toLowerCase() === userAddress.toLowerCase()
    console.log('NameWrapper ownership check:', {
      domain: domainName,
      nameWrapperOwner: nameWrapperOwner,
      userAddress: userAddress,
      isOwner
    })

    return { 
      isOwner, 
      realOwner: nameWrapperOwner 
    }
  } catch (error) {
    console.log('Error checking NameWrapper ownership:', error)
    return { isOwner: false }
  }
}