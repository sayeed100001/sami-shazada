/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })

    try {
      await prisma.$queryRaw`SELECT 1`
      return { ok: true }
    } finally {
      await prisma.$disconnect().catch(() => null)
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'vercel-doctor' },
      cache: 'no-store',
    })

    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..')
  loadEnvFile(path.join(rootDir, '.env.production.local'))

  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ]

  const recommendedVars = [
    'DATABASE_URL_UNPOOLED',
    'BLOB_READ_WRITE_TOKEN',
    'SYSTEM_CONFIG_ENCRYPTION_KEY',
    'CRON_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ]

  const envStatus = Object.fromEntries(
    [...requiredVars, ...recommendedVars].map((key) => [key, Boolean(process.env[key])])
  )

  const database = await checkDatabase()
  const healthUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/health` : null
  const publicConfigUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/system/config/public` : null

  const [health, publicConfig] = await Promise.all([
    healthUrl ? fetchJson(healthUrl) : Promise.resolve({ ok: false, status: null, error: 'NEXTAUTH_URL missing' }),
    publicConfigUrl ? fetchJson(publicConfigUrl) : Promise.resolve({ ok: false, status: null, error: 'NEXTAUTH_URL missing' }),
  ])

  console.log(
    JSON.stringify(
      {
        env: envStatus,
        database,
        health: {
          ok: health.ok,
          status: health.status,
          bodyPreview: typeof health.body === 'string' ? health.body.slice(0, 300) : undefined,
          error: health.error,
        },
        publicConfig: {
          ok: publicConfig.ok,
          status: publicConfig.status,
          bodyPreview:
            typeof publicConfig.body === 'string' ? publicConfig.body.slice(0, 300) : undefined,
          error: publicConfig.error,
        },
        notes: {
          blobUsage: 'BLOB_READ_WRITE_TOKEN is required on Vercel for avatars, advertisements, home content images, education thumbnails, branding/theme images, and chat uploads.',
        },
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  )
  process.exit(1)
})
