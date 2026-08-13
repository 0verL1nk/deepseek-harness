/**
 * Electron main process for the DeepSeek Harness local desktop surface.
 * @module @deepseek-ai/dsh-desktop
 */

import { fork, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain, Menu, nativeImage, session, Tray } from 'electron'
import { startAutomaticUpdates } from './updates.ts'
import { desktopCopy } from './i18n.ts'

interface BackendReadyMessage {
  type: 'ready'
  port: number
}

interface BackendFailureMessage {
  type: 'failure'
  message: string
}

type BackendMessage = BackendReadyMessage | BackendFailureMessage

const BACKEND_STARTUP_TIMEOUT_MS = 30_000

let backend: ChildProcess | undefined
let mainWindow: BrowserWindow | undefined
let tray: Tray | undefined
let quitting = false

/** Return the compiled backend entry beside this Electron main entry. */
function backendEntry(): string {
  return fileURLToPath(new URL('./backend.js', import.meta.url))
}

/** Return the sandboxed preload script that exposes only window controls. */
function preloadEntry(): string {
  return fileURLToPath(new URL('./preload.js', import.meta.url))
}

/** Load the project favicon from the packaged resources or the web application source. */
function trayIcon() {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'favicon.svg')
    : fileURLToPath(new URL('../../web/public/favicon.svg', import.meta.url))
  const image = nativeImage.createFromPath(path)
  if (process.platform === 'darwin') image.setTemplateImage(true)
  return image
}

/** Show the existing application window or create it when macOS reactivates the app. */
function showWindow(): void {
  if (mainWindow !== undefined && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return
  }
  void startOrShowWindow()
}

/** Install the persistent tray entry that owns the explicit application exit. */
function createTray(): void {
  if (tray !== undefined) return
  tray = new Tray(trayIcon())
  tray.setToolTip('DeepSeek Harness')
  const copy = desktopCopy(app.getLocale())
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: copy.show, click: showWindow },
    { type: 'separator' },
    { label: copy.quit, click: () => { quitting = true; app.quit() } },
  ]))
  tray.on('click', showWindow)
}

/** Stop the private Web host if it is still running. */
function stopBackend(): void {
  backend?.kill('SIGTERM')
  backend = undefined
}

/** Render a local error page without granting the renderer Electron APIs. */
async function showStartupError(message: string): Promise<void> {
  const window = new BrowserWindow({
    width: 720,
    height: 420,
    frame: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: preloadEntry() },
  })
  mainWindow = window
  const escaped = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  await window.loadURL(`data:text/html,<!doctype html><meta charset=utf-8><title>DeepSeek Harness</title><main><h1>DeepSeek Harness could not start</h1><pre>${escaped}</pre></main>`)
}

/** Launch the bundled dsh Web profile in Electron's Node-mode child process. */
async function startBackend(): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = fork(backendEntry(), [], {
      execPath: process.execPath,
      execArgv: [],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        DSH_HOME: app.getPath('userData'),
      },
      silent: true,
    })
    backend = child
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for the local dsh Web host to start'))
    }, BACKEND_STARTUP_TIMEOUT_MS)
    const settle = (result: () => void): void => {
      clearTimeout(timeout)
      child.off('message', onMessage)
      child.off('exit', onExit)
      result()
    }
    const onMessage = (value: unknown): void => {
      const message = value as Partial<BackendMessage>
      if (message.type === 'ready' && typeof message.port === 'number') {
        settle(() => { resolve(`http://127.0.0.1:${String(message.port)}`) })
      } else if (message.type === 'failure' && typeof message.message === 'string') {
        settle(() => { reject(new Error(message.message)) })
      }
    }
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      settle(() => { reject(new Error(`Local dsh Web host exited before readiness (code ${String(code)}, signal ${String(signal)})`)) })
    }
    child.on('message', onMessage)
    child.once('exit', onExit)
  })
}

/** Open one locked-down BrowserWindow for the private loopback origin. */
async function createWindow(url: string): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    frame: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: preloadEntry() },
  })
  mainWindow = window
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-attach-webview', (event) => { event.preventDefault() })
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl !== url) event.preventDefault()
  })
  await window.loadURL(url)
  window.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })
}

/** Start the backend once, then open the desktop chrome over its loopback URL. */
async function startOrShowWindow(): Promise<void> {
  try {
    await createWindow(await startBackend())
  } catch (error) {
    stopBackend()
    await showStartupError(error instanceof Error ? error.message : String(error))
  }
}

app.enableSandbox()

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => { callback(false) })
  ipcMain.handle('desktop-window', (event, action: unknown) => {
    if (event.sender.id !== mainWindow?.webContents.id || typeof action !== 'string') return
    if (action === 'minimize') mainWindow.minimize()
    if (action === 'toggle-maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    }
    if (action === 'close') mainWindow.close()
  })
  createTray()
  await startOrShowWindow()
  if (app.isPackaged) startAutomaticUpdates({ window: () => mainWindow, tray: () => tray, locale: () => app.getLocale() })
})

app.on('activate', () => {
  showWindow()
})

app.on('before-quit', () => { quitting = true; stopBackend() })
