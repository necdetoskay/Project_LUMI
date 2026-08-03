# Sprint 10 — Choice and Session Consequence — Implementation Report

**Sprint ID:** LUMI-S10  
**Version:** 1.0.0  
**Release Date:** 2026-08-03  
**Branch:** `agent/sprint-10-choice-consequence`  
**Status:** Partially complete — domain, application, schema, migration, API routes, unit tests and build verified; integration tests skipped by user decision.

---

## 1. Task Status

| Task ID | Deliverable | Status | Notes |
| --- | --- | --- | --- |
| S10-T01 | Choice/consequence domain | ✅ Complete | Domain models in `packages/story/src/domain/choice` |
| S10-T02 | Availability/rule evaluator | ✅ Complete | Table-driven evaluator in `application/choice/rule-evaluator.ts` |
| S10-T03 | Persistence and idempotency | ✅ Complete | Forward-only migration `0002_story_choice_schema.sql` + repository methods |
| S10-T04 | Choice commit APIs | ✅ Complete | 5 API routes under `/api/stories/sessions/{sessionId}/choices` |
| S10-T05 | Outcome candidate contract | ✅ Complete | `OutcomeCandidate` domain + persistence |
| S10-T06 | Traceability and examples | ✅ Complete | Fixtures, unit tests, this report |

---

## 2. Changed Files

### Domain & Application (`packages/story`)

- `src/domain/choice/choice-types.ts` — enums, rule types, context
- `src/domain/choice/choice-point.ts` — choice point aggregate
- `src/domain/choice/choice-option.ts` — option with availability rule + previews
- `src/domain/choice/committed-choice.ts` — immutable committed choice + single-commit guard
- `src/domain/choice/choice-consequence.ts` — consequence record
- `src/domain/choice/outcome-candidate.ts` — schema-valid outcome candidate
- `src/domain/choice/index.ts` — exports
- `src/domain/story-types.ts` — added `STORY_CHOICE_COMMITTED` event type
- `src/application/choice/rule-evaluator.ts` — table-driven rule evaluator
- `src/application/choice/choice.service.ts` — choice orchestration service
- `src/application/index.ts` — export choice API + `hashObject`
- `src/db/schema/story/story-choice-points.ts`
- `src/db/schema/story/story-choice-options.ts`
- `src/db/schema/story/story-committed-choices.ts`
- `src/db/schema/story/story-choice-consequences.ts`
- `src/db/schema/story/story-outcome-candidates.ts`
- `src/db/schema/story/index.ts` — export new tables
- `src/db/repositories/interfaces/story.repository.ts` — choice repository contract
- `src/db/repositories/drizzle/drizzle-story.repository.ts` — choice methods
- `migrations/0002_story_choice_schema.sql` — additive migration
- `tests/domain/choice/*` — choice domain unit tests
- `tests/application/choice/rule-evaluator.test.ts` — table-driven evaluator tests
- `tests/fixtures/choice.fixtures.ts` — static, interactive, committed choice fixtures

### Web API (`apps/web`)

- `app/api/stories/sessions/[sessionId]/choices/route.ts` — `GET` list choice points
- `app/api/stories/sessions/[sessionId]/choices/[choicePointId]/route.ts` — `GET` availability
- `app/api/stories/sessions/[sessionId]/choices/[choicePointId]/commit/route.ts` — `POST` commit
- `app/api/stories/sessions/[sessionId]/choices/history/route.ts` — `GET` immutable history
- `app/api/stories/sessions/[sessionId]/outcomes/latest/route.ts` — `GET` latest outcome candidate

### Project docs

- `docs/00-project/context/CURRENT_STATUS.md` — Sprint 10 active

---

## 3. Domain Invariant / Rule Evaluator Evidence

Unit tests cover:

- `ChoicePoint` creation and validation.
- `ChoiceOption` validation and consequence preview preservation.
- `CommittedChoice` single-commit guard (retry same option allowed, different option rejected).
- `OutcomeCandidate` schema version validation and status validation.
- Rule evaluator table-driven cases:
  - `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
  - `in`, `not_in`
  - `has_flag` on participant flags
  - `all` and `any` match policies
  - `history.count` and flag existence checks

**Source:** `packages/story/tests/domain/choice/*.test.ts` + `tests/application/choice/rule-evaluator.test.ts` (24 tests passing)

---

## 4. Migration Tables, Constraints, Indexes

Migration `packages/story/migrations/0002_story_choice_schema.sql` is forward-only and additive.

**New tables:**

- `story.story_choice_points`
- `story.story_choice_options`
- `story.story_committed_choices`
- `story.story_choice_consequences`
- `story.story_outcome_candidates`

**Key constraints / indexes:**

- FKs to `story.story_versions`, `story.story_scenes`, `story.story_sessions`, `story.story_committed_choices`, `story.story_choice_consequences`
- `(scene_id, choice_point_key)` unique
- `(choice_point_id, option_key)` unique
- `(story_session_id, choice_point_id)` unique on committed choices
- Status / schema version checks

---

## 5. API Endpoint / Body / Response / Status Contracts

All routes use `withParent` + `observeHandler`, Zod strict parsing, and household-scoped access checks via `getStorySessionOrForbidden`.

| Endpoint | Method | Body | Query | Status |
| --- | --- | --- | --- | --- |
| `/api/stories/sessions/{sessionId}/choices` | GET | — | `householdId`, `sceneId` | 200 / 400 / 403 / 404 / 500 |
| `/api/stories/sessions/{sessionId}/choices/{choicePointId}` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |
| `/api/stories/sessions/{sessionId}/choices/{choicePointId}/commit` | POST | `optionId`, `evidenceSceneId`, `idempotencyKey?` | `householdId` | 201 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/choices/history` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |
| `/api/stories/sessions/{sessionId}/outcomes/latest` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |

**Status mapping:**

- 401 via `withParent` if unauthenticated
- 400 for validation / missing fields
- 403 for cross-family / cross-child / unauthorized access
- 404 for not found or resource hidden
- 409 for already committed choice, unavailable option, concurrent conflict, rule version mismatch

Responses do not include sensitive child payload, secrets, prompts, or encryption data.

---

## 6. Choice Commit Idempotency + Concurrency

- `commitChoice` first checks existing committed choice by `(sessionId, choicePointId)`.
- Retry with same option returns the existing record.
- Different option throws `CHOICE_ALREADY_COMMITTED` (409).
- Session must be `active` or `paused`.
- Option availability is evaluated server-side with canonical session context.
- `STORY_CHOICE_COMMITTED` event is recorded in the event store.
- DB unique index `uq_story_committed_choice_session_point` provides hard guarantee.

---

## 7. Outcome Candidate Schema Contract

- `OutcomeCandidate.create` validates `candidateSchemaVersion > 0`.
- Status must be one of `pending`, `committed`, `rejected`, `superseded`.
- Candidates are append-only; no update/delete API.
- World state is not mutated; candidate is a placeholder for future Story Outcome Commit Engine.

---

## 8. Family Space / Child Profile Isolation

All choice API routes:

1. Resolve parent via `withParent`.
2. Resolve household via `getOwnedHousehold(parent.id)` and require `householdId` match.
3. Call `getStorySessionOrForbidden(sessionId, householdId)` to ensure session belongs to the household.
4. `commitChoice` uses the session's own `householdId`/`childProfileId` for event recording.

Cross-family / cross-child access returns 403 or 404.

---

## 9. Executed Commands and Results

```powershell
pnpm --filter @lumi/story lint          # PASS
pnpm --filter @lumi/story typecheck     # PASS
pnpm --filter @lumi/story test          # 9 files, 40 tests passed
pnpm --filter @lumi/story test:int      # SKIPPED (user decision)

pnpm --filter @lumi/web typecheck       # PASS
pnpm --filter @lumi/web lint            # PASS
pnpm --filter @lumi/web test            # 12 files, 85 tests passed
pnpm --filter @lumi/web test:e2e        # SKIPPED (user decision)

node scripts/check-mojibake.mjs         # PASS

git diff --check                        # PASS (only CRLF/LF warnings)

pnpm build                              # PASS
```

---

## 10. Acceptance Criteria Traceability

| Acceptance Criteria | Source | Test | Result |
| --- | --- | --- | --- |
| Valid option commits once | `choice.service.ts` + `committed-choice.ts` | `committed-choice.test.ts` | ✅ |
| Locked/invalid option rejected | `rule-evaluator.ts` | `rule-evaluator.test.ts` | ✅ |
| Concurrent choice conflict | DB unique index + service pre-check | code review | ✅ |
| Retry does not duplicate | `assertSingleCommit` + DB unique index | `committed-choice.test.ts` | ✅ |
| Choice history append-only and explainable | `story_committed_choices` schema + `evidenceSceneId` | code review | ✅ |
| Outcome candidate schema-valid | `outcome-candidate.ts` | `outcome-candidate.test.ts` | ✅ |

---

## 11. Known Risks and Out-of-Scope Items

### Risks

- **Integration tests not executed:** `story test:int` was not run because cross-package migration setup (profile + world schemas) is required. Migration is forward-only and additive.
- **No runtime API verification:** Routes were validated via `next build` and typecheck, but not exercised against a live database.
- **No E2E coverage:** Playwright E2E tests for choice flows were not added.
- **Rule evaluator context is simplified:** `participantFlags` and `sessionScores` are empty in current context; full integration with character/session state is future work.

### Out of Scope (per Sprint 10 spec)

- Canonical world-state mutation
- Story Outcome & World State Commit System
- Autonomous NPC decision engine
- Generated story text
- Reward economy

---

## 12. Rollback / Rollforward Plan

**Rollback:**

- Sprint 10 is additive only.
- To rollback: drop the five new `story.*` choice tables and remove choice application/API code.
- Sprint 09 data is unaffected.

**Rollforward:**

- Add destructive integration tests (`STORY_TEST_ENABLE_DESTRUCTIVE=true`) exercising commit concurrency and idempotency.
- Add E2E coverage for choice flow.
- Integrate `participantFlags` and `sessionScores` with character/session state.
- Implement Story Outcome Commit Engine to consume `outcome_candidates`.

---

## 13. Codex Review Summary

What changed:

- New `packages/story/src/domain/choice` and `application/choice` modules.
- 5 new schema tables + additive migration `0002_story_choice_schema.sql`.
- 5 new API routes for choice availability, commit, history, and outcome candidate.
- Table-driven rule evaluator with `eq/neq/gt/gte/lt/lte/in/not_in/has_flag` operators.

What to verify:

- Migration order: `0001_story_schema.sql` must run before `0002_story_choice_schema.sql`.
- Rule evaluator context values (`participantFlags`, `sessionScores`) are currently stubbed in API flows.
- Integration tests and E2E remain the highest risk.

---

*Report generated by coding agent on 2026-08-03.*
