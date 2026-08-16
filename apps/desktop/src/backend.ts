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
 * Flatten one startup failure for the parent's error page. The vendored
 * loader wraps per-entry failures in `AggregateError`s reachable only
 * through `cause` chains; the page must show the deepest causes or a broken
 * composition reads as an unexplained blank. Wrapper messages that merely
 * prefix a deeper cause are dropped.
 * @param error - the thrown startup failure.
 * @returns the message text to present.
 */
function describe(error: unknown): string {
  const messages: string[] = []
  const seen = new Set<unknown>()
  const queue: unknown[] = [error]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined || seen.has(current)) continue
    seen.add(current)
    if (current instanceof AggregateError) {
      for (const cause of current.errors as unknown[]) queue.push(cause)
    } else if (current instanceof Error) {
      if (current.message !== '') messages.push(current.message)
      if (current.cause !== undefined) queue.push(current.cause)
    } else if (typeof current === 'string' && current !== '') {
      messages.push(current)
    }
  }
  const causes = messages.filter((message, index) => !messages.some(
    (other, otherIndex) => otherIndex !== index && other.startsWith(message) && other.length > message.length,
  ))
  const headline = error instanceof Error && !(error instanceof AggregateError) ? error.message : 'startup failed'
  const shown = causes.slice(0, 5).map((cause, index) => `  [${String(index + 1)}] ${cause}`).join('\n')
  const elided = causes.length > 5 ? `\n  … and ${String(causes.length - 5)} more` : ''
  return `${headline}\n${shown}${elided}`
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
