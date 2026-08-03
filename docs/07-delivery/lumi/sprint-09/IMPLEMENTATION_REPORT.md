# Sprint 09 — Story Definition and Session — Implementation Report

**Sprint ID:** LUMI-S09  
**Version:** 1.0.0  
**Release Date:** 2026-08-03  
**Branch:** `agent/household-universe-and-character-visual-identity`  
**Status:** Partially complete — domain, application, schema, migration, API routes and build verified; integration tests skipped by user decision.

---

## 1. Task Status

| Task ID | Deliverable | Status | Notes |
| --- | --- | --- | --- |
| S09-T01 | Story definition/version domain | ✅ Complete | Domain models, value objects, invariants and unit tests in `packages/story/src/domain` |
| S09-T02 | Story session lifecycle | ✅ Complete | State machine, lifecycle transitions, idempotency guards in `story-session.service.ts` |
| S09-T03 | Story/session schema | ✅ Complete | Forward-only additive migration `0001_story_schema.sql` with all required tables, constraints, indexes |
| S09-T04 | Session APIs | ✅ Complete | 11 API routes under `apps/web/app/api/stories` |
| S09-T05 | Checkpoint/resume/idempotency | ✅ Complete | Domain + application code implemented; integration verification skipped per user decision |
| S09-T06 | Story contracts/docs | ✅ Complete | This report and fixture placeholders |

---

## 2. Changed Files

### Domain & Application (`packages/story`)

- `src/domain/story-types.ts` — enums, state interfaces, assertion helpers
- `src/domain/story-definition.ts` — aggregate root with lifecycle transitions
- `src/domain/story-version.ts` — immutable publication lifecycle
- `src/domain/story-scene.ts` — scene and transition value objects
- `src/domain/story-session.ts` — session state machine aggregate
- `src/application/story-definition.service.ts` — definition, version, scene graph, publish
- `src/application/story-session.service.ts` — start/pause/resume/advance/complete/abandon/checkpoint
- `src/application/story-auth.service.ts` — household-scoped authorization helpers
- `src/application/story-event-store.service.ts` — event store
- `src/application/hash.ts` — SHA-256 content hashing
- `src/db/client/index.ts` — drizzle client
- `src/db/schema/story/*` — all schema tables
- `src/db/repositories/interfaces/story.repository.ts` — repository contract
- `src/db/repositories/drizzle/drizzle-story.repository.ts` — drizzle implementation
- `migrations/0001_story_schema.sql` — forward-only migration
- `tests/domain/*` — 16 unit tests

### Web API (`apps/web`)

- `app/api/stories/route.ts` — `GET /api/stories`
- `app/api/stories/[storyId]/versions/[versionNumber]/route.ts` — version graph
- `app/api/stories/[storyId]/sessions/route.ts` — `POST` start session
- `app/api/stories/sessions/[sessionId]/route.ts` — `GET` playback state
- `app/api/stories/sessions/[sessionId]/pause/route.ts` — `POST`
- `app/api/stories/sessions/[sessionId]/resume/route.ts` — `POST`
- `app/api/stories/sessions/[sessionId]/advance/route.ts` — `POST`
- `app/api/stories/sessions/[sessionId]/complete/route.ts` — `POST`
- `app/api/stories/sessions/[sessionId]/abandon/route.ts` — `POST`
- `app/api/stories/sessions/[sessionId]/checkpoints/route.ts` — `POST` manual checkpoint
- `app/api/stories/sessions/[sessionId]/checkpoints/latest/route.ts` — `GET` latest checkpoint
- `lib/story-api/error.ts` — shared error handling and Zod schemas
- `package.json` — added `@lumi/story` workspace dependency

### Project lockfile

- `pnpm-lock.yaml` — updated to include `@lumi/story` for web

---

## 3. Domain Invariant / State Machine Evidence

Unit tests cover the P0 invariants:

- `StoryDefinition` rejects archive-to-publish mutation.
- `StoryVersion` rejects publish without freeze.
- `StoryVersion` rejects mutation after publish.
- `StoryVersion` validates exactly one entry scene and at least one terminal scene.
- `StorySceneTransition` validates cross-scene scope.
- `StorySession` state machine transitions:
  - `created -> active <-> paused`
  - `active -> completed`
  - `active -> abandoned`
  - Invalid transitions throw `ValidationError`.
  - Completed session cannot be advanced or paused.

**Source:** `packages/story/tests/domain/*.test.ts` (16 tests passing)

---

## 4. Migration Tables, Constraints, Indexes

Migration `packages/story/migrations/0001_story_schema.sql` is forward-only and additive.

**Tables:**

- `story.story_definitions`
- `story.story_versions`
- `story.story_chapters` (reserved via schema typing; chapter content modeled as scenes in v1)
- `story.story_scenes`
- `story.story_scene_transitions`
- `story.story_sessions`
- `story.story_session_characters`
- `story.story_session_scene_visits`
- `story.story_session_checkpoints`
- `story.story_idempotency_ledger`
- `story.story_event_store`
- `story.story_parent_notes`

**Key constraints / indexes (idempotent DO blocks):**

- FKs to `profile.households`, `profile.child_profiles`, `profile.worlds`, `profile.characters`
- `(story_definition_id, version_number)` unique
- `(story_version_id, scene_key)` unique
- `(story_session_id, sequence_number)` unique on checkpoints
- `(story_session_id, visit_sequence)` unique on visits
- `(household_id, operation_type, idempotency_key)` unique on idempotency ledger
- Partial unique index enforcing one entry scene per version
- Status / playback mode / version checks via `CHECK` constraints

---

## 5. API Endpoint / Body / Response / Status Contracts

All routes use `withParent` + `observeHandler`, Zod strict parsing, and household-scoped access checks.

| Endpoint | Method | Body | Query | Status |
| --- | --- | --- | --- | --- |
| `/api/stories` | GET | — | `householdId` | 200 / 400 / 403 / 500 |
| `/api/stories/{storyId}/versions/{versionNumber}` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |
| `/api/stories/{storyId}/sessions` | POST | `householdId`, `childProfileId`, `worldId`, `storyVersionId`, `characterId`, `playbackMode?`, `idempotencyKey?` | — | 201 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |
| `/api/stories/sessions/{sessionId}/pause` | POST | `expectedVersion`, `idempotencyKey?` | `householdId` | 200 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/resume` | POST | `expectedVersion`, `idempotencyKey?` | `householdId` | 200 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/advance` | POST | `expectedVersion`, `nextSceneId`, `idempotencyKey?` | `householdId` | 200 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/complete` | POST | `expectedVersion`, `idempotencyKey?` | `householdId` | 200 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/abandon` | POST | `expectedVersion`, `reason?`, `idempotencyKey?` | `householdId` | 200 / 400 / 403 / 404 / 409 / 500 |
| `/api/stories/sessions/{sessionId}/checkpoints` | POST | `sceneId` | `householdId` | 201 / 400 / 403 / 404 / 500 |
| `/api/stories/sessions/{sessionId}/checkpoints/latest` | GET | — | `householdId` | 200 / 400 / 403 / 404 / 500 |

**Status mapping:**

- 401 via `withParent` if unauthenticated
- 400 for validation / missing fields
- 403 for cross-family / cross-child / unauthorized access
- 404 for not found or resource hidden from user
- 409 for duplicate active session, stale version, invalid transition, completed-session progression

Responses do not include sensitive child payload, secrets, prompts, or encryption data.

---

## 6. Session Lifecycle + Resume / Identifier Contract

- `startSession` ties a session to a published `StoryVersion`, sets entry scene, version=1, records participant.
- `pauseSession` / `resumeSession` preserve active scene and participant state.
- `advanceSession` moves to `nextSceneId` with optimistic version check.
- `completeSession` / `abandonSession` are terminal.
- `Idempotency-Key` is passed via body; operation is scoped to `(householdId, operation_type, idempotency_key)`.
- Retry with same key and same payload returns same result; service-level pre-check + DB unique index prevent duplicate commits.

---

## 7. Checkpoint SHA-256 + Crash / Retry Evidence

- `buildSessionStateHash` computes SHA-256 over sorted `{ sessionId, sceneId, status, version, snapshot }`.
- Each pause/resume/advance/complete creates an automatic checkpoint.
- Manual checkpoint via `POST /checkpoints`.
- Latest checkpoint via `GET /checkpoints/latest`.
- `sequenceNumber` is monotonically increasing per session; unique index prevents duplicate sequence writes.

Crash/retry behavior is guarded by:

1. Optimistic `version` check on `updateSession`.
2. Idempotency ledger on mutating operations.
3. Unique sequence index on checkpoints and visits.

---

## 8. Family Space / Child Profile Isolation

All API routes:

1. Resolve parent via `withParent`.
2. Resolve household via `getOwnedHousehold(parent.id)` and require the caller-supplied `householdId` to match.
3. For session routes, additionally call `getStorySessionOrForbidden(sessionId, householdId)` to ensure session belongs to the household.
4. Start session verifies child profile, world, character, and story definition all belong to the household.

Cross-family / cross-child access returns 403 or 404 (resource hiding).

---

## 9. Executed Commands and Results

```powershell
pnpm --filter @lumi/story lint          # PASS
pnpm --filter @lumi/story typecheck     # PASS
pnpm --filter @lumi/story test          # 4 files, 16 tests passed
pnpm --filter @lumi/story test:int      # SKIPPED (user decision)

pnpm --filter @lumi/profiles typecheck  # PASS
pnpm --filter @lumi/profiles test       # 11 files, 228 tests passed

pnpm --filter @lumi/web lint            # PASS
pnpm --filter @lumi/web typecheck       # PASS
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
| Static and interactive session start | `story-session.service.ts` | `story-session.test.ts` | ✅ 16 domain tests pass |
| Pause/resume returns same active scene | `story-session.service.ts` | `story-session.test.ts` | ✅ |
| Invalid transition rejected | `story-session.service.ts` | `story-session.test.ts` | ✅ |
| Stale version rejected | `updateSession` with expectedVersion | API + service code | ✅ code review |
| Completed session cannot advance | `story-session.test.ts` | domain test | ✅ |
| Cross-child session access blocked | API routes + `story-auth.service.ts` | API code review | ✅ |
| Checkpoint + crash/retry no duplicate | checkpoint sequence unique + idempotency ledger | code review | ✅ |

---

## 11. Known Risks and Out-of-Scope Items

### Risks

- **Integration tests not executed:** `story test:int` was not run because cross-package migration setup (profile + world schemas) is required and user decided to skip tests. The migration itself is forward-only and additive.
- **No runtime API verification:** Routes were validated via `next build` and typecheck, but not exercised against a live database.
- **No E2E coverage:** Playwright E2E tests for story flows were not added.

### Out of Scope (per Sprint 09 spec)

- LLM story generation
- Choice consequence evaluation
- World-state outcome commit
- Media generation
- Full story reader UI
- Reflection question / parent-note actual persistence beyond placeholder table

---

## 12. Rollback / Rollforward Plan

**Rollback:**

- This sprint is additive only; no existing tables or columns were modified.
- To rollback: drop `story` schema and remove `packages/story` / API routes.
- No existing Sprint 08 data is affected.

**Rollforward:**

- Next sprint should add destructive integration tests (`STORY_TEST_ENABLE_DESTRUCTIVE=true`) and exercise the full session lifecycle against PostgreSQL.
- Add E2E coverage for story catalog, session start, pause/resume, and checkpoint recovery.
- Implement reflection question / parent-note persistence if needed.

---

## 13. Codex Review Summary

What changed:

- New `@lumi/story` workspace package with domain, application, drizzle repository, and additive migration.
- 11 new API routes under `/api/stories` with household-scoped authorization.
- Story session state machine, idempotency ledger, checkpoint hashing, and event store.

What to verify:

- Cross-schema FKs in `0001_story_schema.sql` assume `profile.households`, `profile.child_profiles`, `profile.worlds`, `profile.characters` exist. Migration order must be maintained.
- API routes rely on `getOwnedHousehold`; multi-member households may need additional membership checks.
- Integration tests and E2E are the highest remaining risk.

---

*Report generated by coding agent on 2026-08-03.*
