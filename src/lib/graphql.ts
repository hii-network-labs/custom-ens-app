import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, namehash } from 'viem'
import { HNS_CONTRACTS } from '@/config/contracts'
import { getSupportedTLDs } from '@/config/tlds'
import { getTLDConfigData } from '@/config/tldDataFetcher'

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
  owner?: {
    id: string
  } | null
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
    // console.log('Fetching domains for owner:', owner)
    
    // Fetch all domains first, then filter by ownership in application logic
    // This is necessary because domains might be owned through NameWrapper
    // console.log("🚀 ~ fetchDomainsByOwner ~ GET_ALL_DOMAINS:", GET_ALL_DOMAINS)
    const response = await graphqlClient.request<DomainsResponse>(GET_ALL_DOMAINS)
    // console.log('All domains fetched:', response.domains.length)
    // console.log('Raw GraphQL response:', response)
    
    const ownerDomains: Domain[] = []
    
    for (const domain of response.domains) {
      // Skip domains with null or undefined owners
      if (!domain.owner || !domain.owner.id) {
        console.warn(`Skipping domain ${domain.name} with null owner`)
        continue
      }
      
      // Check owner match - can be direct owner or NameWrapper
      const directOwnerMatch = domain.owner.id.toLowerCase() === owner.toLowerCase()
      
      if (directOwnerMatch) {
        // console.log('Domain directly owned by user:', domain.name)
        ownerDomains.push(domain)
        continue
      }
      
      // If not matching direct owner, domain might be wrapped in NameWrapper
      // In this case, domain.owner will be NameWrapper contract address
      // and we need to check NameWrapper owner
      
      // console.log('Domain not directly owned by user:', domain.name, 'Owner:', domain.owner?.id)
      
      // Check NameWrapper ownership if NameWrapper is configured
      // NameWrapper address is determined dynamically based on domain TLD in checkNameWrapperOwnership
      try {
        const ownershipResult = await checkNameWrapperOwnership(domain.name, owner)
        if (ownershipResult.isOwner) {
          // console.log('Domain owned by user via NameWrapper:', domain.name)
          
          // Create new domain object with real owner instead of NameWrapper
          const domainWithRealOwner = {
            ...domain,
            owner: {
              id: ownershipResult.realOwner || owner // Use realOwner from NameWrapper
            }
          }
          
          ownerDomains.push(domainWithRealOwner)
        } else {
          // console.log('Domain not owned by user via NameWrapper:', domain.name)
        }
      } catch (error) {
        console.log('Error checking NameWrapper ownership for:', domain.name, error)
        // Don't add domain if there's an error
      }
    }
    
    // console.log('Domains owned by user:', ownerDomains.length)
    
    // Filter and clean up domains
    const supportedTLDs = await getSupportedTLDs()
    // console.log('Supported TLDs:', supportedTLDs)
    const validDomains = ownerDomains.filter(domain => {
      // Check if domain has a valid name
      if (!domain.name) {
        // console.log('Filtering out domain without name:', domain)
        return false
      }
      
      // Check if domain ends with supported TLD
      const hasValidTLD = supportedTLDs.some((tld: string) => domain.name.endsWith(tld))
      if (!hasValidTLD) {

        return false
      }
      
      // Debug logging for domains with null labelName
      if (domain.labelName === null || domain.labelName === undefined) {
        console.log('DEBUG: Found domain with null labelName:', {
          id: domain.id,
          name: domain.name,
          labelName: domain.labelName,
          resolver: domain.resolver
        })
        // Filter out domains with null labelName as they are incomplete
        return false
      }
      
      // Accept domains even if they have encoded names or null labelName
      // These are valid domains that just haven't been properly decoded by the subgraph
      // console.log('Including domain:', domain.name, 'labelName:', domain.labelName)
      return true
    })
    
    // console.log('Valid domains after filtering:', validDomains.length)
    // console.log('Valid domains:', validDomains.map(d => d.name))
    
    return validDomains
  } catch (error) {
    console.error('Error fetching domains:', error)
    
    // Check if it's a GraphQL error
    if (error && typeof error === 'object' && 'response' in error) {
      const graphqlError = error as any
      
      // Handle null owner field errors
      if (graphqlError.response?.errors?.some((e: any) => e.message?.includes('Null value resolved for non-null field'))) {
        console.warn('GraphQL subgraph has domains with null owners. Attempting to fetch domains with blockchain fallback.')
        // Return empty array and let the calling code handle blockchain fallback
        return []
      }
      
      // Handle indexing errors
      if (graphqlError.response?.errors?.some((e: any) => e.message === 'indexing_error')) {
        console.warn('GraphQL subgraph is experiencing indexing issues. This is a temporary issue with the indexing service.')
        throw new Error('INDEXING_ERROR')
      }
    }
    
    return []
  }
}

// Helper function to fetch all domains with debug logging for null labelName
export async function fetchAllDomains(): Promise<Domain[]> {
  try {
    console.log('DEBUG: Fetching all domains from GraphQL...')
    const response = await graphqlClient.request<DomainsResponse>(GET_ALL_DOMAINS)
    
    console.log(`DEBUG: Received ${response.domains.length} domains from GraphQL`)
    
    // Filter out invalid domains and log null labelName domains for debugging
    const validDomains = response.domains.filter((domain: Domain) => {
      // Debug logging for domains with null labelName
      if (domain.labelName === null || domain.labelName === undefined) {
        console.log('DEBUG: Found domain with null labelName:', {
          id: domain.id,
          name: domain.name,
          labelName: domain.labelName,
          resolver: domain.resolver
        })
        // Filter out domains with null labelName as they are incomplete
        return false
      }
      
      // Accept domains with valid labelName (even if encoded)
      return true
    })
    
    console.log(`DEBUG: After filtering, ${validDomains.length} valid domains remain`)
    return validDomains
  } catch (error) {
    console.error('Error fetching all domains:', error)
    
    // Check if it's a GraphQL error
    if (error && typeof error === 'object' && 'response' in error) {
      const graphqlError = error as any
      
      // Handle null owner field errors
      if (graphqlError.response?.errors?.some((e: any) => e.message?.includes('Null value resolved for non-null field'))) {
        console.warn('GraphQL subgraph has domains with null owners. Returning empty array.')
        return []
      }
      
      // Handle indexing errors
      if (graphqlError.response?.errors?.some((e: any) => e.message === 'indexing_error')) {
        console.warn('GraphQL subgraph is experiencing indexing issues. This is a temporary issue with the indexing service.')
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

    // Determine the correct NameWrapper contract based on domain TLD using dynamic configuration
    const supportedTLDs = await getSupportedTLDs()
    const tld = supportedTLDs.find(tld => domainName.endsWith(tld))
    
    if (!tld) {
      console.log(`[checkNameWrapperOwnership] Unsupported TLD for domain: ${domainName}`)
      return { isOwner: false }
    }
    
    const tldConfig = await getTLDConfigData(tld)
    if (!tldConfig || !tldConfig.contracts.nameWrapper) {
      console.log(`[checkNameWrapperOwnership] No NameWrapper configured for TLD: ${tld}`)
      return { isOwner: false }
    }
    
    const NAME_WRAPPER_ADDRESS = tldConfig.contracts.nameWrapper
    

    
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