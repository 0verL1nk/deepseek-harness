# Agent Note: Electron desktop surface

[English](2026-08-13-electron-desktop-surface.md) | 中文

Status: implemented

## 问题

浏览器 profile 需要可安装的桌面交付路径、原生生命周期行为和跨平台发布能力，同时不能创建第二套 agent runtime，也不能让浏览器内容获得宿主权限。

## 决策

`apps/desktop` 使用 Electron 封装现有的 `dsh web` profile。主进程会在 Electron Node 模式的子进程中以系统分配的 loopback 端口启动该 profile，然后在受严格限制的 BrowserWindow 中打开它的精确来源。渲染器只通过 preload IPC 获得标题栏控制能力；本地服务仍负责会话状态、插件、工具和用户配置。

安装包只保留英文和简体中文 Electron locale 数据，将应用代码放入 ASAR，并且仅包含构建产物入口和生产依赖。运行时封装会排除依赖源码、类型声明、文档、source map 和测试。原生依赖会为目标 Electron ABI 重新构建，而不会静默使用 Node ABI 二进制文件。

发布工作流会将当前 GitHub 仓库 owner 和名称注入 electron-builder 的 GitHub provider 配置。因此，发行版会从实际生成该发行版的 Release 仓库检查更新，而不是使用源码中固定的 owner。

dsh 发布族拥有 `dsh-vX.Y.Z` 标签命名空间。标签触发的桌面构建会派生并注入 `X.Y.Z`（可带 SemVer 预发布后缀）作为安装应用版本，因此更新比较使用与发布族相同的标准版本。

自定义标题栏和托盘会让关闭的窗口保持可用，直到用户选择退出。更新使用 GitHub provider 的 `electron-updater`：发布制品包含更新元数据，用户批准下载，进度显示在任务栏和托盘中，准备好的更新可选择重启安装或在正常退出时安装。

Desktop 工作流从 `dsh-v*` 标签构建 macOS Intel、macOS Apple Silicon、Windows x64 和 Linux x64 原生制品，将每个安装包和更新元数据上传到该标签的 GitHub Release，并且只在发布任务中接受签名和公证 secrets。

## 已考虑的替代方案

**第二套桌面 agent runtime** 未被采用，因为它会复制 Web composition、配置和生命周期行为，而不是复用已经存在的产品界面 profile。

**在渲染器中启用 Node integration** 未被采用，因为不可信或被攻破的 GUI 内容不应继承文件系统或 shell 访问能力。

**只使用 Electron 内置 autoUpdater** 未被采用，因为它不覆盖 Linux；`electron-updater` 支持带有 GitHub 元数据的 NSIS、macOS 和 AppImage 发布目标。

## 后果

打包应用会携带 dsh runtime 依赖闭包，且每个系统构建任务都必须为 Electron 重建原生模块。macOS 用户只能从已签名的构建获得自动更新；在将 macOS 发布视为生产就绪之前，发布维护者必须配置文档中声明的签名和公证 secrets。
