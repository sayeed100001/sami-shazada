import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentId = params.id
    const { title, type, content, url, position, isActive } = await request.json()

    if (!title || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const contentItem = await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        title,
        type,
        content: content || '',
        url: url || null,
        position: position || 'DASHBOARD',
        isActive: isActive !== false,
        updatedAt: new Date()
      }
    })

    await prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CONTENT_UPDATED',
          resource: 'CONTENT',
          resourceId: contentItem.id,
          details: `Updated content: ${title}`
        }
      })
      .catch((auditError) => {
        console.warn('Failed to create audit log:', auditError)
      })

    return NextResponse.json(contentItem)
  } catch (error) {
    console.error('Content update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentId = params.id

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentId },
      select: { title: true }
    })

    if (!contentItem) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    await prisma.contentItem.delete({
      where: { id: contentId }
    })

    await prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CONTENT_DELETED',
          resource: 'CONTENT',
          resourceId: contentId,
          details: `Deleted content: ${contentItem.title}`
        }
      })
      .catch((auditError) => {
        console.warn('Failed to create audit log:', auditError)
      })

    return NextResponse.json(
      {
        success: true,
        message: 'Content deleted successfully',
        deletedId: contentId
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      }
    )
  } catch (error) {
    console.error('Content deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentId = params.id

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentId }
    })

    if (!contentItem) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json(contentItem, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    })
  } catch (error) {
    console.error('Content fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
