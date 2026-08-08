# L9 Production Readiness Closure

Status: **CLOSED / PASS**  
Decision date: **2026-08-09**  
Validated head: `78a9a90f9f9f74b4aefa7f5db8a0f2e741e5d7e6`  
Validation branch: `codex/ultef-lumi-sprint-00`

## Closure decision

L9 Production Readiness is closed as PASS for the current Project LUMI implementation scope.

The closure decision is based on a clean three-workflow validation round on the same head:

- CI #593 — PASS
- ULTEF Integration #360 — PASS
- Security Scan #537 — PASS

The ULTEF run also produced the `ultef-db-integration-evidence` artifact for the validated head.

## Gate inventory

| Gate | Status | Production risk covered | Primary evidence |
| --- | --- | --- | --- |
| `L9-LONG-HORIZON-001` | PASS | Long-lived continuity drift across repeated story sessions | ULTEF #360 |
| `L9-COMMIT-RECOVERY-001` | PASS | Partial/failed world commit, retry safety, persisted idempotency | ULTEF #360 |
| `L9-PROVIDER-FAILOVER-001` | PASS | Provider timeout/429/5xx/malformed-output routing contract and unsafe fallback rejection | CI #593 |
| `L9-CONCURRENCY-001` | PASS | Cross-household/child/world state, session, commit and idempotency leakage under concurrency | ULTEF #360 |
| `L9-CRASH-RECOVERY-001` | PASS | Process restart after persisted commit, pending outbox survival and post-restart replay idempotency | ULTEF #360 |
| `L9-LOAD-001` | PASS | DB-backed concurrent mutation baseline, duplicate commit prevention and latency guard | ULTEF #360 |
| `L9-OBSERVABILITY-001` | PASS | Correlation, HTTP metrics, readiness metrics and alert-contract observability | ULTEF #360 |
| `L9-BACKUP-RESTORE-001` | PASS | PostgreSQL dump/restore integrity and restore-time idempotent replay | ULTEF #360 |
| `L9-DEPLOY-ROLLBACK-001` | PASS | Bad candidate rejection and previous container image recovery through health contract | ULTEF #360 |
| `L9-DEPENDENCY-OUTAGE-001` | PASS | PostgreSQL/Redis outage degradation, safe write failure and restart-free recovery | ULTEF #360 |
| `L9-MIGRATION-RECOVERY-001` | PASS | Crash between schema mutation and migration ledger update; atomic retry/replay safety | ULTEF #360 |

## Important production hardening completed during L9

L9 did not only add tests. The validation work exposed and corrected production-relevant defects or gaps, including:

- optimistic session-version assumptions in long-horizon test orchestration;
- invalid correlation IDs not emitting the configured anomaly metric;
- migration SQL and migration-ledger registration not sharing one PostgreSQL transaction;
- readiness test setup missing the auth schema required by the production readiness contract.

The story migration runner now applies an individual migration and its ledger record atomically.

## Closure invariants

L9 is considered closed because the validated head demonstrates all of the following in blocking automation:

1. Repeated story sessions preserve continuity and deterministic state invariants.
2. World mutations are atomic and idempotent across retry, crash/restart and restore boundaries.
3. Concurrent tenants remain isolated at session, world, commit and idempotency layers.
4. Required dependencies fail closed and recover without requiring an application restart.
5. Production container health and rollback behavior is executable, not documentation-only.
6. Database backup/restore and migration recovery are exercised against real PostgreSQL.
7. Required observability signals are emitted and bounded correctly.
8. CI formatting, lint, typecheck, tests, build, container artifact build and security scanning all pass on the same closure head.

## Residual risks — non-blocking for L9 closure

The following are intentionally not interpreted as failures of the L9 gate. They remain production operations or future scale-validation work:

- multi-hour or multi-day soak testing under production-like traffic volumes;
- multi-region/database-replica failover and network-partition behavior;
- measured production RPO/RTO drills on deployed infrastructure rather than disposable CI databases;
- real hosted-provider outage drills that intentionally consume paid external provider calls;
- production secret/key rotation drills and infrastructure-specific rollback procedures;
- capacity planning beyond the current L9 DB-backed baseline.

These items should be tracked as release/operations hardening when an actual hosting topology and production SLOs are fixed. They should not reopen L9 unless a future architecture decision makes one of them a mandatory pre-production acceptance criterion.

## Evidence retention

The closure reference run is ULTEF Integration #360. Its uploaded `ultef-db-integration-evidence` artifact is retained by the workflow retention policy. CI #593 and Security #537 are the corresponding clean validation runs for the same head.

## Decision

**L9 Production Readiness: CLOSED / PASS.**

Any further readiness work should start as a new explicitly scoped level, release gate or operational hardening track rather than extending L9 indefinitely.
