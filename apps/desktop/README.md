# @deepseek-ai/dsh-desktop

English | [中文](README.zh.md)

DeepSeek Harness desktop application. Electron hosts the existing `dsh web` profile in an isolated local child process and loads only its randomly assigned `127.0.0.1` origin.

## User experience

The application uses a custom title bar with drag, minimize, maximize, and close controls. Closing the window keeps DeepSeek Harness in the system tray; use the tray menu to reopen it or quit. Quit stops the local host.

When a GitHub Release contains a newer signed desktop build, the application asks before downloading it. Download progress appears in the taskbar and tray. After download, choose either immediate restart and installation or installation on the next normal quit.

Browser title-bar text comes from the shared client locale service. Native menus and update dialogs use the desktop-process dictionary in `src/i18n.ts`, selected from the operating-system locale.

## Distribution

`pnpm run desktop:package` builds an unpacked local application after `pnpm run build`. `pnpm run desktop:make` produces the platform distribution: macOS DMG and ZIP, Windows NSIS, and Linux AppImage and DEB. The [Desktop workflow](../../.github/workflows/desktop.yml) builds native artifacts for macOS universal, Windows x64, and Linux x64 from `dsh-vX.Y.Z` tags and attaches them to the corresponding GitHub Release. It derives the installed application version as standard SemVer `X.Y.Z` (including an optional prerelease suffix) from that tag.

The release workflow accepts `DESKTOP_CSC_LINK`, `DESKTOP_CSC_KEY_PASSWORD`, `DESKTOP_APPLE_ID`, `DESKTOP_APPLE_APP_SPECIFIC_PASSWORD`, and `DESKTOP_APPLE_TEAM_ID` GitHub secrets for signing and macOS notarization. It injects the current GitHub repository owner and name into the updater metadata at build time, so a forked release checks that fork's GitHub Release. macOS auto-update requires a signed build. A tag whose version carries a prerelease suffix publishes as a GitHub prerelease; electron-updater offers prerelease versions only to clients already running one, so stable installations stay on the stable channel.

## Security

The renderer has sandboxing and context isolation enabled, Node integration disabled, no webview support, denied permissions, and a narrowly scoped IPC bridge for window controls. It cannot invoke filesystem, shell, or arbitrary Electron APIs.

## Known Limitations and Deferred Work

Releases built without the signing secrets are unsigned. On Windows the updater then has no publisher signature to verify, so update-channel integrity reduces to GitHub Release write access; on macOS Gatekeeper requires a manual override on first open. DEB installations receive no in-app update notifications — on Linux the updater refreshes AppImage installations, while DEB follows the system package manager.
