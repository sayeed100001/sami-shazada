import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testHawalaSystem() {
  console.log('🧪 Testing Hawala System...')

  try {
    // Check if we have sarafs
    const sarafs = await prisma.saraf.findMany({
      where: {
        status: 'APPROVED',
        isActive: true
      },
      include: {
        user: {
          select: { name: true, email: true }
        },
        rates: {
          where: { isActive: true },
          take: 3
        }
      }
    })

    console.log(`✅ Found ${sarafs.length} active sarafs`)
    
    sarafs.forEach((saraf, index) => {
      console.log(`${index + 1}. ${saraf.businessName}`)
      console.log(`   - Owner: ${saraf.user.name} (${saraf.user.email})`)
      console.log(`   - Rating: ${saraf.rating}/5`)
      console.log(`   - Transactions: ${saraf.totalTransactions}`)
      console.log(`   - Active Rates: ${saraf.rates.length}`)
      console.log(`   - Premium: ${saraf.isPremium ? 'Yes' : 'No'}`)
      console.log(`   - Featured: ${saraf.isFeatured ? 'Yes' : 'No'}`)
      console.log('')
    })

    // Check transactions
    const transactions = await prisma.transaction.findMany({
      where: { type: 'HAWALA' },
      include: {
        saraf: {
          select: { businessName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    console.log(`✅ Found ${transactions.length} hawala transactions`)
    
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.referenceCode}`)
      console.log(`   - Amount: ${tx.fromAmount} ${tx.fromCurrency} → ${tx.toAmount} ${tx.toCurrency}`)
      console.log(`   - Status: ${tx.status}`)
      console.log(`   - Saraf: ${tx.saraf.businessName}`)
      console.log(`   - Created: ${tx.createdAt.toLocaleDateString()}`)
      console.log('')
    })

    // Check ratings
    const ratings = await prisma.sarafRating.findMany({
      include: {
        user: { select: { name: true } },
        saraf: { select: { businessName: true } }
      },
      take: 5
    })

    console.log(`✅ Found ${ratings.length} saraf ratings`)
    
    ratings.forEach((rating, index) => {
      console.log(`${index + 1}. ${rating.user.name} → ${rating.saraf.businessName}`)
      console.log(`   - Rating: ${rating.rating}/5`)
      console.log(`   - Comment: ${rating.comment || 'No comment'}`)
      console.log('')
    })

    console.log('🎉 Hawala system test completed successfully!')

  } catch (error) {
    console.error('❌ Hawala system test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testHawalaSystem()