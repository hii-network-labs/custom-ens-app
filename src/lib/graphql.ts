import { GraphQLClient } from 'graphql-request'

// GraphQL client cho The Graph API
export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_CUSTOM_NETWORK_SUBGRAPH_URL!
)

// Query để lấy danh sách domains của một owner
export const GET_DOMAINS_BY_OWNER = `
  query GetDomainsByOwner($owner: String!) {
    domains(
      where: { owner: $owner }
      orderBy: createdAt
      orderDirection: desc
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
    const response = await graphqlClient.request<DomainsResponse>(
      GET_DOMAINS_BY_OWNER,
      { owner: owner.toLowerCase() }
    )
    return response.domains
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