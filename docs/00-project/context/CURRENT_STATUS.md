# Project LUMI - Current Status

**Lifecycle:** Execution

**Active branch:** `agent/sprint-10-choice-consequence`

**Active delivery:** Sprint 10 — Choice and Session Consequence

**Last updated:** 2026-08-03

## Completed

- EOS-ASDS v1.0 imported and frozen as engineering authority.
- LUMI product and living-universe design documentation created.
- PostgreSQL-first persistence architecture and Drizzle direction approved.
- Repository documentation reorganized into the official taxonomy.
- Historical prototype apps and packages removed from active workspace scope without deleting their contents.
- pnpm workspace and Turborepo foundation created.
- Next.js web application foundation created under `apps/web`.
- PostgreSQL and Redis local Compose foundation created.
- Health and readiness endpoints implemented.
- Format, lint, strict TypeScript, unit test and production build verified.
- Sprint 01 foundation scope completed and stabilized.

### Sprint 02 - Complete

Sprint 02 parent authentication implementation is complete and backed by final
verification evidence gathered on 2026-07-27.

- Parent register/login/logout/me flow works with PostgreSQL.
- Invalid credentials return consistent `INVALID_CREDENTIALS` envelope.
- Refresh rotation and reuse detection are covered by unit and PostgreSQL integration tests.
- Cookie security flags follow environment policy (`AUTH_COOKIE_SECURE`).
- Revoked sessions cannot access protected endpoints.
- Rate limit and audit logs use redaction.
- Unauthorized users are rejected from protected route and API.
- Forgot-password and reset-password flow is verified in API/browser coverage.

Evidence summary:
- **Playwright auth E2E:** 6/6 passed on 2026-07-27
- **PostgreSQL auth integration:** 4/4 passed on 2026-07-27
- **Targeted safe reruns:** `@lumi/profiles` typecheck/test, `@lumi/web` typecheck, auth/readiness/smoke vitest coverage
- **Integration safety guard** remains in place: requires `AUTH_TEST_ENABLE_DESTRUCTIVE=true`

### Sprint 03 - Complete (2026-07-27)

Sprint 03 household and child profile foundation is complete and backed by final
verification evidence gathered on 2026-07-27.

- Household (Family Space) creation with ownership model.
- Child profile create/read/update/archive with soft-delete.
- Cross-family isolation verified at repository, API, and UI level.
- Parent policy (content boundary, time limits, story limits) with append-only audit.
- Character origin handoff payload table (`first_run_handoffs`) captured — **consumed in Sprint 04**.
- Onboarding UI and profile selection/archive UI with Playwright E2E coverage.
- PostgreSQL integration tests for repository isolation and archive behavior.
- Age band display bug fixed on onboarding page ("9-11" -> "9-12").

Evidence summary:
- **Profile unit tests:** 62/62 passed
- **Profile integration tests:** 8/8 passed (`PROFILE_TEST_ENABLE_DESTRUCTIVE=true`)
- **Profile policy tests:** 8/8 passed
- **Playwright profile E2E:** 15 tests covering API contract, authorization, cross-family, and UI flows
- **@lumi/profiles and @lumi/web typecheck:** PASS

### Sprint 04 - Complete (2026-07-27, timestamp corrected from legacy 2026-03-19)

Sprint 04 character bootstrap downstream foundation is complete. Sprint 03'ün
bıraktığı `first_run_handoffs` handoff boundary kontrollü şekilde tüketildi;
karakter domain minimum persistence, uygulama servisi, API ve UI akışı eklendi.

- `LumiCharacter` aggregate domain + 11 yeni unit test.
- Additive migration `0002_character_bootstrap_schema.sql` (3 yeni tablo: lumi_characters / character_origin_packages / first_run_handoff_consumptions).
- 4 yeni Drizzle repository + interface katmanı + relations.
- Application servis: createOrReplaceFirstRunHandoff, getStatus, originPackagesDeterministicGenerate (auto=4, manual=1), consumeAndCreateCharacter (transactional, atomic accepted flag + idempotency ledger).
- Edge-case guard seti: archived profile (PROFILE_ARCHIVED → 409), cross-scope AuthorizationError, duplicate consume (DB UNIQUE + service pre-check double guard), missing parent policy, invalid type/mode/override validation.
- 7 yeni API endpoint: character-bootstrap/* + characters/* hepsi withParent wrapper, status mapping 400/403/404/409/500.
- UI: /app/profiles kartlarına "Karakter Başlat" butonu + 3-adımlı /app/character-onboarding sayfası (tain+mod seç, pkg seç/üret, name/subtype override → consume + success screen).
- 9 DB-gated integration test: happy path + 8 edge-case. Toplam 110 test geçiyor bu session'da.

Evidence summary:
- **Sprint 04 domain tests (character):** 11/11 passed
- **Profile unit tests (total S02+S03+S04):** 81/81 passed (17 integration DB destructive skip)
- **Web smoke, auth, readiness tests:** 29/29 passed
- **Typecheck 2 packages:** PASS (profiles + web strict exactOptionalPropertyTypes dahil)

## In Progress Now

- Sprint 10 — Choice and Session Consequence (2026-08-03)

## Recently Completed

### Sprint 09 — Story Definition and Session (2026-08-03)

Sprint 09 foundation is complete and PR #10 is open.

- `@lumi/story` workspace package created with domain, application, repository, and additive migration.
- Story definition, immutable version, chapter/scene/transition structure, static + interactive modes.
- Story session lifecycle with `created -> active <-> paused`, `active -> completed/abandoned`.
- Pause/resume, advance, complete, abandon with optimistic version checks and idempotency ledger.
- Checkpoint SHA-256 hashing + latest checkpoint API.
- 11 API routes under `/api/stories` with household-scoped authorization.
- Forward-only migration `0001_story_schema.sql` with cross-schema FKs to `profile`.

Evidence summary:
- **@lumi/story unit tests:** 16/16 passed
- **@lumi/story lint/typecheck:** PASS
- **@lumi/profiles tests:** 228/228 passed
- **@lumi/web tests:** 85/85 passed
- **@lumi/web lint/typecheck:** PASS
- **pnpm build:** PASS
- **S09 integration tests:** skipped per user decision

### Sprint 04 Handoff Cleanup

Sprint 04 sonrası kalan boundary:
- **Karakter yaratıldı ama world/story downstream kayıtları oluşturulmuyor** — bu Sprint 04 scope dışı bırakıldı ve gelecek sprint'in (world/bootstrap domain) sorumluluğu.
- **NPC engine / Simulation engine / Story Outcome Commit** — tamamı Sprint 04 dışı.
- **Packages/database ortak paketleme** — Sprint 04 orijinal spec hedefi product owner tarafından öncelik düşürülmesiyle deferred.

## Deferred Backlog

- Story Outcome & World State Commit System integration and scenario tests.
- NPC Emergent Interaction Engine evaluation.
- Shared `packages/database` consolidation (orijinal Sprint 04 S04-T01..T06 task'ları — karakter bootstrap önceliği nedeniyle deferred).
- Other ideas explicitly recorded under `docs/08-backlog/`.

## Known Constraints

- EOS-ASDS v1.0 structure is under change freeze.
- PostgreSQL is the authoritative datastore.
- Auth integration tests require `AUTH_TEST_ENABLE_DESTRUCTIVE=true` to run (TRUNCATE auth tables).
- Profile integration tests require `PROFILE_TEST_ENABLE_DESTRUCTIVE=true` (`DROP SCHEMA profile CASCADE` temizlik).
- Password reset currently uses a development preview link instead of email delivery.
- Auth rate limiting is process-local (not distributed).
- Docker validation must be performed on a Docker-enabled machine.
- **Sprint 04'teki 12 pre-existing lint hatası**: Sprint 03'ten kalan child-profile.test any, validation.test unused import vb. kurallar ("mevcut kodları revert etme / gereksiz refactor") nedeniyle dokunulmadı.
