# Sprint 23 — Indirect Effect Propagation + Outbox

**Sprint ID:** LUMI-S23
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 22 World Commit System (S10 limitation closed)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** S22-T07 exit-criteria follow-up (SOWS-005, SOWS-014, SOWS-015)

## Goal

Close the S22-documented gap: **indirect effects** produced by a story outcome
commit are written to a separate, traceable outbox (not applied silently), then
propagated idempotently. This satisfies the backlog validation plan's
SOWS-005 (direct vs indirect effects), SOWS-014 (outbox publish failure →
atomic), and SOWS-015 (indirect effect re-processing → once).

## Principle

- **Direct effects** (NPC state, inventory, relationship, world flags) are
  already committed atomically by `WorldCommitService` (S22-T04).
- **Indirect effects** (e.g. "child helped the fox → other NPCs in the region
  learn the rumor", "repairing the bridge raises merchant trust") are separate,
  derived changes. They are enqueued to an **outbox** in the same transaction
  as the commit, then applied by a propagation processor exactly once.
- Canonical state is never changed by outbox enqueue; the outbox only records
  *intent*. The propagation processor applies the indirect effect.

## Existing Foundation (S22)

- `@lumi/story` `WorldCommitService.commitOutcomeWithTx` — single-tx commit
  with append-only `story_commit_records` + `story_event_store` events.
- `story_event_store` already records `STORY_WORLD_COMMIT_APPLIED` events.
- `@lumi/simulation` has `scheduled_events` + idempotency ledger discipline
  (S14) — reuse idempotency semantics, not a parallel mechanism.

## In Scope

- **Outbox schema**: `story_outbox` — append-only indirect-effect intents with
  status (`pending` / `processing` / `applied` / `failed`) + idempotency key +
  correlation to commit id.
- **Outbox repository**: enqueue (with the commit tx), claim, mark applied,
  mark failed.
- **Propagation service**: reads pending outbox rows, applies each indirect
  effect once (guarded by an idempotency ledger), records an
  `INDIRECT_EFFECT_APPLIED` event, and updates outbox status.
- **Direct/indirect rule split**: `WorldCommitRuleEngine` returns direct
  changes (applied now) + indirect intents (enqueued), so the boundary is
  explicit and testable.
- **Atomicity**: outbox enqueue happens in the same `db.transaction` as the
  commit (SOWS-014 — no event lost or double-published).
- **Failure handling**: a failed indirect effect is retried independently
  (per-row), never blocking the original commit.

## Out of Scope

- Real async queue/worker broker (Kafka/BullMQ) — outbox + polling processor
  in-repo for now.
- NPC Emergent Interaction Engine (separate backlog sprint).
- Changes to direct-effect commit semantics (S22 behavior preserved).
- UI for indirect-effect status.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S23-T01 | Outbox schema + migration `0004` | `@lumi/story` DB | schema valid, additive |
| S23-T02 | Outbox repository (enqueue/claim/apply/fail) | `@lumi/story` DB | unit + guarded integration |
| S23-T03 | Rule engine indirect-intent split | `@lumi/story` domain | unit: direct vs indirect boundary |
| S23-T04 | Commit writes outbox atomically | `@lumi/story` app | integration: commit + outbox in one tx |
| S23-T05 | Propagation service (idempotent, once) | `@lumi/story` app | unit + integration: SOWS-015 |
| S23-T06 | Failure + retry isolation | `@lumi/story` app | integration: failed row retried, original intact |
| S23-T07 | Backlog SOWS-005/014/015 evidence | `docs/07-delivery/lumi/sprint-23/` | scenario matrix green |

## Requirements

- Outbox enqueue is atomic with the commit (single tx) — no lost/duplicate
  indirect intents.
- Each outbox row has an idempotency key; propagation never double-applies.
- Household + world isolation enforced at every outbox/propagation boundary.
- Failed propagation is isolated per row (original commit unaffected).
- No real child data in fixtures/tests.
- All migrations additive + forward-only (repo policy).

## Acceptance Criteria

- [ ] S23-T01..T04: a story outcome commit writes direct changes + indirect
      outbox intents in one transaction.
- [ ] S23-T05: propagation applies each indirect effect exactly once
      (idempotent on retry).
- [ ] S23-T06: a failing indirect effect is retried without affecting other
      rows or the committed world state.
- [ ] S23-T07: SOWS-005 / SOWS-014 / SOWS-015 scenarios pass.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Propagation processor polling introduces timing; tests must use explicit
  `processOutbox()` calls, not timers.
- Indirect-effect rules must be bounded — derive from concrete events only,
  never free-form LLM output.
- Outbox growth — need a cleanup/mark-failed policy (documented; not a P0).

## Validation

- `pnpm --filter @lumi/story test` (unit + outbox/propagation).
- Integration behind `STORY_TEST_ENABLE_DESTRUCTIVE=true` guard.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
