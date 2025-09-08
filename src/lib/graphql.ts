import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, namehash } from 'viem'
import { ENS_CONTRACTS } from '@/config/contracts'

// GraphQL client cho The Graph API
export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL || 'http://103.69.99.58:8000/subgraphs/name/graphprotocol/ens_hii'
)

// Query để lấy tất cả domains (không filter theo owner)
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

// Query để lấy danh sách domains của một owner (fallback)
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

// Query để lấy thông tin chi tiết của một domain
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

// Hàm helper để fetch domains của owner
export async function fetchDomainsByOwner(owner: string): Promise<Domain[]> {
  try {
    console.log('=== FETCHING DOMAINS FROM GRAPHQL ===')
    console.log('Owner:', owner)
    console.log('Subgraph URL:', process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL)
    
    let response: DomainsResponse
    
    // Thử lấy tất cả domains trước
    try {
      console.log('Trying to fetch all domains first...')
      response = await graphqlClient.request<DomainsResponse>(GET_ALL_DOMAINS)
      console.log('All domains fetched:', response.domains.length)
    } catch (allDomainsError) {
      console.log('Failed to fetch all domains, trying owner filter...', allDomainsError)
      // Fallback: thử filter theo owner
      response = await graphqlClient.request<DomainsResponse>(
        GET_DOMAINS_BY_OWNER,
        { owner: owner.toLowerCase() }
      )
    }
    
    console.log('Raw GraphQL response:', response)
    console.log('Domains count:', response.domains.length)
    
    // Filter domains theo owner và clean up
    const ownerDomains = []
    
    for (const domain of response.domains) {
      // Kiểm tra owner match - có thể là direct owner hoặc NameWrapper
      const directOwnerMatch = domain.owner?.id?.toLowerCase() === owner.toLowerCase()
      
      if (directOwnerMatch) {
        console.log('Domain directly owned by user:', domain.name)
        ownerDomains.push(domain)
        continue
      }
      
      // Nếu không match direct owner, có thể domain được wrapped trong NameWrapper
      // Trong trường hợp này, domain.owner sẽ là NameWrapper contract address
      // và chúng ta cần kiểm tra NameWrapper owner
      
      console.log('Domain not directly owned by user:', domain.name, 'Owner:', domain.owner?.id)
      
      // Kiểm tra NameWrapper ownership
      try {
        const ownershipResult = await checkNameWrapperOwnership(domain.name, owner)
        if (ownershipResult.isOwner) {
          console.log('Domain owned by user via NameWrapper:', domain.name)
          
          // Tạo domain object mới với owner thực tế thay vì NameWrapper
          const domainWithRealOwner = {
            ...domain,
            owner: {
              id: ownershipResult.realOwner || owner // Sử dụng realOwner từ NameWrapper
            }
          }
          
          ownerDomains.push(domainWithRealOwner)
        } else {
          console.log('Domain not owned by user via NameWrapper:', domain.name)
        }
      } catch (error) {
        console.log('Error checking NameWrapper ownership for:', domain.name, error)
        // Không thêm domain nếu có lỗi
      }
    }
    
    console.log('Domains owned by user:', ownerDomains.length)
    
    // Filter và clean up domains
    const validDomains = ownerDomains.filter(domain => {
      // Bỏ qua domains có name là hash hoặc labelName null
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

// Hàm helper để fetch chi tiết domain
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

// Hàm để test subgraph trực tiếp
export async function testSubgraphConnection(): Promise<void> {
  try {
    console.log('=== TESTING SUBGRAPH CONNECTION ===')
    console.log('Subgraph URL:', process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL || 'http://103.69.99.58:8000/subgraphs/name/graphprotocol/ens_hii')
    
    const testQuery = `
      query TestQuery {
        domains(first: 10) {
          id
          name
          labelName
          owner {
            id
          }
        }
      }
    `
    
    const response = await graphqlClient.request<DomainsResponse>(testQuery)
    console.log('Subgraph test response:', response)
    console.log('Total domains in subgraph:', response.domains.length)
    
    // Log chi tiết từng domain
    response.domains.forEach((domain: Domain, index: number) => {
      console.log(`Domain ${index + 1}:`, {
        name: domain.name,
        labelName: domain.labelName,
        owner: domain.owner?.id,
        id: domain.id
      })
    })
    
  } catch (error) {
    console.error('Subgraph connection test failed:', error)
  }
}

// Hàm để check NameWrapper ownership và lấy owner thực tế
async function checkNameWrapperOwnership(domainName: string, userAddress: string): Promise<{ isOwner: boolean; realOwner?: string }> {
  try {
    // Tạo public client
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
    const NAME_WRAPPER_ADDRESS = ENS_CONTRACTS.NAME_WRAPPER
    
    if (!NAME_WRAPPER_ADDRESS || NAME_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log('NameWrapper address not configured')
      return { isOwner: false }
    }

    // Tạo domain node
    const node = namehash(domainName)
    
    // Kiểm tra owner từ NameWrapper
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

// Hàm để test với owner cụ thể
export async function testSubgraphWithOwner(owner: string): Promise<void> {
  try {
    console.log('=== TESTING SUBGRAPH WITH OWNER ===')
    console.log('Owner:', owner)
    
    const testQuery = `
      query TestQueryWithOwner {
        domains(first: 100) {
          id
          name
          labelName
          owner {
            id
          }
        }
      }
    `
    
    const response = await graphqlClient.request<DomainsResponse>(testQuery)
    console.log('All domains:', response.domains.length)
    
    // Filter domains theo owner
    const ownerDomains = response.domains.filter((domain: Domain) => 
      domain.owner?.id?.toLowerCase() === owner.toLowerCase()
    )
    
    console.log('Domains owned by user:', ownerDomains.length)
    ownerDomains.forEach((domain: Domain, index: number) => {
      console.log(`User Domain ${index + 1}:`, {
        name: domain.name,
        labelName: domain.labelName,
        owner: domain.owner?.id
      })
    })
    
  } catch (error) {
    console.error('Subgraph owner test failed:', error)
  }
}