const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const targets = [
  path.join(rootDir, '.next'),
  path.join(rootDir, 'node_modules', '.cache'),
  path.join(rootDir, 'tmp-dev-server.out.log'),
  path.join(rootDir, 'tmp-dev-server.err.log'),
]

for (const target of targets) {
  if (!fs.existsSync(target)) {
    continue
  }

  fs.rmSync(target, { recursive: true, force: true })
  console.log(`[clean-next] removed ${path.relative(rootDir, target)}`)
}

console.log('[clean-next] done')
