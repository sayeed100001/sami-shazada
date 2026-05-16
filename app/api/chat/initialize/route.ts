import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let chatSession = await prisma.chatSession.findFirst({
      where: {
        userId: session.user.id,
        type: 'SUPPORT',
        isActive: true
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    let isNewSession = false
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          type: 'SUPPORT',
          isActive: true
        },
        include: {
          messages: true
        }
      })
      isNewSession = true
      
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          senderId: 'system',
          senderName: 'سیستم پشتیبانی',
          senderRole: 'SYSTEM',
          message: `سلام ${session.user.name} عزیز! چگونه میتوانیم به شما کمک کنیم؟`,
          isRead: false
        }
      })
      
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      })
      
      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'جلسه چت جدید',
            message: `${session.user.name} یک چت جدید شروع کرده است`,
            type: 'info',
            action: 'NEW_CHAT_SESSION',
            resource: 'CHAT',
            resourceId: chatSession.id
          }
        })
      }

      chatSession = await prisma.chatSession.findUnique({
        where: { id: chatSession.id },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      })
    }

    return NextResponse.json({ 
      sessionId: chatSession!.id,
      isNewSession,
      messages: chatSession?.messages || []
    })
  } catch (error) {
    console.error('Chat initialization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
