import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ManagementPortalPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  switch (session.user.role) {
    case 'ADMIN':
      redirect('/admin')
    case 'SARAF':
    case 'BRANCH_MANAGER':
    case 'BRANCH_STAFF':
      redirect('/portal')
    default:
      redirect('/user')
  }
}
