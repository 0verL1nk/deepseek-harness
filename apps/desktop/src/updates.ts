/**
 * GitHub Release updater for packaged DeepSeek Harness desktop clients.
 * @module @deepseek-ai/dsh-desktop/updates
 */

import { createRequire } from 'node:module'
import { BrowserWindow, dialog, Tray, type MessageBoxOptions, type MessageBoxReturnValue } from 'electron'
import { desktopCopy } from './i18n.ts'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater') as typeof import('electron-updater')

// `console` satisfies electron-updater's Logger interface; the main-process
// output is captured by Electron's `--enable-logging`.
autoUpdater.logger = console

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000

/** Desktop UI owners needed to communicate update choices and progress. */
export interface UpdateUi {
  /** The current main window, when one is visible. */
  window: () => BrowserWindow | undefined
  /** The persistent tray, used when the window is hidden. */
  tray: () => Tray | undefined
  /** Current application locale, sampled when presenting a native dialog. */
  locale: () => string
}

/** Present a native message box with the current window when it exists. */
function showMessage(ui: UpdateUi, options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
  const owner = ui.window()
  return owner === undefined ? dialog.showMessageBox(options) : dialog.showMessageBox(owner, options)
}

/** Configure user-approved GitHub Release updates and install on the chosen exit. */
export function startAutomaticUpdates(ui: UpdateUi): void {
  let downloading = false
  let ready = false
  let showingDownloadFailure = false
  const clearProgress = (): void => {
    ui.window()?.setProgressBar(-1)
    ui.tray()?.setToolTip('DeepSeek Harness')
  }
  const showDownloadFailure = async (message: string): Promise<void> => {
    if (showingDownloadFailure) return
    showingDownloadFailure = true
    clearProgress()
    try {
      const text = desktopCopy(ui.locale())
      await showMessage(ui, {
        type: 'error',
        title: text.failedTitle,
        message: text.failedMessage,
        detail: message,
      })
    } finally {
      showingDownloadFailure = false
    }
  }
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoDownload = false
  autoUpdater.on('update-available', (info) => {
    void (async () => {
      const text = desktopCopy(ui.locale())
      const choice = await showMessage(ui, {
        type: 'info',
        title: text.availableTitle,
        message: text.availableMessage(info.version),
        detail: text.availableDetail,
        buttons: [text.download, text.later],
        defaultId: 0,
        cancelId: 1,
      })
      if (choice.response !== 0 || downloading || ready) return
      downloading = true
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        await showDownloadFailure(error instanceof Error ? error.message : String(error))
      } finally {
        downloading = false
      }
    })()
  })
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.max(0, Math.min(100, progress.percent))
    ui.window()?.setProgressBar(percent / 100)
    ui.tray()?.setToolTip(`DeepSeek Harness — downloading update ${Math.round(percent)}%`)
  })
  autoUpdater.on('update-downloaded', (info) => {
    void (async () => {
      ready = true
      clearProgress()
      const text = desktopCopy(ui.locale())
      const choice = await showMessage(ui, {
        type: 'info',
        title: text.readyTitle,
        message: text.readyMessage(info.version),
        detail: text.readyDetail,
        buttons: [text.restart, text.installOnQuit],
        defaultId: 1,
        cancelId: 1,
      })
      if (choice.response === 0) autoUpdater.quitAndInstall()
    })()
  })
  autoUpdater.on('error', (error) => {
    console.warn('desktop updater:', error.message)
    if (downloading) void showDownloadFailure(error.message)
  })
  const check = (): void => {
    if (!downloading && !ready) void autoUpdater.checkForUpdates()
  }
  check()
  setInterval(check, UPDATE_CHECK_INTERVAL_MS).unref()
}
