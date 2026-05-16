import { prisma } from '@/lib/prisma'

const globalForInternalChatSchema = globalThis as unknown as {
  __internalChatSqliteSchemaEnsured?: boolean
}

type SqliteColumnRow = { name?: string } & Record<string, unknown>

async function getSqliteColumns(table: string): Promise<Set<string>> {
  const rows = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info(${table})`
  )) as SqliteColumnRow[]
  return new Set(rows.map((row) => String(row?.name || '')).filter(Boolean))
}

async function sqliteTableExists(table: string): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}' LIMIT 1`
  )) as Array<{ name?: string }>
  return !!rows?.[0]?.name
}

export async function ensureInternalChatSqliteSchema(): Promise<void> {
  if (globalForInternalChatSchema.__internalChatSqliteSchemaEnsured) return

  const url = process.env.DATABASE_URL || ''
  // Only patch dev SQLite. Production uses Postgres and proper migrations.
  if (!url.startsWith('file:')) {
    globalForInternalChatSchema.__internalChatSqliteSchemaEnsured = true
    return
  }

  try {
    if (await sqliteTableExists('internal_chat_messages')) {
      const columns = await getSqliteColumns('internal_chat_messages')
      const addColumn = async (name: string, type: string) => {
        if (columns.has(name)) return
        await prisma.$executeRawUnsafe(
          `ALTER TABLE internal_chat_messages ADD COLUMN ${name} ${type}`
        )
        columns.add(name)
      }

      await addColumn('replyToId', 'TEXT')
      await addColumn('forwardedFromId', 'TEXT')
      await addColumn('deletedAt', 'DATETIME')
      await addColumn('deletedById', 'TEXT')
    }

    if (!(await sqliteTableExists('internal_chat_message_reactions'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS internal_chat_message_reactions (
          id TEXT PRIMARY KEY NOT NULL,
          messageId TEXT NOT NULL,
          userId TEXT NOT NULL,
          emoji TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (messageId) REFERENCES internal_chat_messages(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS internal_chat_message_reactions_messageId_userId_unique ON internal_chat_message_reactions(messageId, userId);`
      )
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS internal_chat_message_reactions_messageId_idx ON internal_chat_message_reactions(messageId);`
      )
    }
  } catch (error) {
    // Don't block the app in case the database is not writable (should not happen in dev).
    console.error('[internal-chat] failed to ensure sqlite schema', error)
  } finally {
    globalForInternalChatSchema.__internalChatSqliteSchemaEnsured = true
  }
}

