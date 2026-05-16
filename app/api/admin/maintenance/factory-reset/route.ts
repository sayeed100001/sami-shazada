import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const REQUIRED_PHRASE = 'RESET ALL DATA'

function isFactoryResetAllowed() {
  const raw = String(process.env.ALLOW_FACTORY_RESET || '')
  const normalized = raw.trim().replace(/^"+|"+$/g, '').toLowerCase()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = String(process.env.ALLOW_FACTORY_RESET || '')
    const normalized = raw.trim().replace(/^"+|"+$/g, '').toLowerCase()
    const allowed = isFactoryResetAllowed()

    return NextResponse.json({
      allowed,
      env: {
        vercel: process.env.VERCEL || null,
        vercelEnv: process.env.VERCEL_ENV || null,
        vercelUrl: process.env.VERCEL_URL || null,
      },
      allowFactoryReset: {
        raw: raw ? raw.slice(0, 64) : null,
        normalized: normalized ? normalized.slice(0, 64) : null,
      },
      note: 'If you changed env vars in Vercel, you must redeploy the Production deployment for functions to pick it up.',
    })
  } catch (error) {
    console.error('Factory reset status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isFactoryResetAllowed()) {
      const raw = String(process.env.ALLOW_FACTORY_RESET || '')
      const normalized = raw.trim().replace(/^"+|"+$/g, '').toLowerCase()
      return NextResponse.json(
        {
          error:
            'Factory reset is disabled. Set ALLOW_FACTORY_RESET=true (Production env) and redeploy to enable.',
          details: {
            vercel: process.env.VERCEL || null,
            vercelEnv: process.env.VERCEL_ENV || null,
            vercelUrl: process.env.VERCEL_URL || null,
            allowFactoryResetValue: raw ? raw.slice(0, 24) : null,
            allowFactoryResetNormalized: normalized ? normalized.slice(0, 24) : null,
            note:
              'If you just added the env var in Vercel, you must redeploy the Production deployment for serverless functions to pick it up.',
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const confirm = Boolean(body?.confirm)
    const phrase = String(body?.phrase || '')
    if (!confirm || phrase.trim() !== REQUIRED_PHRASE) {
      return NextResponse.json(
        { error: `Confirmation required. Type exactly: ${REQUIRED_PHRASE}` },
        { status: 400 }
      )
    }

    const adminUserId = session.user.id

    const result = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {}

      // Child tables first (avoid FK violations).
      counts.internalChatMessageReactions = (await tx.internalChatMessageReaction.deleteMany({})).count
      counts.internalChatMessages = (await tx.internalChatMessage.deleteMany({})).count
      counts.internalChatParticipants = (await tx.internalChatParticipant.deleteMany({})).count
      counts.internalChats = (await tx.internalChat.deleteMany({})).count

      counts.guestChatMessages = (await tx.guestChatMessage.deleteMany({})).count
      counts.guestChatSessions = (await tx.guestChatSession.deleteMany({})).count
      counts.guestTransactions = (await tx.guestTransaction.deleteMany({})).count

      counts.portalStoryViews = (await tx.portalStoryView.deleteMany({})).count
      counts.portalStoryLikes = (await tx.portalStoryLike.deleteMany({})).count
      counts.portalStories = (await tx.portalStory.deleteMany({})).count
      counts.portalConnections = (await tx.portalConnectionRequest.deleteMany({})).count
      counts.portalMessengerSettings = (await tx.portalMessengerSettings.deleteMany({})).count

      counts.chatMessages = (await tx.chatMessage.deleteMany({})).count
      counts.chatSessions = (await tx.chatSession.deleteMany({})).count

      counts.transactionShares = (await tx.transactionShare.deleteMany({})).count
      counts.userFavorites = (await tx.userFavorite.deleteMany({})).count
      counts.userWatchlists = (await tx.userWatchlist.deleteMany({})).count

      counts.chartAlerts = (await tx.chartAlert.deleteMany({})).count
      counts.priceHistory = (await tx.priceHistory.deleteMany({})).count
      counts.marketData = (await tx.marketData.deleteMany({})).count
      counts.chartDrawings = (await tx.chartDrawing.deleteMany({})).count
      counts.chartLayouts = (await tx.chartLayout.deleteMany({})).count

      counts.userCourseEnrollments = (await tx.userCourseEnrollment.deleteMany({})).count
      counts.userLessonProgress = (await tx.userLessonProgress.deleteMany({})).count
      counts.educationLessons = (await tx.educationLesson.deleteMany({})).count
      counts.educationCourses = (await tx.educationCourse.deleteMany({})).count
      counts.techNews = (await tx.techNews.deleteMany({})).count

      counts.discountCodeUsage = (await tx.discountCodeUsage.deleteMany({})).count
      counts.creditTransactions = (await tx.creditTransaction.deleteMany({})).count
      counts.transactions = (await tx.transaction.deleteMany({})).count

      counts.sarafRatings = (await tx.sarafRating.deleteMany({})).count
      counts.rates = (await tx.rate.deleteMany({})).count
      counts.documents = (await tx.document.deleteMany({})).count

      counts.subscriptions = (await tx.subscription.deleteMany({})).count
      counts.advertisements = (await tx.advertisement.deleteMany({})).count
      counts.promotions = (await tx.promotionRequest.deleteMany({})).count

      counts.notifications = (await tx.notification.deleteMany({})).count
      counts.termsAcceptances = (await tx.termsAcceptance.deleteMany({})).count
      counts.userRewards = (await tx.userReward.deleteMany({})).count
      counts.otps = (await tx.oTP.deleteMany({})).count

      counts.blacklist = (await tx.blacklist.deleteMany({})).count
      counts.adminStatsSnapshots = (await tx.adminStatsSnapshot.deleteMany({})).count
      counts.auditLogs = (await tx.auditLog.deleteMany({})).count

      counts.branchStaff = (await tx.branchStaff.deleteMany({})).count
      counts.sarafBranches = (await tx.sarafBranch.deleteMany({})).count
      counts.sarafs = (await tx.saraf.deleteMany({})).count

      // Delete all users except the current admin (prevents locking yourself out).
      counts.users = (await tx.user.deleteMany({ where: { id: { not: adminUserId } } })).count

      return counts
    })

    return NextResponse.json({
      success: true,
      deleted: result,
      kept: { adminUserId },
    })
  } catch (error) {
    console.error('Factory reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
