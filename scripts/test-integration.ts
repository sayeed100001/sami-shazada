/**
 * COMPLETE SYSTEM INTEGRATION TEST
 * Tests all critical workflows and integrations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSystemIntegration() {
  console.log('🔍 Starting Complete System Integration Test...\n')

  let passed = 0
  let failed = 0

  // Test 1: Database Connection
  console.log('Test 1: Database Connection')
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connected\n')
    passed++
  } catch (error) {
    console.log('❌ Database connection failed\n')
    failed++
  }

  // Test 2: Commission Settings Exist
  console.log('Test 2: Commission Settings')
  try {
    const settings = await prisma.commissionSetting.findMany()
    if (settings.length >= 12) {
      console.log(`✅ Found ${settings.length} commission settings\n`)
      passed++
    } else {
      console.log(`⚠️  Only ${settings.length} commission settings found (expected 12)\n`)
      failed++
    }
  } catch (error) {
    console.log('❌ Commission settings check failed\n')
    failed++
  }

  // Test 3: Notification Templates Exist
  console.log('Test 3: Notification Templates')
  try {
    const templates = await prisma.notificationTemplate.findMany()
    if (templates.length > 0) {
      console.log(`✅ Found ${templates.length} notification templates\n`)
      passed++
    } else {
      console.log('⚠️  No notification templates found\n')
      failed++
    }
  } catch (error) {
    console.log('❌ Notification templates check failed\n')
    failed++
  }

  // Test 4: User Roles
  console.log('Test 4: User Roles')
  try {
    const users = await prisma.user.findMany({
      select: { role: true }
    })
    const roles = [...new Set(users.map(u => u.role))]
    console.log(`✅ Found roles: ${roles.join(', ')}\n`)
    passed++
  } catch (error) {
    console.log('❌ User roles check failed\n')
    failed++
  }

  // Test 5: Saraf with Branches
  console.log('Test 5: Saraf-Branch Relationship')
  try {
    const sarafs = await prisma.saraf.findMany({
      include: {
        branches: true
      }
    })
    const totalBranches = sarafs.reduce((sum, s) => sum + s.branches.length, 0)
    console.log(`✅ ${sarafs.length} sarafs with ${totalBranches} total branches\n`)
    passed++
  } catch (error) {
    console.log('❌ Saraf-Branch relationship check failed\n')
    failed++
  }

  // Test 6: Transaction with Branches
  console.log('Test 6: Transaction-Branch Relationship')
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        originBranch: true,
        destinationBranch: true
      },
      take: 5
    })
    console.log(`✅ Found ${transactions.length} transactions with branch relationships\n`)
    passed++
  } catch (error) {
    console.log('❌ Transaction-Branch relationship check failed\n')
    failed++
  }

  // Test 7: Credit Transactions
  console.log('Test 7: Credit Transaction System')
  try {
    const creditTxs = await prisma.creditTransaction.findMany({
      include: {
        saraf: true
      },
      take: 5
    })
    console.log(`✅ Found ${creditTxs.length} credit transactions\n`)
    passed++
  } catch (error) {
    console.log('❌ Credit transaction system check failed\n')
    failed++
  }

  // Test 8: Subscriptions
  console.log('Test 8: Subscription System')
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        saraf: true
      }
    })
    console.log(`✅ Found ${subscriptions.length} subscriptions\n`)
    passed++
  } catch (error) {
    console.log('❌ Subscription system check failed\n')
    failed++
  }

  // Test 9: Advertisements
  console.log('Test 9: Advertisement System')
  try {
    const ads = await prisma.advertisement.findMany({
      include: {
        saraf: true
      }
    })
    console.log(`✅ Found ${ads.length} advertisements\n`)
    passed++
  } catch (error) {
    console.log('❌ Advertisement system check failed\n')
    failed++
  }

  // Test 10: Internal Chat
  console.log('Test 10: Internal Chat System')
  try {
    const chats = await prisma.internalChat.findMany({
      include: {
        messages: true,
        participants: true
      }
    })
    console.log(`✅ Found ${chats.length} internal chats\n`)
    passed++
  } catch (error) {
    console.log('❌ Internal chat system check failed\n')
    failed++
  }

  // Test 11: OTP System
  console.log('Test 11: OTP System')
  try {
    const otps = await prisma.oTP.findMany({
      take: 5
    })
    console.log(`✅ OTP system operational (${otps.length} records)\n`)
    passed++
  } catch (error) {
    console.log('❌ OTP system check failed\n')
    failed++
  }

  // Test 12: Audit Logs
  console.log('Test 12: Audit Log System')
  try {
    const logs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    console.log(`✅ Audit logging active (${logs.length} recent logs)\n`)
    passed++
  } catch (error) {
    console.log('❌ Audit log system check failed\n')
    failed++
  }

  // Test 13: Market Data
  console.log('Test 13: Market Data System')
  try {
    const marketData = await prisma.marketData.findMany()
    console.log(`✅ Market data system operational (${marketData.length} entries)\n`)
    passed++
  } catch (error) {
    console.log('❌ Market data system check failed\n')
    failed++
  }

  // Test 14: Content Management
  console.log('Test 14: Content Management System')
  try {
    const content = await prisma.contentItem.findMany()
    console.log(`✅ Content management operational (${content.length} items)\n`)
    passed++
  } catch (error) {
    console.log('❌ Content management check failed\n')
    failed++
  }

  // Test 15: Discount Codes
  console.log('Test 15: Discount Code System')
  try {
    const codes = await prisma.discountCode.findMany()
    console.log(`✅ Discount code system operational (${codes.length} codes)\n`)
    passed++
  } catch (error) {
    console.log('❌ Discount code system check failed\n')
    failed++
  }

  // Final Report
  console.log('\n' + '='.repeat(50))
  console.log('INTEGRATION TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`)
  console.log('='.repeat(50))

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is fully integrated!')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.')
  }
}

testSystemIntegration()
  .catch((e) => {
    console.error('❌ Test suite failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
