const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@shahzada.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@shahzada.com')
    console.log('Password: admin123')
    console.log('Role: ADMIN')
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
