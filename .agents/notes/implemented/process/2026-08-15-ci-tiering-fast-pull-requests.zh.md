# Agent Note: CI 分层 — 快速 PR 车道与手动触发的全量运行

Status: implemented

[English](2026-08-15-ci-tiering-fast-pull-requests.md) | 中文

## 问题

在标准四核 fork runner 上，CI workflow 的 PR（Pull Request）墙上时间达到约 22 分钟。最重的几项作业从未为这类硬件校准：原生 Windows 完整清单（门禁并发为 2 时 21.6 分钟）、按文件 100% 的覆盖率（15.9 分钟）、以及仅 web 浏览器门禁一项就约 9 分钟的 consumer 聚合；上游为 16 核企业池校准的正是这些作业。PR 作业恢复的托管 pnpm store 与 Playwright 缓存在 fork 上也无人生产——负责播种的串行参照作业处于禁用状态（`if: false`，TODO(hosted-serial-ci)）——因此每个 PR 还要额外付出一次冷安装和完整的 Chromium 下载。

## 决策

该 workflow 现在分为快速 PR 档与手动触发的全量档。PR 运行静态分析、不含 web 浏览器门禁的 consumer 聚合（[run-gates.ts](../../../../scripts/run-gates.ts) 中 `check:ci:consumers:pr` 背后的 `ci-consumers-pr` 模式）、Node 兼容性、两条 Python 车道以及 Wine 阻塞作业；`all-checks-passed` 不再依赖 `node-24-coverage`。覆盖率与原生 Windows 清单仅在 workflow_dispatch 时运行；consumer 作业在除 push 外的所有事件上运行，并在非 PR 事件执行完整聚合——包括 web 浏览器门禁。一个 master push 的 `cache-producer` 作业以 PR 作业恢复所用的完全相同的 key 播种 pnpm store 与 Playwright 缓存，接替被禁用的串行生产者。[ci-workflow.spec.ts](../../../../scripts/ci-workflow.spec.ts) 钉住档位分配与有界的 push 可达集合：穷尽档作业只挂在 dispatch 上或被排除在 push 之外，因此不会在 push 取消豁免之后堆积未取消的运行。故障切换开关不变——coverage 与 consumers 仍通过 `DSH_CI_FAILOVER_LINUX` 解析池，原生 Windows 作业通过 `DSH_CI_FAILOVER_WINDOWS`（[故障切换手册](2026-07-26-ci-failover-runbook.md)）。

## 曾考虑的替代方案

**每个 PR 保留全部门禁并购买更大的 runner。** 否决：这是用付费解决调度问题，而故障切换机制已为真正的容量事故记录了自有托管路径。

**把穷尽档挪到 master push 而非 dispatch。** 否决：push 运行被豁免于 cancel-in-progress 以保护待命演练，繁忙时段可达 push 的重作业会堆积未取消的运行；dispatch 保留取消语义并允许选择分支，因此全量运行可以在合并前指向任意 PR 分支。

**将覆盖率按矩阵分片。** 否决：它只能把覆盖率作业减半，却把九分钟的 web 门禁与 Windows 清单留在 PR 路径上，还要为最少的收益引入报告合并管道。

## 后果

PR 不再获得每次推送的穷尽覆盖率、web 浏览器回放或原生 Windows 内核信号；手动触发的全量运行恢复这三者，运行它成为显式意图而非自动的合并后事件。快速车道保留了无密钥快照回放路径，它能捕获模型可见的回归，例如过期的 tool-schema 钉定。四核 runner 上的 PR 墙上时间从约 22 分钟降到约 6 分钟，且首个 master push 预热缓存之后，冷安装与 Chromium 下载开销消失。[testing.md](../../../../docs/testing.md) 记载了覆盖率与 web 门禁的档位。
