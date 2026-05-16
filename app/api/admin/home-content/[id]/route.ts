import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertAllowedManagedOrInternalImageUrl } from '@/lib/image-url-policy'
import { prisma } from '@/lib/prisma'
import { deleteManagedImage } from '@/lib/managed-image-storage'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import {
  HOME_PAGE_POSITION,
  HOME_PAGE_SECTIONS,
  normalizeHomePageLanguage,
  parseHomePageContentItem,
  serializeHomePageContent,
  type HomePageSection,
} from '@/lib/home-page-content'

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

    const existing = await prisma.contentItem.findFirst({
      where: {
        id: params.id,
        position: HOME_PAGE_POSITION,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const parsedExisting = parseHomePageContentItem(existing)
    if (!parsedExisting) {
      return NextResponse.json({ error: 'Content payload is invalid' }, { status: 500 })
    }

    const body = await request.json()

    const section = body.section !== undefined ? sanitizeInput(body.section) as HomePageSection : parsedExisting.section
    if (!HOME_PAGE_SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section type' }, { status: 400 })
    }

    const nextRecord = {
      section,
      title: body.title !== undefined ? sanitizeInput(body.title) : parsedExisting.title,
      badgeText:
        body.badgeText !== undefined
          ? (body.badgeText ? sanitizeInput(body.badgeText) : null)
          : parsedExisting.badgeText || null,
      subtitle: body.subtitle !== undefined ? (body.subtitle ? sanitizeInput(body.subtitle) : null) : parsedExisting.subtitle,
      description: body.description !== undefined ? (body.description ? sanitizeInput(body.description) : null) : parsedExisting.description,
      icon: body.icon !== undefined ? (body.icon ? sanitizeInput(body.icon) : null) : parsedExisting.icon,
      value: body.value !== undefined ? (body.value ? sanitizeInput(body.value) : null) : parsedExisting.value,
      linkUrl: body.linkUrl !== undefined ? (body.linkUrl ? sanitizeInput(body.linkUrl) : null) : parsedExisting.linkUrl,
      linkText: body.linkText !== undefined ? (body.linkText ? sanitizeInput(body.linkText) : null) : parsedExisting.linkText,
      imageUrl: body.imageUrl !== undefined ? (body.imageUrl ? sanitizeInput(body.imageUrl) : null) : parsedExisting.imageUrl,
      order: body.order !== undefined ? validateNumericInput(body.order) : parsedExisting.order,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : parsedExisting.isActive,
      language:
        body.language !== undefined
          ? normalizeHomePageLanguage(sanitizeInput(body.language))
          : parsedExisting.language,
    }

    assertAllowedManagedOrInternalImageUrl(nextRecord.imageUrl, 'imageUrl')

    const content = await prisma.contentItem.update({
      where: { id: params.id },
      data: serializeHomePageContent(nextRecord),
    })

    if (parsedExisting.imageUrl && parsedExisting.imageUrl !== nextRecord.imageUrl) {
      await deleteManagedImage(parsedExisting.imageUrl)
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HOME_CONTENT_UPDATED',
        resource: 'HOME_PAGE_CONTENT',
        resourceId: params.id,
        details: JSON.stringify({ section: nextRecord.section, title: nextRecord.title, language: nextRecord.language }),
      },
    })

    return NextResponse.json({ success: true, content: parseHomePageContentItem(content) })
  } catch (error) {
    console.error('Error updating home page content:', error)
    if (error instanceof Error && /managed upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const content = await prisma.contentItem.findFirst({
      where: {
        id: params.id,
        position: HOME_PAGE_POSITION,
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const parsed = parseHomePageContentItem(content)

    await prisma.contentItem.delete({
      where: { id: params.id },
    })

    await deleteManagedImage(parsed?.imageUrl || null)

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HOME_CONTENT_DELETED',
        resource: 'HOME_PAGE_CONTENT',
        resourceId: params.id,
        details: JSON.stringify({
          section: parsed?.section || content.type,
          title: parsed?.title || content.title,
          language: parsed?.language || 'fa',
        }),
      },
    })

    return NextResponse.json({ success: true, message: 'Content deleted successfully' })
  } catch (error) {
    console.error('Error deleting home page content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
