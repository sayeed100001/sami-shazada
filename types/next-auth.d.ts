import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      avatarUrl?: string | null
      role: string
      sarafId?: string
      sarafStatus?: string
      sessionId?: string
    }
    error?: string
  }

  interface User {
    avatarUrl?: string | null
    role: string
    sarafId?: string
    sarafStatus?: string
    sessionId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    avatarUrl?: string | null
    role?: string
    sarafId?: string
    sarafStatus?: string
    sessionId?: string
    error?: string
  }
}
