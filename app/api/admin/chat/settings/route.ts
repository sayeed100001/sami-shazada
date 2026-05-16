import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.portalMessengerSettings.findFirst()
    if (!settings) {
      settings = await prisma.portalMessengerSettings.create({
        data: {
          maxUploadBytes: 300 * 1024,
          maxImageBytes: 300 * 1024,
          maxAudioBytes: 300 * 1024,
          maxDocumentBytes: 300 * 1024,
          maxRecordingSec: 18,
          audioBitsPerSec: 24000,
          maxStoriesPerUser: 8,
          storyTTLHours: 24,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[SETTINGS_FETCH_ERROR] Full detail:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      maxUploadBytes,
      maxImageBytes,
      maxAudioBytes,
      maxDocumentBytes,
      maxRecordingSec,
      audioBitsPerSec,
      maxStoriesPerUser,
      storyTTLHours,
    } = body

    const existing = await prisma.portalMessengerSettings.findFirst()

    let settings
    if (existing) {
      settings = await prisma.portalMessengerSettings.update({
        where: { id: existing.id },
        data: {
          maxUploadBytes,
          maxImageBytes,
          maxAudioBytes,
          maxDocumentBytes,
          maxRecordingSec,
          audioBitsPerSec,
          maxStoriesPerUser,
          storyTTLHours,
        },
      })
    } else {
      settings = await prisma.portalMessengerSettings.create({
        data: {
          maxUploadBytes,
          maxImageBytes,
          maxAudioBytes,
          maxDocumentBytes,
          maxRecordingSec,
          audioBitsPerSec,
          maxStoriesPerUser,
          storyTTLHours,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update messenger settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
