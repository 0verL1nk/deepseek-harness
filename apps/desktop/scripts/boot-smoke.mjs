/**
 * Boot the packaged backend exactly as the Electron main process does and
 * require its readiness handshake. Runs after `desktop:package`; the smoke
 * proves the pruned packaged dependency set actually starts the local web
 * host, which assembling an installer cannot show.
 */

import { fork } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

/** Locate the packaged unpacked application electron-builder produced. */
function locatePackagedApp() {
  const suffixes = {
    win32: ['win-unpacked'],
    linux: ['linux-unpacked'],
    // electron-builder suffixes the mac output directory per architecture and
    // names the bundle executable after the product, so both are discovered
    // from the built tree instead of assumed.
    darwin: ['mac', 'mac-arm64', 'mac_arm64', 'mac-x64'],
  }[process.platform]
  if (suffixes === undefined) throw new Error(`boot-smoke: unsupported platform ${process.platform}`)
  const unpackedDir = suffixes.map(name => join(root, 'dist', name)).find(existsSync)
  if (unpackedDir === undefined) {
    const present = existsSync(join(root, 'dist'))
      ? readdirSync(join(root, 'dist')).join(', ')
      : 'nothing'
    throw new Error(`boot-smoke: no packaged application under dist for ${process.platform} (dist holds: ${present}); run pnpm run desktop:package first`)
  }
  if (process.platform !== 'darwin') {
    const executableName = process.platform === 'win32' ? 'deepseek-harness.exe' : 'deepseek-harness'
    return { executable: join(unpackedDir, executableName), resources: join(unpackedDir, 'resources') }
  }
  const appBundle = readdirSync(unpackedDir).find(name => name.endsWith('.app'))
  if (appBundle === undefined) throw new Error('boot-smoke: no .app bundle in the mac output directory')
  const macosDir = join(unpackedDir, appBundle, 'Contents', 'MacOS')
  const executable = readdirSync(macosDir).map(name => join(macosDir, name)).find(path => statSync(path).isFile())
  if (executable === undefined) throw new Error(`boot-smoke: no executable inside ${macosDir}`)
  return { executable, resources: join(unpackedDir, appBundle, 'Contents', 'Resources') }
}

const { executable, resources } = locatePackagedApp()
// Only the archive file itself is checkable here: reading paths inside
// app.asar requires Electron's patched fs, which exists only in the forked
// backend below.
const archive = join(resources, 'app.asar')
const backendEntry = join(archive, 'lib', 'backend.js')
for (const path of [executable, archive]) {
  if (!existsSync(path)) throw new Error(`boot-smoke: ${path} is missing; run pnpm run desktop:package first`)
}

const home = mkdtempSync(join(tmpdir(), 'dsh-boot-smoke-'))
process.on('exit', () => { rmSync(home, { recursive: true, force: true }) })

const child = fork(backendEntry, [], {
  execPath: executable,
  execArgv: ['--expose-internals'],
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: home },
  silent: true,
})
child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)

const timeout = setTimeout(() => {
  console.error('boot-smoke: timed out waiting for the packaged backend readiness handshake')
  child.kill('SIGKILL')
  process.exitCode = 1
}, 120_000)
timeout.unref()

let ready = false
child.on('message', (message) => {
  if (message?.type === 'ready') {
    ready = true
    clearTimeout(timeout)
    console.log(`boot-smoke: packaged backend ready on port ${String(message.port)}`)
    child.kill('SIGTERM')
  } else if (message?.type === 'failure') {
    clearTimeout(timeout)
    console.error(`boot-smoke: packaged backend reported a startup failure:\n${String(message.message)}`)
    child.kill('SIGKILL')
    process.exitCode = 1
  }
})
child.on('exit', (code, signal) => {
  // A post-readiness exit is the expected response to the stop signal,
  // whatever code the platform's graceful shutdown settles on.
  if (ready || process.exitCode === 1) return
  clearTimeout(timeout)
  console.error(`boot-smoke: packaged backend exited before readiness (code ${String(code)}, signal ${String(signal)})`)
  process.exitCode = 1
})
