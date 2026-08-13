/** Native-process desktop copy, kept separate from browser locale dictionaries. */

/** Native menu and updater texts for one Electron application locale. */
export interface DesktopCopy {
  show: string
  quit: string
  availableTitle: string
  availableMessage: (version: string) => string
  availableDetail: string
  download: string
  later: string
  failedTitle: string
  failedMessage: string
  readyTitle: string
  readyMessage: (version: string) => string
  readyDetail: string
  restart: string
  installOnQuit: string
}

/** Resolve the native-process copy from Electron's operating-system locale. */
export function desktopCopy(locale: string): DesktopCopy {
  if (locale.toLowerCase().startsWith('zh')) {
    return {
      show: '显示 DeepSeek Harness', quit: '退出', availableTitle: '发现新版本',
      availableMessage: version => `DeepSeek Harness ${version} 可用。`, availableDetail: '现在在后台下载，或继续使用当前版本。',
      download: '立即下载', later: '稍后', failedTitle: '更新下载失败', failedMessage: 'DeepSeek Harness 无法下载更新。',
      readyTitle: '更新已准备就绪', readyMessage: version => `DeepSeek Harness ${version} 已准备就绪。`,
      readyDetail: '现在重启即可安装，或在退出 DeepSeek Harness 时安装。', restart: '重启并安装', installOnQuit: '退出时安装',
    }
  }
  return {
    show: 'Show DeepSeek Harness', quit: 'Quit', availableTitle: 'Update available',
    availableMessage: version => `DeepSeek Harness ${version} is available.`, availableDetail: 'Download the update in the background now, or continue with the current version.',
    download: 'Download now', later: 'Later', failedTitle: 'Update download failed', failedMessage: 'DeepSeek Harness could not download the update.',
    readyTitle: 'Update ready to install', readyMessage: version => `DeepSeek Harness ${version} is ready.`,
    readyDetail: 'Restart now to install it, or choose Install when I quit to finish your work first.', restart: 'Restart and install', installOnQuit: 'Install when I quit',
  }
}
