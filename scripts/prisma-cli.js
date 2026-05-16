/* eslint-disable no-console */
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/prisma-cli.js <prisma args...>')
    process.exit(1)
  }

  // Windows-only: Prisma CLI sometimes fails to rename the query engine if the destination exists.
  // Best-effort cleanup to avoid EPERM rename errors in locked-down environments.
  if (process.platform === 'win32') {
    try {
      const prismaClientDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client')
      const engineFile = path.join(prismaClientDir, 'query_engine-windows.dll.node')

      if (fs.existsSync(engineFile)) {
        try {
          fs.unlinkSync(engineFile)
        } catch {
          const backup = `${engineFile}.bak_${Date.now()}`
          fs.renameSync(engineFile, backup)
        }
      }

      if (fs.existsSync(prismaClientDir)) {
        for (const entry of fs.readdirSync(prismaClientDir)) {
          if (entry.startsWith('query_engine-windows.dll.node.tmp')) {
            try {
              fs.unlinkSync(path.join(prismaClientDir, entry))
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      console.warn('[prisma-cli] Pre-cleanup warning:', String(e))
    }
  }

  // Try to force Prisma to use local engine binaries (helps in restricted/offline build envs).
  try {
    const { getEnginesPath } = require('@prisma/engines')
    const { getBinaryTargetForCurrentPlatform } = require('@prisma/get-platform')

    const enginesPath = getEnginesPath()
    const binaryTarget = await getBinaryTargetForCurrentPlatform()

    const entries = fs.readdirSync(enginesPath)
    const schemaEngineFile =
      entries.find((n) => n.startsWith('schema-engine-') && n.includes(binaryTarget)) ||
      entries.find((n) => n.startsWith('schema-engine-'))
    const queryEngineLibraryFile =
      entries.find(
        (n) =>
          (n.startsWith('query_engine-') || n.startsWith('libquery_engine-')) &&
          n.includes(binaryTarget) &&
          n.endsWith('.node')
      ) ||
      entries.find((n) => (n.startsWith('query_engine-') || n.startsWith('libquery_engine-')) && n.endsWith('.node'))

    if (schemaEngineFile && !process.env.PRISMA_SCHEMA_ENGINE_BINARY) {
      process.env.PRISMA_SCHEMA_ENGINE_BINARY = path.join(enginesPath, schemaEngineFile)
    }
    if (queryEngineLibraryFile && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(enginesPath, queryEngineLibraryFile)
    }

    if (process.env.PRISMA_SCHEMA_ENGINE_BINARY || process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
      console.log('[prisma-cli] Using local Prisma engines:', {
        PRISMA_SCHEMA_ENGINE_BINARY: process.env.PRISMA_SCHEMA_ENGINE_BINARY,
        PRISMA_QUERY_ENGINE_LIBRARY: process.env.PRISMA_QUERY_ENGINE_LIBRARY,
      })
    }
  } catch (e) {
    // If this fails, fall back to normal Prisma behavior (may download engines).
    console.warn('[prisma-cli] Could not preconfigure local engines:', String(e))
  }

  const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js')
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.error) {
    console.error('[prisma-cli] Spawn error:', result.error)
  }

  process.exit(result.status ?? 1)
}

main().catch((e) => {
  console.error('[prisma-cli] Failed:', e)
  process.exit(1)
})

