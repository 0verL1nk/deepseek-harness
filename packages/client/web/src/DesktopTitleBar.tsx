/** Custom title bar shown only when the web surface runs inside Electron. */
import css from './DesktopTitleBar.module.css'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

declare global {
  interface Window {
    dshDesktop?: { window: (action: 'minimize' | 'toggle-maximize' | 'close') => Promise<void> }
  }
}

/** Render Electron-only window controls through the minimal preload bridge. */
export function DesktopTitleBar(props: { t: Translate<'window.minimize' | 'window.maximize' | 'close'> }) {
  const desktop = window.dshDesktop
  if (desktop === undefined) return null
  return (
    <header className={css.bar}>
      <span className={css.title}>DeepSeek Harness</span>
      <div className={css.controls}>
        <button aria-label={props.t('window.minimize')} onClick={() => void desktop.window('minimize')}>−</button>
        <button aria-label={props.t('window.maximize')} onClick={() => void desktop.window('toggle-maximize')}>□</button>
        <button aria-label={props.t('close')} className={css.close} onClick={() => void desktop.window('close')}>×</button>
      </div>
    </header>
  )
}
