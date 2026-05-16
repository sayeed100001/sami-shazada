// Environment variables validation
export function validateEnvironmentVariables() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.warn('DATABASE_URL should use PostgreSQL for production deployment')
  }

  console.log('✅ Environment variables validated successfully')
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnvironmentVariables()
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    process.exit(1)
  }
}