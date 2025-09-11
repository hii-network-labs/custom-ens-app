import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, namehash } from 'viem'
import { HNS_CONTRACTS } from '@/config/contracts'
import { getSupportedTLDs } from '@/config/tlds'

// Helper function to decode encoded domain names
export async function getDisplayName(domain: Domain): Promise<string> {
  // If labelName exists and is not null, use it with TLD
  if (domain.labelName && domain.labelName !== 'null') {
    const supportedTLDs = await getSupportedTLDs()
    const tld = supportedTLDs.find(tld => domain.name.endsWith(tld))
    return tld ? `${domain.labelName}${tld}` : domain.name
  }
  
  // If domain name has encoded format, try to extract readable parts
  if (domain.name.includes('[') && domain.name.includes(']')) {
    // Extract TLD from the end
    const supportedTLDs = await getSupportedTLDs()
    const tld = supportedTLDs.find(tld => domain.name.endsWith(tld))
    if (tld) {
      // Show as "Encoded Domain" + TLD for now
      // In the future, this could be enhanced to decode the hash if possible
      return `[Encoded Domain]${tld}`
    }
  }
  
  // Fallback to original name
  return domain.name
}

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

    
    // Fetch all domains first, then filter by ownership in application logic
    // This is necessary because domains might be owned through NameWrapper
    const response = await graphqlClient.request<DomainsResponse>(GET_ALL_DOMAINS)

    
    const ownerDomains: Domain[] = []
    
    for (const domain of response.domains) {
      // Check owner match - can be direct owner or NameWrapper
      const directOwnerMatch = domain.owner?.id?.toLowerCase() === owner.toLowerCase()
      
      if (directOwnerMatch) {

        ownerDomains.push(domain)
        continue
      }
      
      // If not matching direct owner, domain might be wrapped in NameWrapper
      // In this case, domain.owner will be NameWrapper contract address
      // and we need to check NameWrapper owner
      

      
      // Check NameWrapper ownership if NameWrapper is configured
      // NameWrapper address is determined dynamically based on domain TLD in checkNameWrapperOwnership
      try {
        const ownershipResult = await checkNameWrapperOwnership(domain.name, owner)
        if (ownershipResult.isOwner) {

          
          // Create new domain object with real owner instead of NameWrapper
          const domainWithRealOwner = {
            ...domain,
            owner: {
              id: ownershipResult.realOwner || owner // Use realOwner from NameWrapper
            }
          }
          
          ownerDomains.push(domainWithRealOwner)
        }
      } catch (error) {

        // Don't add domain if there's an error
      }
    }
    

    
    // Filter and clean up domains
    const supportedTLDs = await getSupportedTLDs()

    const validDomains = ownerDomains.filter(domain => {
      // Check if domain has a valid name
      if (!domain.name) {

        return false
      }
      
      // Check if domain ends with supported TLD
      const hasValidTLD = supportedTLDs.some((tld: string) => domain.name.endsWith(tld))
      if (!hasValidTLD) {

        return false
      }
      
      // Accept domains even if they have encoded names or null labelName
      // These are valid domains that just haven't been properly decoded by the subgraph

      return true
    })
    

    
    return validDomains
  } catch (error) {
    console.error('Error fetching domains:', error)
    
    // Check if it's a GraphQL indexing error
    if (error && typeof error === 'object' && 'response' in error) {
      const graphqlError = error as any
      if (graphqlError.response?.errors?.some((e: any) => e.message === 'indexing_error')) {
        console.warn('GraphQL subgraph is experiencing indexing issues. This is a temporary issue with the indexing service.')
        // Don't throw here - let the calling code handle the fallback
        throw new Error('INDEXING_ERROR')
      }
    }
    
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

    // Determine the correct NameWrapper contract based on domain TLD
    let NAME_WRAPPER_ADDRESS: string
    if (domainName.endsWith('.hi')) {
      NAME_WRAPPER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_HI_NAME_WRAPPER as string
    } else if (domainName.endsWith('.hii')) {
      NAME_WRAPPER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_HII_NAME_WRAPPER as string
    } else {
      // No fallback available - NameWrapper not configured for this TLD

      return { isOwner: false }
    }
    

    
    if (!NAME_WRAPPER_ADDRESS || NAME_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {

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


    return { 
      isOwner, 
      realOwner: nameWrapperOwner 
    }
  } catch (error) {

    return { isOwner: false }
  }
}