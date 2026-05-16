import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        saraf: {
          select: {
            id: true,
            businessName: true,
            status: true,
            isActive: true,
            creditBalance: true,
            isOnFreeTrial: true,
            freeTrialEndDate: true,
            subscriptionExpiry: true,
            branches: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                city: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sarafId: session.user.sarafId,
        sarafStatus: session.user.sarafStatus
      },
      database: {
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          hasSaraf: !!user.saraf
        } : null,
        saraf: user?.saraf ? {
          id: user.saraf.id,
          businessName: user.saraf.businessName,
          status: user.saraf.status,
          isActive: user.saraf.isActive,
          creditBalance: user.saraf.creditBalance,
          isOnFreeTrial: user.saraf.isOnFreeTrial,
          freeTrialEndDate: user.saraf.freeTrialEndDate,
          subscriptionExpiry: user.saraf.subscriptionExpiry,
          branchCount: user.saraf.branches.length,
          branches: user.saraf.branches
        } : null
      },
      diagnosis: {
        canAccessPortal: user?.role === 'SARAF' && user?.saraf?.status === 'APPROVED' && user?.saraf?.isActive,
        hasBranches: (user?.saraf?.branches.length || 0) > 0,
        hasCredits: (user?.saraf?.creditBalance || 0) > 0,
        hasActiveSubscription: user?.saraf?.isOnFreeTrial || (user?.saraf?.subscriptionExpiry && new Date(user.saraf.subscriptionExpiry) > new Date())
      }
    })
  } catch (error) {
    console.error('Debug status error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch debug status',
      details: 'Internal error'
    }, { status: 500 })
  }
}
