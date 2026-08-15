# Agent Note: CI tiering — fast pull-request lane, dispatched exhaustive run

Status: implemented

English | [中文](2026-08-15-ci-tiering-fast-pull-requests.zh.md)

## Problem

On standard four-core fork runners the CI workflow's pull-request wall time reached ~22 minutes. The heaviest jobs were never sized for that hardware: the native Windows complete inventory (21.6 min at gate concurrency 2), per-file-100% coverage (15.9 min), and the consumer aggregate whose web browser gate alone runs ~9 min; upstream calibrates the same jobs for 16-core enterprise pools. The hosted pnpm-store and Playwright caches that pull-request jobs restore also have no producer on a fork — the serial reference jobs that seed them are disabled (`if: false`, TODO(hosted-serial-ci)) — so every pull request additionally pays a cold install and a full Chromium download.

## Decision

The workflow now has a fast pull-request tier and a dispatched exhaustive tier. A pull request runs static analysis, the consumer aggregate without the web browser gate (the `ci-consumers-pr` mode behind `check:ci:consumers:pr` in [run-gates.ts](../../../../scripts/run-gates.ts)), node compatibility, both Python lanes, and the Wine blocking job; `all-checks-passed` no longer needs `node-24-coverage`. Coverage and the native Windows inventory run only on `workflow_dispatch`; the consumers job runs on every event except push and executes the full aggregate — including the web browser gate — off pull requests. A master-push `cache-producer` job seeds the pnpm-store and Playwright caches under the exact keys the pull-request jobs restore, replacing the disabled serial producer. [ci-workflow.spec.ts](../../../../scripts/ci-workflow.spec.ts) pins the tier assignment and the bounded push-reachable set: exhaustive jobs are dispatch-gated or push-excluded, so they cannot accumulate uncancelled runs behind the push cancellation carve-out. The failover switches are unchanged — coverage and consumers still resolve through `DSH_CI_FAILOVER_LINUX`, the native Windows job through `DSH_CI_FAILOVER_WINDOWS` ([failover runbook](2026-07-26-ci-failover-runbook.md)).

## Alternatives considered

**Keep every gate per pull request and buy larger runners.** Rejected: a paid fix for a scheduling problem, while the failover machinery already documents a self-hosted path for genuine capacity episodes.

**Move the exhaustive tier onto master push instead of dispatch.** Rejected: push runs are exempted from cancel-in-progress to protect the standby drills, so heavy push-reachable jobs would accumulate uncancelled runs during busy periods; dispatch keeps cancellation and allows selecting a branch, so a full run can target a pull-request branch before merge.

**Shard coverage across a matrix.** Rejected: it halves the coverage job but leaves the nine-minute web gate and the Windows inventory on the pull-request path, and adds report-merge plumbing for the least benefit.

## Consequences

A pull request no longer sees per-push exhaustive coverage, web browser replay, or a native Windows kernel signal; the dispatched full run restores all three, and running it becomes manual intent rather than an automatic post-merge event. The fast lane keeps the keyless snapshot replay path that catches model-visible regressions such as stale tool-schema pins. Pull-request wall time drops from ~22 min to ~6 min on four-core runners, and once the first master push has warmed the caches, the cold-install and Chromium-download overhead disappears. [testing.md](../../../../docs/testing.md) states the coverage and web-gate tiers.
