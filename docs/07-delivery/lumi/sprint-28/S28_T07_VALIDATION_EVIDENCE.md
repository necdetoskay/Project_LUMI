# Sprint 28 — T07: Backlog Validation Evidence

**Source plan:** `docs/08-backlog/story-outcome-world-state-validation-test-plan.md`
**Status:** Quest Aggregate delivered
**Branch:** `main`

## Summary

Sprint 28 delivered the **Quest aggregate** — the last outstanding world-state
entity gap referenced since S22/23. A quest is now a first-class aggregate root
with a guarded lifecycle, ordered objectives, household scope, and
**evidence-bound, deterministic progression** that flows exclusively through the
existing `WorldCommitService` pipeline (`quest_state_update` → narrative event →
rule engine → committed world change → idempotent world-side applicator).
This document maps the backlog validation requirements (SOWS) to concrete
implementation and tests.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Quest güncellemeleri yalnızca komit sistemiyle ilerler | `quest_state_update` outcome → `quest_objective_progressed` event → rule → commit only; no direct quest mutation from routes | `quest-outcome.test.ts` (extractor + rule) + `world-commit.integration.test.ts` (guarded) |
| Yalnızca kanıtlanan hedef veya durum ilerler | `EvidenceValidator` verifies quest entity present in snapshot + non-empty `evidenceRef`; `progressObjective` requires `evidenceRef` | `quest-outcome.test.ts` (snapshot scope, evidenceRef) |
| Quest lifecycle deterministik + aggregate-root guarded | `Quest` domain (inactive→active→paused/completed/abandoned; only active progresses; final objective auto-completes) | `quest.test.ts` (19) + `quest-change-applicator.integration.test.ts` (auto-complete) |
| Quest state change committed transactionally with story advance | `WorldCommitService.commitManifest`/`commitOutcomeWithTx` single-tx commit; world-side `applyQuestChange` idempotent per `questId::objectiveIndex` | `world-commit.integration.test.ts` (guarded) + `quest-change-applicator.integration.test.ts` (guarded) |
| SOWS-003 "Köprünün onarılması … ilgili quest güncellenir" | `quest_state_update` commit path covered | `quest-outcome.test.ts` + story E2E chain already under S22-T06 |

## Deliverables (T01–T06)

- **T01** `Quest` domain aggregate (lifecycle, ordered objectives, household
  scope, evidence): `@lumi/world` `domain/quest.ts` + `world-types.ts` + 19 unit
  tests.
- **T02** Quest persistence: `quests` + `quest_objectives` Drizzle schema +
  forward-only migration `0006_quests.sql`.
- **T03** `QuestService` (create/activate/progress/pause/resume/abandon/reads)
  + `QuestRepository` port + `DrizzleQuestRepository` impl — 9 service tests.
- **T04** `quest_state_update` outcome type; `quest_objective_progressed`
  narrative event + mapping; default rule `default-quest-objective-progress` —
  5 `quest-outcome.test.ts` tests (`@lumi/story`).
- **T05** Quest evidence validation (snapshot scope) — `EvidenceValidator` via
  `quest-outcome.test.ts` (missing entity / missing evidenceRef rejected).
- **T06** Transactional quest commit through existing `WorldCommitService` +
  idempotent world-side `applyQuestChange` applicator — guarded
  `world-commit.integration.test.ts` + `quest-change-applicator.integration.test.ts`.

## Coverage Summary

- **Covered:** `@lumi/world` 101 unit tests green (9 files); `@lumi/story`
  112 unit tests green (19 files). Guarded quest integration tests behind
  `WORLD_TEST_ENABLE_DESTRUCTIVE`/`STORY_TEST_ENABLE_DESTRUCTIVE`.
- **Partial:** 0
- **Future-backlog:** quest templates / quest UI / `quest_seed`→quest
  automation (explicitly out of scope per SPRINT_SPEC).

## Exit Criteria

| Criteria | Status |
| --- | --- |
| Quest lifecycle transitions guarded by domain | ✅ `quest.ts` + tests |
| Only active quests progress; inactive/paused rejected | ✅ `quest.test.ts` (T01) |
| Completing final objective auto-completes quest | ✅ `quest.test.ts` + integration |
| `quest_state_update` → `quest_objective_progressed` → committed change | ✅ T04 unit + T06 guarded integration |
| Quest entities missing from snapshot rejected | ✅ `quest-outcome.test.ts` (T05) |
| Idempotent re-apply does not double-apply | ✅ `WorldCommitService` idempotency + `applyQuestChange` skip |
| All source green | `lint | typecheck | test | build` green per package |