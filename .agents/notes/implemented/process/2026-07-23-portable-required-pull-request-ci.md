# Agent Note: Portable pull-request CI recovery boundary

Status: implemented

English | [中文](2026-07-23-portable-required-pull-request-ci.zh.md)

## Problem

Required pull-request jobs assigned to organization-owned runner labels remain queued when GitHub cannot allocate those pools. The workflow is valid and standard GitHub-hosted jobs can still pass, but `all checks passed` never starts and an otherwise healthy pull request cannot satisfy branch protection.

Billing health, a runner definition's `Ready` state, and a large autoscaling ceiling do not prove that a named pool can receive a job. Required correctness checks need a known portable recovery path even when the ordinary low-latency path depends on repository-external runner provisioning.

## Decision

[CI](../../../../.github/workflows/ci.yml) routes the three required primary Node 24 jobs to the upstream repository's 16-core larger Linux runner and the diagnostic native Windows job to its 16-core larger Windows runner. The same jobs use standard `ubuntu-24.04` and `windows-2025` runners in forks, which cannot access the upstream-only labels. Fork jobs reduce gate, tool, coverage, and snapshot concurrency to suit standard four-core runners; they run the same checks rather than dropping evidence. An explicit self-hosted failover variable remains the highest-priority selector for the upstream repository. The required Windows job runs Windows Node under Wine on standard `ubuntu-latest` for the blocking surfaces; the independent native Windows job does not participate in the aggregate ([dual Windows decision](2026-08-08-native-windows-pull-request-ci.md)). Standard-hosted jobs retain Node compatibility, the Python SDK unit suite, and the [release-shaped Linux x64 Python runtime validation](../testing/2026-08-12-required-python-runtime-pull-request-ci.md), while the serial references remain the complete unsharded cross-platform definitions.

The three Linux primary jobs, Node compatibility, Python SDK unit suite, Python runtime validation, and `windows node 24 / wine blocking` remain dependencies of `all checks passed`; `windows node 24 / native complete` is deliberately absent. Branch protection continues to require `e2e` and `all checks passed`. Fork runs must never target upstream-only labels, so their required checks can start and produce the same evidence on standard hosted capacity.

The [larger-runner decision](2026-07-22-evidence-based-larger-hosted-runners.md) owns the current primary topology and its measurements. The [serial cross-platform reference](2026-07-21-serial-cross-platform-ci-reference.md) remains the independent standard-hosted completeness check, and the manual larger-runner suites retain size comparisons without expanding the ordinary required matrix.

## Alternatives considered

**Keep every repository on standard capacity.** This removes the upstream larger-runner path, but complete standard-runner jobs give materially slower feedback and still experience shared-capacity queues. The selected routing preserves the measured upstream critical path without making forks wait forever for unavailable private labels.

**Select enterprise size from advertised core count.** Benchmarks show non-monotonic scaling and setup variance, so exact complete-job measurements choose the required pools instead.

**Skip or demote checks while capacity is unavailable.** This would make the status green by dropping evidence rather than by running the repository's required contracts.

**Use one worker policy on every host.** Outer gate concurrency and inner tool workers contend differently on Linux, Windows, and standard runners; measured host-specific bounds avoid turning additional cores into slower execution.

## Consequences

Upstream pull requests spend enterprise capacity on the Linux critical path while forks run the same contracts on standard hosted capacity. The Wine job keeps the required Windows verdict on standard Linux allocation. The independent native job follows the same upstream-or-fork selection without delaying or changing the aggregate. A live exact-head run distinguishes the commands branch protection consumes from the separate diagnostic contract; queue delay is reported separately from each job's `startedAt` to `completedAt` execution interval.

Enterprise allocation may still delay upstream checks, and the self-hosted failover remains available for that incident. Forks no longer depend on an upstream runner definition they cannot use. Standard compatibility, required Wine, and diagnostic native Windows jobs remain useful when enterprise allocation is degraded. Standard `ubuntu-24.04` images ship a `pwsh` binary, so forks run the `pwshOnly` ACP snapshot scenario that hosts without `pwsh` skip; the acp pwsh overlays must enable `tool-pwsh` explicitly (the base patch disables it off Windows), and their pinned tool schema carries current `dsh-tool-jobs` wording. A fork's master-scoped Wine apt cache stays empty until its master next pushes, so the Wine job's timeout must cover the uncached apt install.
