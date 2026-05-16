import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getBackupContentType(filename: string) {
  if (filename.endsWith('.gz')) return 'application/gzip'
  if (filename.endsWith('.sql')) return 'application/sql'
  if (filename.endsWith('.db')) return 'application/vnd.sqlite3'
  return 'application/octet-stream'
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

    // Get backup info from SystemConfig
    const backupConfig = await prisma.systemConfig.findUnique({
      where: { key: `backup_${params.id}` }
    })

    if (!backupConfig) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const backupData = JSON.parse(backupConfig.value)

    // Check if backup file exists
    if (!fs.existsSync(backupData.path)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    // Read the backup file
    const fileBuffer = fs.readFileSync(backupData.path)

    // Log the download
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_DOWNLOADED',
        resource: 'BACKUP',
        resourceId: params.id,
        details: JSON.stringify({
          filename: backupData.filename,
          size: backupData.size,
          type: backupData.type
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Return file as download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getBackupContentType(backupData.filename || ''),
        'Content-Disposition': `attachment; filename="${backupData.filename}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Error downloading backup:', error)
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

    // Get backup info
    const backupConfig = await prisma.systemConfig.findUnique({
      where: { key: `backup_${params.id}` }
    })

    if (!backupConfig) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const backupData = JSON.parse(backupConfig.value)

    // Delete backup file if exists
    if (fs.existsSync(backupData.path)) {
      fs.unlinkSync(backupData.path)
    }

    // Delete backup record
    await prisma.systemConfig.delete({
      where: { key: `backup_${params.id}` }
    })

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_DELETED',
        resource: 'BACKUP',
        resourceId: params.id,
        details: JSON.stringify({
          filename: backupData.filename,
          type: backupData.type
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'Backup deleted successfully' })

  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
