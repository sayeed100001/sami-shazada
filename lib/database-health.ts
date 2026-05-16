import { prisma } from './prisma'

export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to test database connection
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

export async function checkDatabaseHealth() {
  try {
    const start = Date.now()
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`
    
    // Test table existence
    const userCount = await prisma.user.count()
    const sarafCount = await prisma.saraf.count()
    const transactionCount = await prisma.transaction.count()
    
    const responseTime = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime,
      tables: {
        users: userCount,
        sarafs: sarafCount,
        transactions: transactionCount
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

export async function initializeDatabase() {
  try {
    // Check if database is initialized
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      console.log('Initializing database with default data...')
      
      // Create default admin user
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash('Admin@2024!', 12)
      
      await prisma.user.create({
        data: {
          email: 'admin@sarayshazada.com',
          password: hashedPassword,
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true
        }
      })
      
      console.log('Database initialized successfully')
    }
    
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}