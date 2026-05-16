const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createSarafUser() {
  try {
    console.log('Creating saraf user...')

    // Hash password
    const hashedPassword = await bcrypt.hash('saraf123', 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: 'احمد صرافی',
        email: 'saraf@shahzada.com',
        password: hashedPassword,
        phone: '+93701234567',
        role: 'SARAF',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    })

    console.log('User created:', user.email)

    // Create saraf profile
    const saraf = await prisma.saraf.create({
      data: {
        userId: user.id,
        businessName: 'صرافی احمد',
        businessAddress: 'کابل، افغانستان - خیابان چهارراهی حاجی یعقوب',
        businessPhone: '+93701234567',
        licenseNumber: 'SAR-2024-001',
        status: 'APPROVED',
        isActive: true,
        isPremium: false,
        rating: 4.5,
        totalTransactions: 0,
        creditBalance: 1000,
      },
    })

    console.log('Saraf profile created:', saraf.businessName)
    console.log('\n✅ Saraf user created successfully!')
    console.log('📧 Email: saraf@shahzada.com')
    console.log('🔑 Password: saraf123')
    console.log('🏢 Business: صرافی احمد')
    console.log('💳 Credit Balance: 1000')
    console.log('✨ Status: APPROVED')

  } catch (error) {
    console.error('Error creating saraf user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createSarafUser()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
