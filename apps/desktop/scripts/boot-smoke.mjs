/**
 * Boot the packaged backend exactly as the Electron main process does and
 * require its readiness handshake. Runs after `desktop:package`; the smoke
 * proves the pruned packaged dependency set actually starts the local web
 * host, which assembling an installer cannot show.
 */

import { fork } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

/** Per-platform unpacked-application layout produced by `desktop:package`. */
const layouts = {
  win32: { executable: ['win-unpacked', 'deepseek-harness.exe'], resources: ['win-unpacked', 'resources'] },
  linux: { executable: ['linux-unpacked', 'deepseek-harness'], resources: ['linux-unpacked', 'resources'] },
  darwin: {
    executable: ['mac', 'DeepSeek Harness.app', 'Contents', 'MacOS', 'deepseek-harness'],
    resources: ['mac', 'DeepSeek Harness.app', 'Contents', 'Resources'],
  },
}

const layout = layouts[process.platform]
if (layout === undefined) throw new Error(`boot-smoke: unsupported platform ${process.platform}`)
const executable = join(root, 'dist', ...layout.executable)
const resources = join(root, 'dist', ...layout.resources)
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

child.on('message', (message) => {
  if (message?.type === 'ready') {
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
  if (process.exitCode === 1 || signal === 'SIGTERM') return
  clearTimeout(timeout)
  console.error(`boot-smoke: packaged backend exited before readiness (code ${String(code)}, signal ${String(signal)})`)
  process.exitCode = 1
})
