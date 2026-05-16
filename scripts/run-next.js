const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const nextBin = require.resolve('next/dist/bin/next')
const args = process.argv.slice(2)
const command = args[0]

if (!command) {
  console.error('[run-next] missing next command')
  process.exit(1)
}

const nextDir = path.join(rootDir, '.next')
const buildIdPath = path.join(nextDir, 'BUILD_ID')

function runNodeScript(relativeScriptPath, label) {
  const scriptPath = path.join(rootDir, relativeScriptPath)
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  })

  if (typeof result.status === 'number' && result.status !== 0) {
    console.error(`[run-next] ${label} failed`)
    process.exit(result.status)
  }

  if (result.error) {
    console.error(`[run-next] ${label} failed`, result.error)
    process.exit(1)
  }
}

function removeNextArtifacts(reason) {
  if (!fs.existsSync(nextDir)) {
    return
  }

  fs.rmSync(nextDir, { recursive: true, force: true })
  console.log(`[run-next] removed .next (${reason})`)
}

if (command === 'dev' && fs.existsSync(buildIdPath)) {
  removeNextArtifacts('switching from production artifacts to dev mode')
}

if (command === 'dev' && process.env.NEXT_CLEAN_DEV !== 'false') {
  removeNextArtifacts('clean dev startup')
}

if (command === 'build' && process.env.NEXT_CLEAN_BUILD !== 'false') {
  removeNextArtifacts('clean production build')
}

if (command === 'dev' || command === 'start') {
  runNodeScript('switch-schema.js', 'schema selection')
  runNodeScript(path.join('scripts', 'prisma-generate.js'), 'Prisma client sync')
}

// Keep dev resource usage predictable in constrained environments, but do not
// force experimental worker settings during production builds. They can break
// route manifest generation and page-data collection on Windows.
if (command === 'dev') {
  if (!process.env.NEXT_EXPERIMENTAL_WORKER_THREADS) {
    process.env.NEXT_EXPERIMENTAL_WORKER_THREADS = 'true'
  }

  if (!process.env.NEXT_EXPERIMENTAL_CPUS) {
    process.env.NEXT_EXPERIMENTAL_CPUS = '1'
  }
}

const result = spawnSync(process.execPath, [nextBin, ...args], {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
})

if (typeof result.status === 'number') {
  process.exit(result.status)
}

if (result.error) {
  console.error(result.error)
}

process.exit(1)
