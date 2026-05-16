import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  })

  console.log('📧 Emails in database:\n')
  users.forEach(u => console.log(`${u.role}: ${u.email}`))
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
