# Agent Note: Electron desktop surface

English | [中文](2026-08-13-electron-desktop-surface.zh.md)

Status: implemented

## Problem

The browser profile needs an installable desktop delivery path with native lifecycle behavior and cross-platform releases, without creating a second agent runtime or granting browser content host privileges.

## Decision

`apps/desktop` packages Electron around the existing `dsh web` profile. The main process starts that profile in an Electron Node-mode child process on an OS-selected loopback port, then opens a locked-down BrowserWindow at its exact origin. The renderer receives only title-bar controls through preload IPC; the local host continues to own session state, plugins, tools, and user configuration.

The package keeps only English and Simplified Chinese Electron locale data, packages application code in ASAR, and includes only built entry points and production dependencies. Runtime packaging excludes dependency source, type declarations, documentation, source maps, and tests. Native dependencies rebuild for the target Electron ABI rather than silently using a Node ABI binary.

The release workflow injects the current GitHub repository owner and name into electron-builder's GitHub provider configuration. A distribution therefore checks updates from the release repository that produced it instead of a source-controlled fixed owner.

The custom title bar and tray keep a closed window available until the user selects Quit. Updates use `electron-updater` with the GitHub provider: release artifacts include updater metadata, users approve downloads, progress appears in taskbar and tray, and a ready update offers restart installation or installation on normal quit.

The Desktop workflow builds native macOS Intel, macOS Apple Silicon, Windows x64, and Linux x64 artifacts from `dsh-v*` tags, uploads every installer and updater metadata file to the tag's GitHub Release, and accepts signing and notarization secrets only in release jobs.

## Alternatives considered

**A second desktop agent runtime** lost because it would duplicate the Web composition, configuration, and lifecycle behavior instead of reusing the profile that is already the product surface.

**Node integration in the renderer** lost because untrusted or compromised GUI content must not inherit filesystem or shell access.

**Built-in Electron autoUpdater only** lost because it does not cover Linux; `electron-updater` supports the NSIS, macOS, and AppImage release targets with GitHub metadata.

## Consequences

The packaged app carries the dsh runtime dependency closure and native modules must rebuild for Electron in every platform job. macOS users receive automatic updates only from signed builds; release maintainers must configure the documented signing and notarization secrets before treating a macOS release as production-ready.
