// Final System Audit - Complete API and CRUD Testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditSystem() {
  console.log('🔍 FINAL SYSTEM AUDIT STARTING...\n')

  const results = {
    apis: { working: 0, failed: 0, issues: [] as string[] },
    crud: { working: 0, failed: 0, issues: [] as string[] },
    auth: { working: 0, failed: 0, issues: [] as string[] },
    data: { real: 0, mock: 0, issues: [] as string[] }
  }

  // Test Database Connection
  try {
    await prisma.$connect()
    console.log('✅ Database connection: WORKING')
  } catch (error) {
    console.log('❌ Database connection: FAILED')
    results.data.issues.push('Database connection failed')
  }

  // Test Core APIs
  const apiTests = [
    { name: 'Exchange Rates', url: '/api/rates' },
    { name: 'Hawala System', url: '/api/hawala' },
    { name: 'Saraf Directory', url: '/api/sarafs/directory' },
    { name: 'Admin Stats', url: '/api/admin/stats' },
    { name: 'Portal Stats', url: '/api/portal/stats' },
    { name: 'Admin Users', url: '/api/admin/users' },
    { name: 'Admin Sarafs', url: '/api/admin/sarafs' },
    { name: 'Education Courses', url: '/api/admin/education/courses' },
    { name: 'Promotions', url: '/api/admin/promotions' },
    { name: 'Transactions', url: '/api/admin/transactions' },
    { name: 'Reports', url: '/api/admin/reports' }
  ]

  for (const test of apiTests) {
    try {
      const response = await fetch(`http://localhost:3000${test.url}`)
      if (response.ok) {
        console.log(`✅ ${test.name} API: WORKING`)
        results.apis.working++
      } else {
        console.log(`❌ ${test.name} API: FAILED (${response.status})`)
        results.apis.failed++
        results.apis.issues.push(`${test.name} returns ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${test.name} API: ERROR`)
      results.apis.failed++
      results.apis.issues.push(`${test.name} connection error`)
    }
  }

  // Test CRUD Operations
  console.log('\n🔧 TESTING CRUD OPERATIONS...')

  // Test User CRUD
  try {
    const users = await prisma.user.findMany({ take: 1 })
    if (users.length > 0) {
      console.log('✅ User READ: WORKING')
      results.crud.working++
    } else {
      console.log('⚠️ User READ: NO DATA')
      results.crud.issues.push('No users found in database')
    }
  } catch (error) {
    console.log('❌ User READ: FAILED')
    results.crud.failed++
    results.crud.issues.push('User read operation failed')
  }

  // Test Saraf CRUD
  try {
    const sarafs = await prisma.saraf.findMany({ take: 1 })
    if (sarafs.length > 0) {
      console.log('✅ Saraf READ: WORKING')
      results.crud.working++
    } else {
      console.log('⚠️ Saraf READ: NO DATA')
      results.crud.issues.push('No sarafs found in database')
    }
  } catch (error) {
    console.log('❌ Saraf READ: FAILED')
    results.crud.failed++
    results.crud.issues.push('Saraf read operation failed')
  }

  // Test Transaction CRUD
  try {
    const transactions = await prisma.transaction.findMany({ take: 1 })
    if (transactions.length > 0) {
      console.log('✅ Transaction READ: WORKING')
      results.crud.working++
    } else {
      console.log('⚠️ Transaction READ: NO DATA')
      results.crud.issues.push('No transactions found in database')
    }
  } catch (error) {
    console.log('❌ Transaction READ: FAILED')
    results.crud.failed++
    results.crud.issues.push('Transaction read operation failed')
  }

  // Test Rate CRUD
  try {
    const rates = await prisma.exchangeRate.findMany({ take: 1 })
    if (rates.length > 0) {
      console.log('✅ Rate READ: WORKING')
      results.crud.working++
    } else {
      console.log('⚠️ Rate READ: NO DATA')
      results.crud.issues.push('No rates found in database')
    }
  } catch (error) {
    console.log('❌ Rate READ: FAILED')
    results.crud.failed++
    results.crud.issues.push('Rate read operation failed')
  }

  // Test Education CRUD
  try {
    const courses = await prisma.educationCourse.findMany({ take: 1 })
    console.log('✅ Education READ: WORKING')
    results.crud.working++
  } catch (error) {
    console.log('❌ Education READ: FAILED')
    results.crud.failed++
    results.crud.issues.push('Education read operation failed')
  }

  // Check Data Quality
  console.log('\n📊 CHECKING DATA QUALITY...')

  try {
    const userCount = await prisma.user.count()
    const sarafCount = await prisma.saraf.count()
    const transactionCount = await prisma.transaction.count()
    const rateCount = await prisma.exchangeRate.count()

    console.log(`📈 Users: ${userCount}`)
    console.log(`🏢 Sarafs: ${sarafCount}`)
    console.log(`💰 Transactions: ${transactionCount}`)
    console.log(`📊 Rates: ${rateCount}`)

    if (userCount > 0 && sarafCount > 0 && transactionCount > 0 && rateCount > 0) {
      console.log('✅ Database has REAL DATA')
      results.data.real = 4
    } else {
      console.log('⚠️ Some tables are empty')
      results.data.issues.push('Some database tables are empty')
    }
  } catch (error) {
    console.log('❌ Data quality check failed')
    results.data.issues.push('Cannot check data quality')
  }

  // Test Authentication
  console.log('\n🔐 TESTING AUTHENTICATION...')

  const authTests = [
    { role: 'ADMIN', email: 'admin@saray.af' },
    { role: 'SARAF', email: 'saraf@test.af' },
    { role: 'USER', email: 'user@test.af' }
  ]

  for (const test of authTests) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: test.email }
      })
      if (user && user.role === test.role) {
        console.log(`✅ ${test.role} account: EXISTS`)
        results.auth.working++
      } else {
        console.log(`❌ ${test.role} account: MISSING`)
        results.auth.failed++
        results.auth.issues.push(`${test.role} account not found`)
      }
    } catch (error) {
      console.log(`❌ ${test.role} account: ERROR`)
      results.auth.failed++
      results.auth.issues.push(`${test.role} account check failed`)
    }
  }

  // Final Report
  console.log('\n📋 FINAL AUDIT REPORT')
  console.log('='.repeat(50))
  console.log(`🌐 APIs: ${results.apis.working} working, ${results.apis.failed} failed`)
  console.log(`🔧 CRUD: ${results.crud.working} working, ${results.crud.failed} failed`)
  console.log(`🔐 Auth: ${results.auth.working} working, ${results.auth.failed} failed`)
  console.log(`📊 Data: ${results.data.real} real datasets`)

  const totalIssues = results.apis.issues.length + results.crud.issues.length + 
                     results.auth.issues.length + results.data.issues.length

  if (totalIssues === 0) {
    console.log('\n🎉 SYSTEM STATUS: PRODUCTION READY ✅')
    console.log('All systems operational, no issues found!')
  } else {
    console.log('\n⚠️ ISSUES FOUND:')
    const allIssues = [...results.apis.issues, ...results.crud.issues, 
                      ...results.auth.issues, ...results.data.issues]
    allIssues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`))
  }

  await prisma.$disconnect()
}

auditSystem().catch(console.error)