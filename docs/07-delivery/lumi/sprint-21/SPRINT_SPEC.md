# Sprint 21 — Stability, Performance and Scale

**Sprint ID:** LUMI-S21
**Version:** 0.2.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 20 Release Candidate approval gate
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Ship the first production RC of Project LUMI and close the Sprint 20 load-test
gap by establishing a measurable performance, stability and observability
baseline for the story session engine — the highest-traffic user path
(`POST /api/sessions/[id]/advance`).

## In Scope

- Load harness for the story session `advance` path (synthetic, household-scoped).
- Latency, error-rate, isolation and 99th-percentile SLIs mapped to runbook
  thresholds (`docs/ops/runbooks/release-monitoring.md`).
- Performance regression gate wired into CI (`ci.yml`) — p95 latency budget.
- Memory/CPU baseline for the Next.js web container under N concurrent
  household sessions (no cross-tenant data leak under load).
- Seed-data snapshot for reproducible load tests (no real child data).
- Observability baseline: `pnpm build` + `node scripts/check-mojibake.mjs`
  already green; add a p95-latency smoke gate to `ci.yml`.

## Out of Scope

- NPC Emergent Interaction Engine (backlog).
- Story Outcome & World State Commit System (backlog).
- Production rollout automation (manual deploy per S20-T05/T06).
- New feature work beyond stability/performance.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S21-T01 | Load harness scaffold | `packages/simulation` or `packages/world/tests/load` | harness compiles + 1 smoke run |
| S21-T02 | Latency/error/isolation SLIs + CI gate | `.github/workflows/ci.yml` | p95 < 500ms in smoke, 0 isolation fails |
| S21-T03 | Memory/CPU baseline doc | `docs/07-delivery/lumi/sprint-21/` | baseline recorded |
| S21-T04 | Seed-data snapshot for load | `packages/*/tests/fixtures` (no real PII) | snapshot reproducible |
| S21-T05 | Performance regression gate | CI | gate added, documented |

## Requirements

- All tests must use metadata-only / synthetic child data (no real PII).
- Load harness must assert household isolation under concurrency (0 cross-tenant reads).
- Performance gate p95 threshold inherited from S20-T04 recommendation (< 500 ms
  for session `advance`, < 1000 ms for other routes).
- Build reproducibility already established (S20-T02): CI build job produces
  version+sha tagged, labeled image — load runs against that artifact.
- `NEXT_PUBLIC_APP_URL` must NOT be inlined from host secrets (S20-T06 constraint).

## Acceptance Criteria

- [ ] S21-T01 harness runs 50 concurrent sessions for 60 s without errors.
- [ ] S21-T02 p95 latency < 500 ms; 0 household-isolation violations.
- [ ] S21-T03 memory/CPU baseline documented; regression gate in CI is non-blocking.
- [ ] S21-T04 seed snapshot reproducible from `pnpm test:load:seed`.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Load harness may need a real Postgres + Redis instance; scope-test against
  the existing compose stack (`scripts/infra-up.mjs`).
- jsdom/concurrent test environment already showed flakiness in S20-T04 —
  load tests should use a separate Vitest workspace / threadpool to avoid
  DOM reuse collisions.
- No production infra available for true end-to-end load; baseline measured
  against container-local compose stack with documented environment parity caveat.

## Validation

- `pnpm test:load` (smoke) — defined by S21-T01.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- CI `format:check` green (Linux runner).
