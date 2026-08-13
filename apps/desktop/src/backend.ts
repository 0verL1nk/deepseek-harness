/**
 * Isolated dsh Web host for the Electron main process. A child process keeps
 * CLI signal handling and native tool execution outside the Electron process.
 * @module @deepseek-ai/dsh-desktop/backend
 */

import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'

interface ReadyMessage {
  type: 'ready'
  port: number
}

interface FailureMessage {
  type: 'failure'
  message: string
}

/** Send a readiness or startup-failure message to the Electron parent. */
function report(message: ReadyMessage | FailureMessage): void {
  process.send?.(message)
}

try {
  const { ctx } = await runProfile({
    environment: loadLayeredEnv('dsh'),
    profile: 'web',
    patchFiles: [],
    args: ['--host', '127.0.0.1', '--port', '0'],
  })
  const port = ctx.get('webServer')?.port
  if (port === undefined) throw new Error('desktop backend started without a webServer service')
  report({ type: 'ready', port })
} catch (error) {
  report({ type: 'failure', message: error instanceof Error ? error.message : String(error) })
  process.exitCode = 1
}
