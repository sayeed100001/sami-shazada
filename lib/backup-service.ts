import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'
import { prisma } from './prisma'

const execAsync = promisify(exec)

interface BackupResult {
  success: boolean
  filename?: string
  path?: string
  size?: number
  error?: string
}

interface RestoreResult {
  success: boolean
  error?: string
}

const BACKUP_DIR = path.join(process.cwd(), 'backups')
const MAX_BACKUPS = 10

async function ensureBackupDir(): Promise<void> {
  try {
    await mkdir(BACKUP_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create backup directory:', error)
  }
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL not configured')
  }
  return url
}

function isPostgreSQL(): boolean {
  const url = getDatabaseUrl()
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

function isSQLite(): boolean {
  const url = getDatabaseUrl()
  return url.startsWith('file:')
}

export async function createBackup(): Promise<BackupResult> {
  try {
    await ensureBackupDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.sql`
    const backupPath = path.join(BACKUP_DIR, filename)

    if (isPostgreSQL()) {
      return await createPostgreSQLBackup(backupPath, filename)
    } else if (isSQLite()) {
      return await createSQLiteBackup(backupPath, filename)
    } else {
      return {
        success: false,
        error: 'Unsupported database type'
      }
    }
  } catch (error) {
    console.error('Backup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function createPostgreSQLBackup(backupPath: string, filename: string): Promise<BackupResult> {
  try {
    const dbUrl = new URL(getDatabaseUrl())
    const host = dbUrl.hostname
    const port = dbUrl.port || '5432'
    const database = dbUrl.pathname.slice(1)
    const username = dbUrl.username
    const password = dbUrl.password

    const env = {
      ...process.env,
      PGPASSWORD: password
    }

    const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${backupPath}"`

    await execAsync(command, { env, maxBuffer: 50 * 1024 * 1024 })

    const stats = await import('fs/promises').then(fs => fs.stat(backupPath))

    await cleanOldBackups()

    await prisma.auditLog.create({
      data: {
        action: 'BACKUP_CREATED',
        resource: 'SYSTEM',
        details: JSON.stringify({
          filename,
          size: stats.size,
          type: 'postgresql'
        })
      }
    }).catch(console.error)

    return {
      success: true,
      filename,
      path: backupPath,
      size: stats.size
    }
  } catch (error) {
    console.error('PostgreSQL backup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create PostgreSQL backup'
    }
  }
}

async function createSQLiteBackup(backupPath: string, filename: string): Promise<BackupResult> {
  try {
    const dbUrl = getDatabaseUrl()
    const dbPath = dbUrl.replace('file:', '')

    const command = `sqlite3 "${dbPath}" ".backup '${backupPath}'"`

    await execAsync(command)

    const stats = await import('fs/promises').then(fs => fs.stat(backupPath))

    await cleanOldBackups()

    await prisma.auditLog.create({
      data: {
        action: 'BACKUP_CREATED',
        resource: 'SYSTEM',
        details: JSON.stringify({
          filename,
          size: stats.size,
          type: 'sqlite'
        })
      }
    }).catch(console.error)

    return {
      success: true,
      filename,
      path: backupPath,
      size: stats.size
    }
  } catch (error) {
    console.error('SQLite backup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create SQLite backup'
    }
  }
}

export async function restoreBackup(filename: string): Promise<RestoreResult> {
  try {
    const backupPath = path.join(BACKUP_DIR, filename)

    if (isPostgreSQL()) {
      return await restorePostgreSQLBackup(backupPath)
    } else if (isSQLite()) {
      return await restoreSQLiteBackup(backupPath)
    } else {
      return {
        success: false,
        error: 'Unsupported database type'
      }
    }
  } catch (error) {
    console.error('Restore error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function restorePostgreSQLBackup(backupPath: string): Promise<RestoreResult> {
  try {
    const dbUrl = new URL(getDatabaseUrl())
    const host = dbUrl.hostname
    const port = dbUrl.port || '5432'
    const database = dbUrl.pathname.slice(1)
    const username = dbUrl.username
    const password = dbUrl.password

    const env = {
      ...process.env,
      PGPASSWORD: password
    }

    const command = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupPath}"`

    await execAsync(command, { env })

    await prisma.auditLog.create({
      data: {
        action: 'BACKUP_RESTORED',
        resource: 'SYSTEM',
        details: JSON.stringify({
          filename: path.basename(backupPath),
          type: 'postgresql'
        })
      }
    }).catch(console.error)

    return { success: true }
  } catch (error) {
    console.error('PostgreSQL restore error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore PostgreSQL backup'
    }
  }
}

async function restoreSQLiteBackup(backupPath: string): Promise<RestoreResult> {
  try {
    const dbUrl = getDatabaseUrl()
    const dbPath = dbUrl.replace('file:', '')

    const command = `sqlite3 "${dbPath}" ".restore '${backupPath}'"`

    await execAsync(command)

    await prisma.auditLog.create({
      data: {
        action: 'BACKUP_RESTORED',
        resource: 'SYSTEM',
        details: JSON.stringify({
          filename: path.basename(backupPath),
          type: 'sqlite'
        })
      }
    }).catch(console.error)

    return { success: true }
  } catch (error) {
    console.error('SQLite restore error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore SQLite backup'
    }
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    await ensureBackupDir()
    const files = await readdir(BACKUP_DIR)
    return files.filter(f => f.endsWith('.sql')).sort().reverse()
  } catch (error) {
    console.error('List backups error:', error)
    return []
  }
}

async function cleanOldBackups(): Promise<void> {
  try {
    const backups = await listBackups()
    
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS)
      
      for (const backup of toDelete) {
        const backupPath = path.join(BACKUP_DIR, backup)
        await unlink(backupPath)
        console.log(`Deleted old backup: ${backup}`)
      }
    }
  } catch (error) {
    console.error('Clean old backups error:', error)
  }
}
