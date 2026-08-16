import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const config = (await import(pathToFileURL(resolve(root, 'electron-builder.config.mjs')).href)).default
const requiredTargets = ['dmg', 'nsis', 'AppImage', 'deb']
const configured = [
  ...config.mac.target,
  ...config.win.target,
  ...config.linux.target,
]
for (const target of requiredTargets) {
  if (!configured.includes(target)) throw new Error(`desktop build target missing: ${target}`)
}
for (const entry of ['lib/main.js', 'lib/backend.js']) {
  if (!existsSync(resolve(root, entry))) throw new Error(`desktop build output missing: ${entry}; run pnpm run build first`)
}

// The `electron` specifier must stay external: a bundled npm path-shim reads
// `path.txt` beside itself through CommonJS `__dirname`, which crashes an ES
// module chunk on first import. Its signature string is a stable bundling
// marker.
if (existsSync(resolve(root, 'lib'))) {
  for (const chunk of readdirSync(resolve(root, 'lib'))) {
    if (!chunk.endsWith('.js')) continue
    if (readFileSync(resolve(root, 'lib', chunk), 'utf8').includes('path.txt')) {
      throw new Error(`desktop build inlined the npm electron shim into lib/${chunk}; keep 'electron' external in tsdown.config.ts`)
    }
  }
}
console.log('desktop verification: packaged entrypoints and macOS, Windows, Linux targets configured')
