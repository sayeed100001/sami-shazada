/* eslint-disable no-console */
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

function hasMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) return false
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  return entries.some((e) => e.isDirectory())
}

function listMigrationNames() {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) return []
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

function runPrisma(args) {
  const prismaCliScript = path.join(__dirname, 'prisma-cli.js')
  const env = { ...process.env }
  const nonPooledUrl =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL

  if (nonPooledUrl) {
    env.DATABASE_URL = nonPooledUrl
    console.log('[db-migrate] Using non-pooled database URL for migrations')
  }

  const result = spawnSync(process.execPath, [prismaCliScript, ...args], {
    stdio: 'pipe',
    env,
    encoding: 'utf8',
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  if (result.error) {
    console.error('[db-migrate] Spawn error:', result.error)
  }

  return result
}

function isBaselineConflict(result) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  return output.includes('P3005') || output.includes('database schema is not empty')
}

function getFailedMigrations(result) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  if (!output.includes('P3009')) return []
  const matches = []
  const regex = /The `([^`]+)` migration/g
  let m
  while ((m = regex.exec(output))) {
    matches.push(m[1])
  }
  return [...new Set(matches)]
}

function hasMigrationApplyConflict(result) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  // P3018 is thrown when a migration fails to apply (often "already exists" due to legacy db push).
  return output.includes('P3018') || output.includes('already exists')
}

function isProductionRuntime() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
}

function allowAutoBaseline() {
  // Baseline should be an explicit, one-time operation.
  const raw = String(process.env.AUTO_PRISMA_BASELINE || '')
  const normalized = raw.trim().replace(/^\"+|\"+$/g, '').toLowerCase()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}

function isAlreadyAppliedResolveError(result) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase()
  return output.includes('already recorded') || output.includes('already been applied') || output.includes('already applied')
}

function resolveAllMigrationsAsApplied() {
  const migrations = listMigrationNames()
  if (!migrations.length) {
    console.error('[db-migrate] AUTO_PRISMA_BASELINE enabled but no migrations found.')
    process.exit(1)
  }

  console.warn('[db-migrate] AUTO_PRISMA_BASELINE: marking ALL migrations as applied (baseline mode).')
  for (const migration of migrations) {
    const r = runPrisma(['migrate', 'resolve', '--applied', migration])
    if ((r.status ?? 1) !== 0 && !isAlreadyAppliedResolveError(r)) {
      console.error('[db-migrate] Failed to mark migration as applied:', migration)
      process.exit(r.status ?? 1)
    }
  }
}

function allowDbPushFallback() {
  // Safe default: never use db push in production unless explicitly allowed.
  if (!isProductionRuntime()) return true
  const raw = String(process.env.ALLOW_PRISMA_DB_PUSH_FALLBACK || '')
  const normalized = raw.trim().replace(/^"+|"+$/g, '').toLowerCase()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}

if (hasMigrations()) {
  console.log('[db-migrate] Using migrations: prisma migrate deploy')
  const result = runPrisma(['migrate', 'deploy'])

  if ((result.status ?? 1) === 0) {
    process.exit(0)
  }

  const failedMigrations = getFailedMigrations(result)
  if (allowAutoBaseline() && (failedMigrations.length || isBaselineConflict(result) || hasMigrationApplyConflict(result))) {
    // IMPORTANT: In baseline mode we must NOT run migrations against a database that was already created via db push.
    // Instead, mark migrations as applied so Prisma's history matches reality and future deploys are stable.
    if (failedMigrations.length) {
      console.warn('[db-migrate] Failed migrations detected (P3009). Baseline mode will mark all migrations as applied.')
    }
    if (hasMigrationApplyConflict(result)) {
      console.warn('[db-migrate] Migration apply conflict detected (P3018 / already exists). Baseline mode will mark all migrations as applied.')
    }
    if (isBaselineConflict(result)) {
      console.warn('[db-migrate] Baseline conflict detected (P3005). Baseline mode will mark all migrations as applied.')
    }

    resolveAllMigrationsAsApplied()
    console.log('[db-migrate] Baseline mode complete. Exiting successfully. Remove AUTO_PRISMA_BASELINE after this deploy.')
    process.exit(0)
  }

  if (isBaselineConflict(result)) {
    if (allowAutoBaseline()) {
      resolveAllMigrationsAsApplied()
      console.log('[db-migrate] Baseline mode complete. Exiting successfully. Remove AUTO_PRISMA_BASELINE after this deploy.')
      process.exit(0)
    }

    if (!allowDbPushFallback()) {
      console.error('[db-migrate] ERROR: Prisma baseline required. Refusing to run prisma db push in production.')
      console.error('[db-migrate] Fix: baseline your production DB with `prisma migrate resolve` or bring prod under migrations, then redeploy.')
      console.error('[db-migrate] Option A (recommended): set AUTO_PRISMA_BASELINE=true (production env) for one deploy, then remove it.')
      console.error('[db-migrate] Option B (temporary): set ALLOW_PRISMA_DB_PUSH_FALLBACK=true (production env) to keep legacy behavior.')
      process.exit(result.status ?? 1)
    }

    console.warn('[db-migrate] Existing non-empty database detected without Prisma baseline. Falling back to prisma db push.')
    const fallback = runPrisma(['db', 'push'])
    process.exit(fallback.status ?? 1)
  }

  process.exit(result.status ?? 1)
} else {
  if (!allowDbPushFallback()) {
    console.error('[db-migrate] ERROR: No migrations found. Refusing to run prisma db push in production.')
    console.error('[db-migrate] Fix: add migrations (prisma migrate dev) and deploy using prisma migrate deploy.')
    console.error('[db-migrate] Temporary escape hatch: set ALLOW_PRISMA_DB_PUSH_FALLBACK=true (production env) to keep legacy behavior.')
    process.exit(1)
  }

  console.warn('[db-migrate] No prisma/migrations found. Falling back to: prisma db push')
  const result = runPrisma(['db', 'push'])
  process.exit(result.status ?? 1)
}
