# Agent Note: 拉取请求 CI 的可移植恢复边界

Status: implemented

[English](2026-07-23-portable-required-pull-request-ci.md) | 中文

## 问题

分配到组织自有运行器标签的拉取请求必需作业，在 GitHub 无法为这些池分配运行器时会持续排队。工作流本身有效，GitHub 标准托管作业仍能通过，但 `all checks passed` 始终无法启动，原本健康的拉取请求因此无法满足分支保护要求。

账单状态正常、运行器定义处于 `Ready` 状态以及较高的自动扩缩容上限，都不能证明指定的运行器池可以接收作业。必需的正确性检查需要预先明确一条可移植恢复路径，即使日常低延迟路径依赖仓库外部的运行器预配也不例外。

## 决策

[CI](../../../../.github/workflows/ci.yml) 在上游仓库中将三项必需的主 Node 24 作业路由到 16 核 Linux larger runner，将诊断性的原生 Windows 作业路由到 16 核 Windows larger runner。fork 无法访问这些仅限上游的标签，因此相同作业会使用标准 `ubuntu-24.04` 和 `windows-2025` 运行器。fork 作业会降低 gate、工具、coverage 和 snapshot 并发度以适配标准四核运行器；它们运行相同检查，而不是丢弃证据。显式的自托管故障转移变量仍是上游仓库的最高优先级选择器。必需的 Windows 作业在标准 `ubuntu-latest` 上通过 Wine 运行 Windows Node，覆盖阻断性检查范围；独立的原生 Windows 作业不参与聚合流程（[双 Windows 决策](2026-08-08-native-windows-pull-request-ci.md)）。标准托管作业保留 Node 兼容性、Python SDK 单元测试套件与[发布形态的 Linux x64 Python 运行时验证](../testing/2026-08-12-required-python-runtime-pull-request-ci.md)，串行参考流程仍是完整且未分片的跨平台定义。

三项 Linux 主作业、Node 兼容性、Python SDK 单元测试套件、Python 运行时验证和 `windows node 24 / wine blocking` 继续作为 `all checks passed` 的依赖项；`windows node 24 / native complete` 被刻意排除。分支保护继续要求 `e2e` 和 `all checks passed`。fork 运行不得指向上游专属标签，因此其必需检查能够在标准托管容量上启动并产生相同证据。

当前主拓扑及其测量结果以[大型运行器决策](2026-07-22-evidence-based-larger-hosted-runners.md)为准。[跨平台串行参考流程](2026-07-21-serial-cross-platform-ci-reference.md)继续作为独立的标准托管完整性检查，手动大型运行器套件则保留规格比较，同时不扩大普通必需矩阵。

## 曾考虑的替代方案

**让所有仓库都使用标准容量。** 此方案取消上游的 larger-runner 路径，但标准运行器上的完整作业反馈明显更慢，仍会遇到共享容量排队。当前路由既保留上游实测的关键路径，也不会让 fork 永远等待不可用的私有标签。

**根据标称核心数选择企业规格。** 基准测试表明扩展效果不呈单调变化，设置耗时也存在波动，因此必需运行器池改由完整作业的精确测量结果选定。

**在容量不可用时跳过检查或降低其级别。** 这种方式通过丢弃证据而非执行仓库的必需约定来使状态变绿。

**在每台主机上使用同一工作线程策略。** 外层门禁并发与内层工具工作线程在 Linux、Windows 和标准运行器上的争用方式不同；按主机实测的上限可以避免新增核心反而拖慢执行。

## 后果

上游拉取请求会将企业级运行器容量用于 Linux 关键路径，fork 则在标准托管容量上运行相同约定。Wine 作业让必需的 Windows 判定继续使用标准 Linux 运行器容量。独立原生作业遵循同一上游或 fork 选择器，不会延迟或改变聚合流程。一次针对确切分支头的实际运行会区分分支保护采用的命令与单独的诊断约定；排队延迟与每个作业从 `startedAt` 到 `completedAt` 的执行区间分开报告。

企业级运行器分配能力下降时，上游仍可使用自托管故障转移。fork 不再依赖其无法使用的上游运行器定义。标准兼容性作业、必需的 Wine 作业与诊断性原生 Windows 作业在企业容量退化时仍能提供有用证据。标准 `ubuntu-24.04` 镜像自带 `pwsh` 可执行文件，因此 fork 会运行没有 `pwsh` 的主机所跳过的 `pwshOnly` ACP 快照场景；acp 的 pwsh overlay 必须显式启用 `tool-pwsh`（基础补丁在 Windows 之外禁用该条目），其固定的工具 schema 采用当前 `dsh-tool-jobs` 措辞。fork 中以 master 为作用域的 Wine apt 缓存要等其 master 下一次推送后才会有内容，因此 Wine 作业的超时必须覆盖无缓存的 apt 安装。
