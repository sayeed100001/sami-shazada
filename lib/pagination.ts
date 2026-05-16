export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResult {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MIN_LIMIT = 1
const MAX_LIMIT = 100

export function parsePaginationParams(searchParams: URLSearchParams): {
  skip: number
  take: number
  page: number
  limit: number
} {
  const page = Math.max(DEFAULT_PAGE, parseInt(searchParams.get('page') || String(DEFAULT_PAGE)))
  const limit = Math.max(
    MIN_LIMIT,
    Math.min(MAX_LIMIT, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)))
  )

  const skip = (page - 1) * limit
  const take = limit

  return { skip, take, page, limit }
}

export function createPaginationResult(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

export function parseSortParams(searchParams: URLSearchParams, allowedFields: string[]): {
  sortBy: string
  sortOrder: 'asc' | 'desc'
} {
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  const validSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt'
  const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc'

  return {
    sortBy: validSortBy,
    sortOrder: validSortOrder
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationResult
) {
  return {
    success: true,
    data,
    pagination
  }
}
