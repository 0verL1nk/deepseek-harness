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

/**
 * Flatten one startup failure for the parent's error page: an AggregateError
 * from the vendored loader hides the per-entry causes in `errors`, and the
 * page must show them or a broken composition reads as an unexplained blank.
 * @param error - the thrown startup failure.
 * @returns the message text to present.
 */
function describe(error: unknown): string {
  if (!(error instanceof AggregateError)) return error instanceof Error ? error.message : String(error)
  const causes = error.errors.map(cause => cause instanceof Error ? cause.message : String(cause))
  const shown = causes.slice(0, 5).map((cause, index) => `  [${String(index + 1)}] ${cause}`).join('\n')
  const elided = causes.length > 5 ? `\n  … and ${String(causes.length - 5)} more` : ''
  return `${error.message}\n${shown}${elided}`
}

try {
  const { ctx } = await runProfile({
    environment: loadLayeredEnv('dsh'),
    profile: 'web',
    patchFiles: [],
    args: ['--host', '127.0.0.1', '--port', '0'],
  })
  const webServer = ctx.get('webServer') as { port: number } | undefined
  const port = webServer?.port
  if (port === undefined) throw new Error('desktop backend started without a webServer service')
  report({ type: 'ready', port })
} catch (error) {
  report({ type: 'failure', message: describe(error) })
  process.exitCode = 1
}
