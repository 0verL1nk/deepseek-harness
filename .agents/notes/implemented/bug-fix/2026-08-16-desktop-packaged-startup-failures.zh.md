# Agent Note: Desktop packaged startup failures — peer closure, src pruning, HMR internals

Status: implemented

[English](2026-08-16-desktop-packaged-startup-failures.md) | 中文

## Problem

桌面端在改用自己的 `v*` 标签命名空间之前,以 `dsh-v0.1.0-rc.5` 发布的版本在任何机器上都无法启动:打包后的后端在就绪前退出,窗口只显示 "DeepSeek Harness could not start"。对随版本发布的 `app.asar` 复现(在 `ELECTRON_RUN_AS_NODE` 下 fork `lib/backend.js`)暴露出四个相互独立的缺陷,而发布工作流一个都看不到,因为从未有环节真正启动过打包产物。其一,electron-builder 沿它能遍历的依赖图裁剪 `node_modules`,而 harness 各包之间通过 `peerDependencies` 相互引用;十九个仅经由 peer 边可达的包——包括仅 Linux 激活的 bash 栈(`cordis-plugin-group`、`dsh-shell`、`dsh-fs`、`dsh-bash-local`、`dsh-compaction`、`dsh-workflow`、`dsh-invariants` 及其余已声明闭包)——不在归档中。其二,`files` 排除规则 `!node_modules/**/src/**` 本意是丢弃工作区 TypeScript 源码,却连带删除了构建产物位于 `src/` 之下的 npm 包(`koffi`,以及所有 `@opentelemetry` 位于 `build/src` 的 CJS 树)。其三,profile boot 挂载的只监视 HMR 实例需要 Node loader internals;普通 Node 进程的 `dsh` 通过 `node-addon-require-builtin` 原生兜底获得它们,而该插件读不了 Electron 的 V8 realm 布局,于是后端 fork 在 web host 已经绑定端口之后因 "--expose-internals is required for HMR service" 失败。其四,profile 模块回退把每个安装包符号链接进 `$DSH_HOME/profiles/node_modules`,而打包应用里这些链接指向 `app.asar` 归档内部——符号链接穿越发生在内核层、位于 Electron 的归档拦截之下,于是所有从 profile 目录发起的 loader 条目导入全部失败。

## Decision

desktop 包把 peer-only 运行时闭包声明为直接 `dependencies`,使打包后端解析到的每个模块无论经由哪种边到达都能在裁剪后保留。`files` 排除规则收窄为 `!node_modules/@deepseek-ai/*/src/**`,保持 npm 包 `src/` 形态的产物完整。`startBackend` 以 `execArgv: ['--expose-internals']` fork,vendored loader 接受它作为 internals 来源,而原生插件在 Electron 下无法提供。两道门禁让这一类问题响亮地回归而不是静默地回归:`pnpm --filter @deepseek-ai/dsh-desktop run boot-smoke` 以与 Electron 主进程完全相同的方式 fork 打包后端并要求就绪握手,[Desktop 工作流](../../../../.github/workflows/desktop.yml) 在每次 PR 检查和每个平台的发布构建中、在制品发布之前运行它。交叉编译的构建腿还需要外部架构的原生可选依赖:工作区为所有发布的平台与架构安装可选依赖(`pnpm-workspace.yaml` 的 `supportedArchitectures`),否则在 arm64 runner 上的 macOS x64 构建缺少 `@img/sharp-darwin-x64`,打包后端无法启动。桌面归档将 `node_modules` 解包(`asarUnpack`),`healProfilesModuleFallback` 在链接目标位于 `app.asar` 归档内部且存在 `app.asar.unpacked` 孪生目录时改链到孪生目录,回退链接因此总是指向内核可以穿越的真实目录。后端启动失败消息现在会沿 `cause` 链展开 `AggregateError` 的子错误(前五条,带省略计数),坏掉的组合不再表现为一段无法解释的空白。发布通道策略:每个 `v*` 标签都发布为正式 Release——本分发只有一个稳定通道,预发布标记只会让已安装的客户端看不到新版本。

## Alternatives considered

**用 tsdown 打包整个运行时(仅 `electron` 外部化)。** 否决:cordis Loader 在运行时按包名从组合后的 profile 导入插件条目,静态打包表达不了组合;原生模块和 `electron-updater` 仍需要 unpacked `node_modules` 处理。

**从组合文件生成闭包清单。** 否决其作为主机制:运行时集合还取决于 `profile-boot` 内部的动态挂载(timer、只监视 HMR)以及未来每个插件自己的 peer 边,静态生成器一个都看不见。boot smoke 观察的是真实组合,那才是要紧的不变量;已声明的清单是修复手段,不是探测器。

**发布一个 macOS universal 构建。** 否决:`@electron/universal` 合并两个单架构归档时会把每个解包文件的路径拼进同一个花括号模式,运行时依赖树整体解包后该模式超出 minimatch 的长度上限。按架构区分的 macOS 构建完全绕开合并器。

**为桌面表面压制只监视 HMR 挂载。** 否决:那会静默破坏向桌面用户承诺的 `cordis.patch.yml` 实时重载契约;传一个 flag 没有任何代价,并让该表面与所有其他 `dsh` 宿主走同一条路径。

## Consequences

向 web 组合添加一个 peer 引用了桌面依赖清单之外包的插件,不再产生装不上就崩的版本——boot smoke 先让 Desktop 工作流失败,修复仍然只是一条已声明的依赖。打包归档保留了一些在没有更窄规则时无法去掉的工作区 `src/` 字节,desktop 清单现在承载的是镜像组合 profile 而非外壳自身导入的依赖清单;README 陈述了该契约。单通道策略意味着一个真正坏的标签无法通过标记 prerelease 向更新客户端隐瞒——坏版本必须被修复版本取代,正如第一个桌面自有版本的发布取代它。
