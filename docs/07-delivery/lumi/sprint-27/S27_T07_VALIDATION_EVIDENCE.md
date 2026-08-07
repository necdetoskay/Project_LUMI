# Sprint 27 — T07: Backlog Validation Evidence

**Source plan:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
**Status:** Accepted opportunity → story hook conversion delivered
**Branch:** `main`

## Summary

Sprint 27 closed the last outstanding candidate-flow step from the NPC
Emergent Interaction backlog: **"Yalnızca çocuk kabul ederse story hook'a
dönüştür"** (convert to a story hook only when the child accepts). An
accepted interaction opportunity now produces exactly one persisted
`StoryHook` with full provenance, a `STORY_HOOK_CREATED` event, a
`story_hook_delivery` outbox intent, and deterministic hook-to-scene
selection during story advance. This document maps the backlog
activation/validation requirements to concrete implementation + tests.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Accepted opportunity → story hook (exactly once) | `StoryHookService.createHook` + idempotency via `findHookByOpportunityId`; re-accept is a no-op | `tests/application/story-hook.service.test.ts` — idempotent re-accept, existing hook unchanged |
| Hook carries full opportunity context | `StoryHook` domain holds opportunityId, hookType, source/target NPC, payload, constraints, household | `StoryHook.create` + `tests/application/story-hook.service.test.ts` |
| Accepted-only conversion | `createHook` throws `HOOK_OPPORTUNITY_NOT_ACCEPTED` for non-accepted status | `story-hook.service.test.ts` |
| Household-scoped hooks | `createHook` throws `HOOK_HOUSEMISMATCH` for cross-household opportunity | `story-hook.service.test.ts` |
| Hooks do not mutate canonical world state | Story hooks are narrative triggers only; applicator is a delivery marker (zero world writes) | `story-hook-delivery-applicator.service.test.ts` |
| Hook-to-scene mapping deterministic & type-independent | `mapHookToScene` — 7 hook types → narrative/choice/transition | `hook-scene-mapping.service.test.ts` — 9 tests |
| Delivery through outbox/propagator (S23 infra) | `story_hook_delivery` outbox intent enqueued on creation; applied via `StoryHookDeliveryApplicator` | `story-hook.service.test.ts` (enqueue) + `story-hook-delivery.integration.test.ts` (guarded) |
| Pending hook influences next scene selection | `selectNextSceneForHook` + `resolveAdvanceSceneId` in `advanceSession` | `hook-scene-mapping.service.test.ts` + `story-session-outcome.e2e.test.ts` |

## Deliverables (T01–T06)

- **T01** `StoryHook` domain model (`create/fromState/consume/markDelivered/expire`) +
  `StoryHookService.createHook` (accepted-only, household-scope, idempotent, emits
  `STORY_HOOK_CREATED`); `story_hooks` Drizzle schema; repo `createHook`/
  `findHookByOpportunityId`.
- **T02** `mapHookToScene` (deterministic, type-independent) + persistence schema
  — 9 tests.
- **T03** Idempotency guard — `tests/application/story-hook.service.test.ts`
  (accepted-only, household-scope, first-accept create+event, no-op re-accept,
  existing hook unchanged) — 5 tests.
- **T04** `STORY_HOOK_CREATED` event + outbox integration: `story_hook_delivery`
  outbox intent type, `0005_story_hooks.sql` migration, `StoryHookService`
  enqueues `story-hook:<opportunityId>` delivery intent — event + outbox
  assertions — 6 tests.
- **T05** `StoryHookDeliveryApplicator` (validates intent type, zero-write skip on
  missing payload) + guarded `story-hook-delivery.integration.test.ts` — 3 tests.
- **T06** `selectNextSceneForHook` + `resolveAdvanceSceneId` in `advanceSession`
  (optional `pendingHook`) — 5 unit + 2 E2E tests.

## Coverage Summary

- **Covered:** 104/104 `@lumi/story` unit tests green (incl. 104 total, up from
  79 at S24 closeout).
- **Partial:** 0
- **Future-backlog:** 0

## Exit Criteria

| Criteria | Status |
| --- | --- |
| `pnpm --filter @lumi/story lint` | Green |
| `pnpm --filter @lumi/story typecheck` | Green |
| `pnpm --filter @lumi/story test` | 104/104 green |
| `pnpm build` | Green |
| `node scripts/check-mojibake.mjs` | Pass |

## Outcome

- The final candidate-flow step (S24 backlog "Accepted opportunity → story hook")
  is now implemented end-to-end in `@lumi/story`.
- Determinism, idempotency, household scoping, and safety-first design inherited
  from the S13 contract are preserved throughout.
- No P0/P1 defects.

## Remaining Backlog (follow-up sprints)

- Quest aggregate (from S22/23).
- Accepted hook → story generation pipeline integration (LLM prompt rendering
  consumes hooks; out of Sprint 27 scope).
