import { getSession, signOut } from 'next-auth/react'
import { toast } from '@/components/ui/use-toast'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
  retries?: number
  retryDelay?: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function ensureAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return Boolean(session?.user)
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    skipAuth = false,
    retries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    ...fetchOptions
  } = options

  if (!skipAuth) {
    const isAuthed = await ensureAuthenticated()
    if (!isAuthed) {
      await signOut({ redirect: false })
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin?error=unauthorized'
      }
      throw new Error('Unauthorized')
    }
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers = new Headers(fetchOptions.headers)

      // Add default headers
      if (
        !headers.has('Content-Type') &&
        fetchOptions.method &&
        fetchOptions.method !== 'GET' &&
        !(fetchOptions.body instanceof FormData)
      ) {
        headers.set('Content-Type', 'application/json')
      }

      // Add cache control for API requests
      if (url.startsWith('/api/') && !headers.has('Cache-Control')) {
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        headers.set('Pragma', 'no-cache')
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: fetchOptions.credentials ?? 'include',
      })

      if (response.status === 401) {
        await signOut({ redirect: false })
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin?error=session_expired'
        }
        throw new Error('Unauthorized')
      }

      if (response.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to perform this action',
          variant: 'destructive',
        })
        throw new Error('Forbidden')
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay
        await new Promise(resolve => setTimeout(resolve, delay))
        throw new Error('Rate limited')
      }

      return response
    } catch (error) {
      lastError = error as Error

      if (attempt === retries - 1) {
        toast({
          title: 'Request Failed',
          description: `Failed to complete request: ${lastError.message}`,
          variant: 'destructive',
        })
        break
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
    }
  }

  throw lastError || new Error('Request failed')
}

// Helper function for common HTTP methods
export const authFetch = {
  get: (url: string, options: FetchOptions = {}) =>
    fetchWithAuth(url, { ...options, method: 'GET' }),

  post: (url: string, data: any, options: FetchOptions = {}) =>
    fetchWithAuth(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (url: string, data: any, options: FetchOptions = {}) =>
    fetchWithAuth(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (url: string, options: FetchOptions = {}) =>
    fetchWithAuth(url, { ...options, method: 'DELETE' }),

  patch: (url: string, data: any, options: FetchOptions = {}) =>
    fetchWithAuth(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
