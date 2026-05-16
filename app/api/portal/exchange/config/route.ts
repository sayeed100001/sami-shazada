import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { resolvePortalAccessContext } from '@/lib/saraf-access'
import { getSarafOperationalState } from '@/lib/hawala-service'
import { isSarafOnActiveFreeTrial } from '@/lib/transaction-pricing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ enabled: false }, { status: 200 })
  }

  if (!['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
    return NextResponse.json({ enabled: false }, { status: 200 })
  }

  const enabledByFlag = await ConfigEnforcer.isExchangeEnabledForUser(session.user.id)
  if (!enabledByFlag) {
    return NextResponse.json({ enabled: false, reason: 'FEATURE_DISABLED' }, { status: 200 })
  }

  const accessContext = await resolvePortalAccessContext({
    userId: session.user.id,
    role: session.user.role,
    sarafId: session.user.sarafId,
  })
  if (!accessContext) {
    return NextResponse.json({ enabled: false, reason: 'NO_SARAF_ACCESS' }, { status: 200 })
  }

  const operationalState = await getSarafOperationalState(accessContext.sarafId)
  if (!operationalState.saraf || !operationalState.isOperational) {
    return NextResponse.json(
      { enabled: false, reason: operationalState.requiresSubscription ? 'SUBSCRIPTION_REQUIRED' : 'NOT_OPERATIONAL' },
      { status: 200 }
    )
  }

  if (isSarafOnActiveFreeTrial(operationalState.saraf)) {
    const included = await ConfigEnforcer.isExchangeIncludedInFreeTrial()
    if (!included) {
      return NextResponse.json({ enabled: false, reason: 'NOT_INCLUDED_IN_TRIAL' }, { status: 200 })
    }
  }

  return NextResponse.json({ enabled: true }, { status: 200 })
}
