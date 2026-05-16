type HeaderBag =
  | Headers
  | {
      get(name: string): string | null | undefined
    }

type RequestLike = {
  nextUrl?: {
    origin?: string
  }
  headers?: HeaderBag
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

export function getConfiguredAppOrigin(): string {
  return (
    normalizeOrigin(process.env.NEXTAUTH_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeOrigin(process.env.VERCEL_BRANCH_URL) ||
    normalizeOrigin(process.env.VERCEL_URL) ||
    'http://localhost:3000'
  )
}

export function getRequestAppOrigin(request: RequestLike | null | undefined): string {
  const nextUrlOrigin = normalizeOrigin(request?.nextUrl?.origin)
  if (nextUrlOrigin) return nextUrlOrigin

  const forwardedHost = request?.headers?.get('x-forwarded-host')
  const host = request?.headers?.get('host')
  const proto = request?.headers?.get('x-forwarded-proto') || 'https'
  const headerOrigin = normalizeOrigin(`${proto}://${forwardedHost || host || ''}`)

  return headerOrigin || getConfiguredAppOrigin()
}
