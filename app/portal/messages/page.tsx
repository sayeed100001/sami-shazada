import { redirect } from 'next/navigation'

export default function PortalMessagesRedirect({
  searchParams,
}: {
  searchParams?: { sessionId?: string }
}) {
  const sessionId = typeof searchParams?.sessionId === 'string' ? searchParams.sessionId : ''
  redirect(sessionId ? `/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(sessionId)}` : '/portal/internal-chat?tab=customers')
}
