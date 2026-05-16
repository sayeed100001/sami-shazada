import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function verify() {
  console.log('🔍 Verifying credentials...\n')

  const testCredentials = [
    { email: 'admin@saray.af', password: 'Admin@123456', role: 'ADMIN' },
    { email: 'saraf@test.af', password: 'Saraf@123456', role: 'SARAF' },
    { email: 'user@test.af', password: 'User@123456', role: 'USER' }
  ]

  for (const cred of testCredentials) {
    const user = await prisma.user.findUnique({
      where: { email: cred.email }
    })

    if (!user) {
      console.log(`❌ ${cred.role}: User not found (${cred.email})`)
      continue
    }

    const isValid = await bcrypt.compare(cred.password, user.password)
    
    if (isValid) {
      console.log(`✅ ${cred.role}: ${cred.email} / ${cred.password} - VALID`)
    } else {
      console.log(`❌ ${cred.role}: ${cred.email} / ${cred.password} - INVALID PASSWORD`)
    }
  }

  console.log('\n✅ Verification complete!')
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
