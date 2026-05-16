import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ConfigService } from '@/lib/config-service'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'
import os from 'os'
import { isVercelRuntime } from '@/lib/runtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const execAsync = promisify(exec)

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50MB (keep reasonable for free tiers)

function isSqliteUrl(url: string) {
  return url.startsWith('file:')
}

function isPostgresUrl(url: string) {
  return /^postgres(ql)?:\/\//.test(url)
}

function getEffectiveDatabaseUrl(target: 'primary' | 'backup', backupUrl: string | null) {
  if (target === 'backup') {
    if (!backupUrl?.trim()) {
      throw new Error('Backup database URL is not configured')
    }
    return backupUrl.trim()
  }
  const primaryUrl = process.env.DATABASE_URL || ''
  if (!primaryUrl.trim()) {
    throw new Error('DATABASE_URL not configured')
  }
  return primaryUrl.trim()
}

function safeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  return cleaned || `upload_${Date.now()}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backupsEnabled = (await ConfigService.get('admin_backups_enabled', 'false')) === 'true'
    if (!backupsEnabled) {
      return NextResponse.json({ error: 'Backups are disabled' }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get('file') as unknown as File | null
    const targetRaw = String(form.get('target') || 'primary')
    const confirm = String(form.get('confirm') || 'false') === 'true'
    const phrase = String(form.get('phrase') || '').trim()

    if (targetRaw !== 'primary' && targetRaw !== 'backup') {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    if (!confirm || phrase !== 'RESTORE DATABASE') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const backupDbUrl = await ConfigService.get('backup_database_url', '')
    const databaseUrl = getEffectiveDatabaseUrl(targetRaw as 'primary' | 'backup', backupDbUrl)

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    // Use OS temp directory. On Vercel only `/tmp` is writable, and we should never write into the repo.
    const backupsDir = os.tmpdir()

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = safeFilename(file.name)
    const tmpPath = path.join(backupsDir, `tmp-restore-${targetRaw}-${stamp}-${filename}`)

    fs.writeFileSync(tmpPath, buffer)

    try {
      if (isSqliteUrl(databaseUrl)) {
        const dbPath = databaseUrl.replace('file:', '') || './prisma/dev.db'
        const resolved = path.resolve(dbPath)

        // For SQLite we restore by replacing the database file (most robust on Windows).
        // This is only suitable for local/dev usage (serverless filesystems are ephemeral).
        fs.copyFileSync(tmpPath, resolved)

        await prisma.auditLog
          .create({
            data: {
              userId: session.user.id,
              action: 'DATABASE_RESTORED',
              resource: 'SYSTEM',
              details: JSON.stringify({
                target: targetRaw,
                engine: 'sqlite',
                bytes: file.size,
                filename: file.name,
              }),
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
            },
          })
          .catch(console.error)

        return NextResponse.json({ success: true })
      }

      if (!isPostgresUrl(databaseUrl)) {
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 })
      }

      // Production-safe stance: do not attempt Postgres restores on Vercel serverless.
      // Restore from your computer using `psql`, or use managed DB tooling.
      if (isVercelRuntime()) {
        return NextResponse.json(
          {
            error:
              'PostgreSQL restore is not available in this deployment runtime. Restore from your computer using psql, or use managed DB tooling.',
          },
          { status: 501 }
        )
      }

      // NOTE: On Vercel serverless runtime, psql is typically not available.
      // This endpoint is intended for local/self-hosted usage or environments where psql exists.
      const commandTemplate = process.env.DATABASE_RESTORE_COMMAND
      const command = commandTemplate
        ? commandTemplate.replace(/\{\{input\}\}/g, tmpPath)
        : `psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${tmpPath}"`

      try {
        await execAsync(command, { cwd: process.cwd(), maxBuffer: 50 * 1024 * 1024 })
      } catch (error: any) {
        const stderr = String(error?.stderr || '')
        const stdout = String(error?.stdout || '')
        const combined = `${stderr}\n${stdout}`.toLowerCase()
        const likelyMissing =
          combined.includes('psql') &&
          (combined.includes('not recognized') || combined.includes('not found') || combined.includes('no such file'))

        if (!commandTemplate && likelyMissing) {
          return NextResponse.json(
            {
              error:
                'PostgreSQL restore requires psql (not available in this runtime). Restore from your computer using psql, or use managed DB tooling.',
            },
            { status: 501 }
          )
        }
        return NextResponse.json({ error: 'Failed to restore database' }, { status: 500 })
      }

      await prisma.auditLog
        .create({
          data: {
            userId: session.user.id,
            action: 'DATABASE_RESTORED',
            resource: 'SYSTEM',
            details: JSON.stringify({
              target: targetRaw,
              engine: 'postgres',
              bytes: file.size,
              filename: file.name,
            }),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        })
        .catch(console.error)

      return NextResponse.json({ success: true })
    } finally {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath)
      }
    }
  } catch (error) {
    console.error('Database restore error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
