import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const lesson = await prisma.educationLesson.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Lesson fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    if (body.title) updateData.title = sanitizeInput(body.title)
    if (body.description) updateData.description = sanitizeInput(body.description)
    if (body.content) updateData.content = sanitizeInput(body.content)
    if (body.videoUrl) updateData.videoUrl = sanitizeInput(body.videoUrl)
    if (body.duration !== undefined) updateData.duration = parseInt(body.duration)
    if (body.order !== undefined) updateData.order = parseInt(body.order)
    if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished)

    const lesson = await prisma.educationLesson.update({
      where: { id },
      data: updateData
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LESSON_UPDATED',
        resource: 'EDUCATION',
        resourceId: lesson.id,
        details: JSON.stringify({ lessonId: id, updates: Object.keys(updateData) })
      }
    })

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Lesson update error:', error)
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.educationLesson.delete({
      where: { id }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LESSON_DELETED',
        resource: 'EDUCATION',
        resourceId: id,
        details: `Deleted lesson ${id}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lesson delete error:', error)
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 })
  }
}
