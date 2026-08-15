import { existsSync } from 'node:fs'
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
console.log('desktop verification: packaged entrypoints and macOS, Windows, Linux targets configured')
