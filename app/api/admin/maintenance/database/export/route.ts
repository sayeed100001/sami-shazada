import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ConfigService } from '@/lib/config-service'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { gzipSync } from 'zlib'
import { PrismaClient } from '@prisma/client'
import os from 'os'
import { isVercelRuntime } from '@/lib/runtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const execAsync = promisify(exec)

const JSON_EXPORT_FORMAT = 'saray-shazada-db-export-v1'
const DEFAULT_MAX_TABLES = 60
const DEFAULT_MAX_ROWS_PER_TABLE = 2000
const DEFAULT_MAX_TOTAL_ROWS = 20000
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 12 * 1024 * 1024 // ~12MB (pre-gzip)

function asAttachment(buffer: Buffer, filename: string, contentType: string) {
  // Use ArrayBuffer directly. This avoids Blob usage while satisfying NextResponse typings.
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  return new NextResponse(ab, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
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

function isSqliteUrl(url: string) {
  return url.startsWith('file:')
}

function isPostgresUrl(url: string) {
  return /^postgres(ql)?:\/\//.test(url)
}

function parsePositiveInt(input: string | null, fallback: number, min: number, max: number) {
  if (!input) return fallback
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

async function exportPostgresAsJsonGzip(databaseUrl: string, target: string, stamp: string, limits: {
  maxTables: number
  maxRowsPerTable: number
  maxTotalRows: number
  maxBytes: number
}) {
  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  })

  const startedAt = Date.now()
  const payload: any = {
    format: JSON_EXPORT_FORMAT,
    engine: 'postgresql',
    createdAt: new Date().toISOString(),
    target,
    limits,
    tables: [] as any[],
    truncated: false,
    note:
      'This is a JSON snapshot export intended for diagnostics and small/medium databases. For full SQL backups, use GitHub Actions + pg_dump.',
  }

  try {
    const tableRows = await client.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `

    const safeName = /^[A-Za-z0-9_]+$/
    const tableNames = tableRows
      .map((row) => String(row.table_name || ''))
      .filter((name) => safeName.test(name))
      .slice(0, limits.maxTables)

    let totalRows = 0
    let approxBytes = 0

    for (const table of tableNames) {
      const remaining = limits.maxTotalRows - totalRows
      if (remaining <= 0) {
        payload.truncated = true
        break
      }

      const cap = Math.min(limits.maxRowsPerTable, remaining)
      const rows = await client.$queryRawUnsafe<any[]>(`SELECT * FROM "${table}" LIMIT ${cap + 1}`)
      const truncated = rows.length > cap
      const safeRows = truncated ? rows.slice(0, cap) : rows

      payload.tables.push({
        table,
        rows: safeRows,
        rowCount: safeRows.length,
        truncated,
      })

      totalRows += safeRows.length

      // Rough size guard: stringify only the newest table entry + metadata overhead.
      approxBytes += Buffer.byteLength(JSON.stringify(payload.tables[payload.tables.length - 1] || {}), 'utf8')
      if (approxBytes > limits.maxBytes) {
        payload.truncated = true
        break
      }
    }

    payload.summary = {
      tableCount: payload.tables.length,
      totalRows,
      durationMs: Date.now() - startedAt,
    }

    const json = JSON.stringify(payload)
    if (Buffer.byteLength(json, 'utf8') > limits.maxBytes) {
      // As a final guard, avoid sending oversized bodies.
      throw new Error('Export too large for in-app JSON snapshot. Use GitHub Actions backup instead.')
    }

    const gz = gzipSync(Buffer.from(json, 'utf8'))
    return asAttachment(gz, `db-export-${target}-${stamp}.json.gz`, 'application/gzip')
  } finally {
    await client.$disconnect().catch(() => {})
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

    const url = new URL(request.url)
    const target = (url.searchParams.get('target') || 'primary') as 'primary' | 'backup'
    const format = (url.searchParams.get('format') || 'sql').toLowerCase() // sql | json
    if (target !== 'primary' && target !== 'backup') {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }
    if (format !== 'sql' && format !== 'json') {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    const backupDbUrl = await ConfigService.get('backup_database_url', '')
    const databaseUrl = getEffectiveDatabaseUrl(target, backupDbUrl)

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (isSqliteUrl(databaseUrl)) {
      const dbPath = databaseUrl.replace('file:', '') || './prisma/dev.db'
      const resolved = path.resolve(dbPath)
      if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: 'SQLite database file not found' }, { status: 404 })
      }
      const buffer = fs.readFileSync(resolved)
      return asAttachment(buffer, `db-export-${target}-${stamp}.db`, 'application/vnd.sqlite3')
    }

    if (!isPostgresUrl(databaseUrl)) {
      return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 })
    }

    const limits = {
      maxTables: parsePositiveInt(url.searchParams.get('maxTables'), DEFAULT_MAX_TABLES, 1, 120),
      maxRowsPerTable: parsePositiveInt(url.searchParams.get('maxRowsPerTable'), DEFAULT_MAX_ROWS_PER_TABLE, 10, 20000),
      maxTotalRows: parsePositiveInt(url.searchParams.get('maxTotalRows'), DEFAULT_MAX_TOTAL_ROWS, 100, 200000),
      maxBytes: parsePositiveInt(url.searchParams.get('maxBytes'), DEFAULT_MAX_UNCOMPRESSED_BYTES, 512 * 1024, 30 * 1024 * 1024),
    }

    if (format === 'json') {
      return await exportPostgresAsJsonGzip(databaseUrl, target, stamp, limits)
    }

    // In Vercel serverless deployments:
    // - The filesystem is read-only except `/tmp`
    // - `pg_dump` is typically not available
    // Prefer a bounded JSON snapshot export instead of erroring.
    if (isVercelRuntime()) {
      return await exportPostgresAsJsonGzip(databaseUrl, target, stamp, limits)
    }

    // NOTE: On Vercel serverless runtime, pg_dump is typically not available.
    // This endpoint is intended for local/self-hosted usage or environments where pg_dump exists.
    // Use OS temp directory to avoid writable-path issues and to prevent leaving artifacts in the repo.
    const tmpDir = os.tmpdir()
    const tmpFile = path.join(tmpDir, `tmp-export-${target}-${stamp}.sql`)

    const commandTemplate = process.env.DATABASE_BACKUP_COMMAND
    const command = commandTemplate
      ? commandTemplate.replace(/\{\{output\}\}/g, tmpFile)
      : `pg_dump "${databaseUrl}" --no-owner --no-acl --format=plain --file "${tmpFile}"`

    try {
      await execAsync(command, { cwd: process.cwd(), maxBuffer: 50 * 1024 * 1024 })
    } catch (error: any) {
      const stderr = String(error?.stderr || '')
      const stdout = String(error?.stdout || '')
      const combined = `${stderr}\n${stdout}`.toLowerCase()
      const likelyMissing =
        combined.includes('pg_dump') &&
        (combined.includes('not recognized') || combined.includes('not found') || combined.includes('no such file'))

      if (!commandTemplate && likelyMissing) {
        // Fallback: JSON snapshot export (works on serverless, but bounded).
        return await exportPostgresAsJsonGzip(databaseUrl, target, stamp, limits)
      }

      return NextResponse.json({ error: 'Failed to export database' }, { status: 500 })
    }

    if (!fs.existsSync(tmpFile)) {
      return NextResponse.json({ error: 'Export command produced no file' }, { status: 500 })
    }

    const buffer = fs.readFileSync(tmpFile)
    fs.unlinkSync(tmpFile)
    return asAttachment(buffer, `db-export-${target}-${stamp}.sql`, 'application/sql')
  } catch (error) {
    console.error('Database export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
