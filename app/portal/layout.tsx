import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { isPortalRole } from '@/lib/portal-access'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const pathname = headers().get('x-pathname') || ''
  const isMessengerRoute =
    pathname.startsWith('/portal/internal-chat') || pathname.startsWith('/portal/messages')

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const isPortalUser = isPortalRole(session.user.role)
  const isAllowedUser = session.user.role === 'USER' && isMessengerRoute
  const isAllowedAdmin = session.user.role === 'ADMIN' && isMessengerRoute

  if (!isPortalUser && !isAllowedUser && !isAllowedAdmin) {
    redirect('/')
  }

  return <>{children}</>
}
