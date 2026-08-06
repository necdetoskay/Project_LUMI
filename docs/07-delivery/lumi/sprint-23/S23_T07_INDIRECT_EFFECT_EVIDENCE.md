# Sprint 23 — T07: Indirect Effect / Outbox Backlog Evidence

**Source plan:** `docs/08-backlog/story-outcome-world-state-validation-test-plan.md`
**Scenarios covered:** SOWS-005, SOWS-014, SOWS-015
**Branch:** `codex/sprint-23-outbox`

## Summary

Sprint 23 implemented the indirect-effect propagation + outbox system,
closing the S22-documented gap. This document maps the backlog validation
scenarios to concrete implementation + tests.

| Scenario | Requirement | Implementation | Status |
| --- | --- | --- | --- |
| SOWS-005 | Direct effects committed; indirect effects in a separate, traceable queue | `WorldCommitRuleEngine.apply()` → `{ direct, indirect }`; direct changes committed, indirect intents enqueued to `story_outbox` | ✅ Covered |
| SOWS-014 | Canonical commit atomic with outbox; no event lost or double-published | `commitOutcomeWithTx` writes commit + world version + events + outbox enqueue in one `db.transaction` | ✅ Covered |
| SOWS-015 | Same indirect effect applied exactly once | `IndirectEffectPropagator`: per-row idempotency (applied rows short-circuit), `applied` status, attempt cap | ✅ Covered |

## Implementation Artifacts

- **Schema/migration:** `packages/story/migrations/0004_story_outbox.sql` +
  `story_outbox` table (S23-T01).
- **Repository:** enqueue / find-by-key / claim-pending / mark (S23-T02).
- **Rule split:** `IndirectIntent` domain + `applyIndirect` rules
  (S23-T03). Default `npc_state_changed → npc_rumor_spread`.
- **Atomic enqueue:** `commitOutcomeWithTx` enqueues outbox in the commit
  transaction (S23-T04).
- **Propagation:** `IndirectEffectPropagator` + `IndirectEffectApplicator`
  port; `INDIRECT_EFFECT_APPLIED` / `INDIRECT_EFFECT_FAILED` events
  (S23-T05).
- **Isolation tests:** `outbox-propagation.integration.test.ts` (S23-T06).

## Test Coverage

### Unit (79 passing)

- Rule engine: direct/indirect split, `npc_state_changed` → rumor intent,
  no indirect for non-indirect rules.
- World commit service: outbox enqueue atomic with commit, idempotent
  re-apply, deterministic hash.
- Propagator: applies + marks applied, never re-applies applied rows,
  isolates failures, attempt-cap stops retry.

### Guarded integration (9 skipping by default)

- World commit (5): single-tx commit, idempotent re-apply, household
  isolation, event sourcing, compensation.
- Outbox propagation (4): atomic enqueue (SOWS-014), once-only (SOWS-015),
  per-row fail isolation, attempt cap.

Run with `STORY_TEST_ENABLE_DESTRUCTIVE=true` + `STORY_TEST_DATABASE_URL`
pointing at a disposable `*test*`/`*review*` database.

## Verification Commands

```bash
pnpm --filter @lumi/story typecheck   # clean
pnpm --filter @lumi/story lint        # clean (--max-warnings=0)
pnpm --filter @lumi/story test        # 79/79
pnpm --filter @lumi/story test:int    # 9 guarded (skipped by default)
pnpm build
node scripts/check-mojibake.mjs
```

## Outcome

- **SOWS-005 / SOWS-014 / SOWS-015: covered.**
- No P0/P1 defects.
- The indirect-effect propagation + outbox gap from S22-T07 is closed.

## Remaining Backlog (out of scope for S23)

- Dedicated quest aggregate.
- Story-vs-manifest semantic review (SOWS-010 manual).
- Real async worker/broker (current: in-repo polling processor via
  `IndirectEffectPropagator`).
