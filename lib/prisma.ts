import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaListenersRegistered?: boolean
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error'] 
      : [],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

if (!globalForPrisma.prismaListenersRegistered) {
  globalForPrisma.prismaListenersRegistered = true

  // Graceful shutdown
  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error disconnecting from database:', error)
    }
  })

  process.on('SIGINT', async () => {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error disconnecting from database:', error)
    }
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error disconnecting from database:', error)
    }
    process.exit(0)
  })
}

// Enhanced health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Initialize database with proper error handling
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connection established successfully')
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// Database transaction helper
export async function withTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback)
}
