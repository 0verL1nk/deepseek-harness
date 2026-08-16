# @deepseek-ai/dsh-desktop

[English](README.md) | 中文

DeepSeek Harness 桌面应用。Electron 在隔离的本地子进程中承载现有的 `dsh web` profile，并且只加载随机分配的 `127.0.0.1` 来源。

## 用户体验

应用使用自定义标题栏，提供拖拽、最小化、最大化和关闭控件。关闭窗口后 DeepSeek Harness 会留在系统托盘；可通过托盘菜单重新打开或退出。退出会停止本地服务。

当 GitHub Release 中存在更新的已签名桌面版本时，应用会在下载前询问用户。下载进度会显示在任务栏和托盘中。下载完成后，可以选择立即重启安装，或在下一次正常退出时安装。

浏览器标题栏文案来自共享的客户端 locale 服务。原生菜单和更新对话框使用桌面进程中的 `src/i18n.ts` 字典，并按操作系统 locale 选择。

## 分发

在执行 `pnpm run build` 后，`pnpm run desktop:package` 会构建未打包的本地应用，`pnpm --filter @deepseek-ai/dsh-desktop run boot-smoke` 会 fork 打包产物中的后端并要求其就绪握手——这一打包门禁证明裁剪后的依赖集真能启动本地 web host。`pnpm run desktop:make` 会生成平台分发包：macOS DMG 和 ZIP、Windows NSIS、Linux AppImage 和 DEB。[Desktop 工作流](../../.github/workflows/desktop.yml) 会从 `vX.Y.Z` 标签（桌面应用独立于其捆绑的 dsh 内核进行版本管理）为 macOS universal、Windows x64 和 Linux x64 构建原生制品，并把它们附加到对应的 GitHub Release。它会从标签派生标准 SemVer `X.Y.Z`（可带预发布后缀）作为安装应用版本。

应用的运行时依赖集是 web profile 的完整组合。electron-builder 只按它能遍历的依赖图裁剪 `node_modules`，而 harness 各包之间通过 `peerDependencies` 相互引用，因此仅经由 peer 边可达的包——vendored 的 `cordis-plugin-group` 以及其他插件以 peer 方式引用的 dsh 服务包——必须声明为本包的直接依赖才能在裁剪后保留。Desktop 工作流在发布前会启动各平台的打包后端，组合变化超出已声明集合时构建会失败，而不是发布一个装不上就崩的版本。

发布工作流支持使用 `DESKTOP_CSC_LINK`、`DESKTOP_CSC_KEY_PASSWORD`、`DESKTOP_APPLE_ID`、`DESKTOP_APPLE_APP_SPECIFIC_PASSWORD` 和 `DESKTOP_APPLE_TEAM_ID` GitHub secrets 进行签名和 macOS 公证。它会在构建时把当前 GitHub 仓库 owner 和名称注入更新元数据，因此 fork 发布的版本会检查该 fork 的 GitHub Release。macOS 自动更新需要已签名的构建。本分发把每个 `v*` 标签都发布为正式 Release：只有单一稳定通道，预发布门槛只会让已安装的客户端看不到新版本。

## 安全性

渲染器启用了沙箱和上下文隔离，禁用了 Node 集成和 webview，拒绝权限请求，并且只通过范围受限的 IPC bridge 控制窗口。它不能调用文件系统、shell 或任意 Electron API。

## 已知局限与遗留工作

未配置签名 secrets 时构建的发布版本不带签名。Windows 上更新器此时没有可校验的发行者签名，更新通道的完整性退化为 GitHub Release 的写权限；macOS 上 Gatekeeper 要求首次打开时手动放行。DEB 安装不会收到应用内更新通知——Linux 上更新器只刷新 AppImage 安装，DEB 跟随系统包管理器。
