import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { gzipSync } from 'zlib'
import { ConfigService } from '@/lib/config-service'
import { isVercelRuntime } from '@/lib/runtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const execAsync = promisify(exec)
const BACKUP_BUNDLE_FORMAT = 'saray-shazada-backup-v1'
const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')

type DatabaseEngine = 'sqlite' | 'postgresql-dump'

type BackupFileEntry = {
  path: string
  size: number
  modifiedAt: string
  data: string
}

type DatabaseArtifact = {
  engine: DatabaseEngine
  filename: string
  size: number
  data: string
}

function ensureBackupsDir() {
  // NOTE: Vercel serverless filesystem is read-only (except /tmp). This endpoint is intended
  // for local/self-hosted usage where backups can be stored on disk.
  const backupsDir = path.join(process.cwd(), 'backups')
  try {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }
  } catch (error: any) {
    const code = String(error?.code || '')
    const msg = String(error?.message || '').toLowerCase()
    const readOnly =
      code === 'EROFS' ||
      code === 'EPERM' ||
      msg.includes('read-only') ||
      msg.includes('readonly') ||
      msg.includes('permission')
    if (readOnly) {
      throw new Error('Backups require a writable filesystem (not available in this deployment runtime).')
    }
    throw error
  }
  return backupsDir
}

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const isPostgres = /^postgres(ql)?:\/\//.test(databaseUrl)
  const vercel = isVercelRuntime()
  const hasBackupCommand = Boolean(process.env.DATABASE_BACKUP_COMMAND)
  const isSQLite = databaseUrl.startsWith('file:')
  return {
    databaseUrl,
    isSQLite,
    // In Vercel, pg_dump isn't available and filesystem isn't persistent. Disable disk-based backups there.
    databaseBackupEnabled: isSQLite || hasBackupCommand || (!vercel && isPostgres),
  }
}

function collectDirectoryEntries(directory: string, baseDirectory: string): BackupFileEntry[] {
  if (!fs.existsSync(directory)) {
    return []
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files: BackupFileEntry[] = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectDirectoryEntries(fullPath, baseDirectory))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const fileBuffer = fs.readFileSync(fullPath)
    const fileStat = fs.statSync(fullPath)

    files.push({
      path: path.relative(baseDirectory, fullPath).replace(/\\/g, '/'),
      size: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString(),
      data: fileBuffer.toString('base64'),
    })
  }

  return files
}

function writeCompressedBundle(targetPath: string, payload: unknown) {
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'))
  fs.writeFileSync(targetPath, compressed)
  return compressed.length
}

async function createDatabaseBackupFile(targetPath: string, databaseUrl: string, isSQLite: boolean) {
  if (isSQLite) {
    const dbPath = databaseUrl.replace('file:', '') || './prisma/dev.db'
    const resolvedDbPath = path.resolve(dbPath)

    if (!fs.existsSync(resolvedDbPath)) {
      throw new Error('SQLite database file not found')
    }

    fs.copyFileSync(resolvedDbPath, targetPath)
    return
  }

  const backupCommandTemplate = process.env.DATABASE_BACKUP_COMMAND
  const command = backupCommandTemplate
    ? backupCommandTemplate.replace(/\{\{output\}\}/g, targetPath)
    : `pg_dump --format=p --file="${targetPath}" "${databaseUrl}"`

  try {
    await execAsync(command, { cwd: process.cwd() })
  } catch (error: any) {
    const stderr = String(error?.stderr || '')
    const stdout = String(error?.stdout || '')
    const combinedOutput = `${stderr}\n${stdout}`.toLowerCase()
    const commandMissing =
      combinedOutput.includes('pg_dump') &&
      (
        combinedOutput.includes('not recognized') ||
        combinedOutput.includes('not found') ||
        combinedOutput.includes('no such file')
      )

    if (!backupCommandTemplate && commandMissing) {
      throw new Error('PostgreSQL backup requires pg_dump in PATH or DATABASE_BACKUP_COMMAND')
    }

    throw error
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error('Backup command completed without creating a backup file')
  }
}

async function loadDatabaseArtifact(
  databaseUrl: string,
  isSQLite: boolean,
  backupId: string,
  timestamp: string,
  backupsDir: string
): Promise<DatabaseArtifact> {
  if (isSQLite) {
    const dbPath = databaseUrl.replace('file:', '') || './prisma/dev.db'
    const resolvedDbPath = path.resolve(dbPath)

    if (!fs.existsSync(resolvedDbPath)) {
      throw new Error('SQLite database file not found')
    }

    const buffer = fs.readFileSync(resolvedDbPath)
    return {
      engine: 'sqlite',
      filename: path.basename(resolvedDbPath),
      size: buffer.length,
      data: buffer.toString('base64'),
    }
  }

  const tempPath = path.join(backupsDir, `tmp_${backupId}_${timestamp}.sql`)

  try {
    await createDatabaseBackupFile(tempPath, databaseUrl, false)
    const buffer = fs.readFileSync(tempPath)

    return {
      engine: 'postgresql-dump',
      filename: path.basename(tempPath),
      size: buffer.length,
      data: buffer.toString('base64'),
    }
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}

async function createBackupArtifact(
  type: 'database' | 'files' | 'full',
  backupId: string,
  timestamp: string
) {
  const backupsDir = ensureBackupsDir()
  const { databaseUrl, isSQLite, databaseBackupEnabled } = getDatabaseConfig()

  if (type === 'database') {
    if (!databaseBackupEnabled) {
      throw new Error('Database backup is not configured')
    }

    const filename = `backup_${type}_${timestamp}.${isSQLite ? 'db' : 'sql'}`
    const backupPath = path.join(backupsDir, filename)

    await createDatabaseBackupFile(backupPath, databaseUrl, isSQLite)
    const stats = fs.statSync(backupPath)

    return {
      filename,
      backupPath,
      size: stats.size,
      engine: isSQLite ? 'sqlite' : 'postgresql-dump',
      metadata: {
        databaseIncluded: true,
        filesIncluded: false,
        fileCount: 0,
      },
    }
  }

  const uploads = collectDirectoryEntries(UPLOADS_ROOT, UPLOADS_ROOT)

  if (type === 'files') {
    const filename = `backup_${type}_${timestamp}.files.json.gz`
    const backupPath = path.join(backupsDir, filename)
    const size = writeCompressedBundle(backupPath, {
      format: BACKUP_BUNDLE_FORMAT,
      type,
      createdAt: new Date().toISOString(),
      filesRoot: 'public/uploads',
      files: uploads,
    })

    return {
      filename,
      backupPath,
      size,
      engine: 'filesystem',
      metadata: {
        databaseIncluded: false,
        filesIncluded: true,
        fileCount: uploads.length,
      },
    }
  }

  if (!databaseBackupEnabled) {
    throw new Error('Database backup is not configured')
  }

  const database = await loadDatabaseArtifact(databaseUrl, isSQLite, backupId, timestamp, backupsDir)
  const filename = `backup_${type}_${timestamp}.full.json.gz`
  const backupPath = path.join(backupsDir, filename)
  const size = writeCompressedBundle(backupPath, {
    format: BACKUP_BUNDLE_FORMAT,
    type,
    createdAt: new Date().toISOString(),
    database,
    filesRoot: 'public/uploads',
    files: uploads,
  })

  return {
    filename,
    backupPath,
    size,
    engine: database.engine,
    metadata: {
      databaseIncluded: true,
      filesIncluded: true,
      fileCount: uploads.length,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backupsEnabled = (await ConfigService.get('admin_backups_enabled', 'false')) === 'true'
    if (!backupsEnabled) {
      return NextResponse.json({ error: 'Backups are disabled' }, { status: 403 })
    }

    const { databaseBackupEnabled } = getDatabaseConfig()
    const filesBackupEnabled = !isVercelRuntime()

    const backupConfigs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'backup_' } },
      orderBy: { updatedAt: 'desc' }
    })

    const backups = backupConfigs
      .map((config) => {
        try {
          const data = JSON.parse(config.value)
          // In serverless runtimes we never expect the file to exist on disk.
          const canCheckDisk = !isVercelRuntime()
          const hasFile =
            canCheckDisk &&
            typeof data?.path === 'string' &&
            data.path &&
            (() => {
              try {
                return fs.existsSync(data.path)
              } catch {
                return false
              }
            })()
          return {
            id: config.key.replace('backup_', ''),
            type: data.type,
            filename: data.filename,
            size: data.size,
            status: data.status,
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            downloadUrl: hasFile ? `/api/admin/backups/${config.key.replace('backup_', '')}` : '',
          }
        } catch {
          // If a config row is corrupted, skip it instead of failing the entire endpoint.
          return null
        }
      })
      .filter(Boolean)

    const autoBackupConfig = await prisma.systemConfig.findUnique({
      where: { key: 'auto_backup_enabled' }
    })

    return NextResponse.json({ 
      backups,
      autoBackupEnabled: autoBackupConfig?.value === 'true',
      capabilities: {
        database: databaseBackupEnabled,
        files: filesBackupEnabled,
        full: databaseBackupEnabled && filesBackupEnabled
      }
    })
  } catch (error) {
    console.error('Error fetching backups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    // Production-safe stance: on Vercel serverless we do NOT create disk-based backups.
    // Use GitHub Actions for full Postgres backups (pg_dump) and Admin -> System -> Maintenance for export/snapshot.
    if (isVercelRuntime()) {
      return NextResponse.json(
        {
          error: 'Backups are not available in this deployment runtime',
          details:
            'This environment does not support creating and storing disk-based backups (Vercel serverless). Use GitHub Actions scheduled backups for Postgres, or Admin -> System -> Maintenance -> Database Export.',
        },
        { status: 501 }
      )
    }

    const body = await request.json()
    const { type } = body

    if (!type || !['database', 'files', 'full'].includes(type)) {
      return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 })
    }

    const backupId = crypto.randomBytes(16).toString('hex')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    try {
      const artifact = await createBackupArtifact(type, backupId, timestamp)

      const backupData = {
        type,
        filename: artifact.filename,
        path: artifact.backupPath,
        size: artifact.size,
        status: 'completed',
        engine: artifact.engine,
        metadata: artifact.metadata,
        createdAt: new Date().toISOString(),
        createdBy: session.user.id
      }

      await prisma.systemConfig.create({
        data: {
          key: `backup_${backupId}`,
          value: JSON.stringify(backupData),
          description: `Backup: ${type}`
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BACKUP_CREATED',
          resource: 'BACKUP',
          resourceId: backupId,
          details: JSON.stringify({
            type,
            filename: artifact.filename,
            size: artifact.size,
            engine: artifact.engine,
            metadata: artifact.metadata
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({ 
        success: true, 
        backup: {
          id: backupId,
          type,
          filename: artifact.filename,
          size: artifact.size,
          status: 'completed',
          createdAt: backupData.createdAt
        }
      })

    } catch (backupError: any) {
      console.error('Backup creation error:', backupError)
      const message = String(backupError?.message || '')
      const normalized = message.toLowerCase()
      const status =
        normalized.includes('requires pg_dump') ||
        normalized.includes('database backup is not configured') ||
        normalized.includes('writable filesystem')
          ? 501
          : 500
      return NextResponse.json({ 
        error: 'Failed to create backup',
        details: backupError instanceof Error ? backupError.message : 'Backup failed'
      }, { status })
    }

  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const autoBackupEnabled = Boolean(body?.autoBackupEnabled)

    await prisma.systemConfig.upsert({
      where: { key: 'auto_backup_enabled' },
      update: {
        value: autoBackupEnabled ? 'true' : 'false',
        description: 'Controls whether the deployment scheduler should run automatic backups'
      },
      create: {
        key: 'auto_backup_enabled',
        value: autoBackupEnabled ? 'true' : 'false',
        description: 'Controls whether the deployment scheduler should run automatic backups'
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_AUTOMATION_UPDATED',
        resource: 'BACKUP',
        resourceId: 'auto_backup_enabled',
        details: JSON.stringify({ autoBackupEnabled }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      autoBackupEnabled
    })
  } catch (error) {
    console.error('Error updating backup automation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
