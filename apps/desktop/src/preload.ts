/**
 * Narrow renderer bridge for the custom desktop title bar. It deliberately
 * exposes no filesystem, shell, or arbitrary IPC capability.
 * @module @deepseek-ai/dsh-desktop/preload
 */

import { contextBridge, ipcRenderer } from 'electron'

type WindowAction = 'minimize' | 'toggle-maximize' | 'close'

contextBridge.exposeInMainWorld('dshDesktop', {
  window: (action: WindowAction): Promise<void> => ipcRenderer.invoke('desktop-window', action),
})

document.documentElement.dataset.dshDesktop = 'true'
