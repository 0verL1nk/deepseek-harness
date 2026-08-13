# @deepseek-ai/dsh-desktop

[English](README.md) | 中文

DeepSeek Harness 桌面应用。Electron 在隔离的本地子进程中承载现有的 `dsh web` profile，并且只加载随机分配的 `127.0.0.1` 来源。

## 用户体验

应用使用自定义标题栏，提供拖拽、最小化、最大化和关闭控件。关闭窗口后 DeepSeek Harness 会留在系统托盘；可通过托盘菜单重新打开或退出。退出会停止本地服务。

当 GitHub Release 中存在更新的已签名桌面版本时，应用会在下载前询问用户。下载进度会显示在任务栏和托盘中。下载完成后，可以选择立即重启安装，或在下一次正常退出时安装。

浏览器标题栏文案来自共享的客户端 locale 服务。原生菜单和更新对话框使用桌面进程中的 `src/i18n.ts` 字典，并按操作系统 locale 选择。

## 分发

在执行 `pnpm run build` 后，`pnpm run desktop:package` 会构建未打包的本地应用。`pnpm run desktop:make` 会生成平台分发包：macOS DMG 和 ZIP、Windows NSIS、Linux AppImage 和 DEB。[Desktop 工作流](../../.github/workflows/desktop.yml) 会从 `dsh-v*` 标签为 macOS Intel、macOS Apple Silicon、Windows x64 和 Linux x64 构建原生制品，并把它们附加到对应的 GitHub Release。

发布工作流支持使用 `DESKTOP_CSC_LINK`、`DESKTOP_CSC_KEY_PASSWORD`、`DESKTOP_APPLE_ID`、`DESKTOP_APPLE_APP_SPECIFIC_PASSWORD` 和 `DESKTOP_APPLE_TEAM_ID` GitHub secrets 进行签名和 macOS 公证。它会在构建时把当前 GitHub 仓库 owner 和名称注入更新元数据，因此 fork 发布的版本会检查该 fork 的 GitHub Release。macOS 自动更新需要已签名的构建。

## 安全性

渲染器启用了沙箱和上下文隔离，禁用了 Node 集成和 webview，拒绝权限请求，并且只通过范围受限的 IPC bridge 控制窗口。它不能调用文件系统、shell 或任意 Electron API。
