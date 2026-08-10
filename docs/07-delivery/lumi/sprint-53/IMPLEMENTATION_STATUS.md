# Sprint 53 — Implementation Status

Status: IN PROGRESS / STABILIZATION
Date: 2026-08-10
Branch: `s53/character-visual-canon`

## Objective

Implement the first production visual pipeline for LUMI: existing character data -> reproducible visual brief -> provider generation job -> managed candidate assets -> explicit character visual canon selection.

## Verified evidence

- DB-backed S53 fake-provider lifecycle gate has passed against disposable PostgreSQL.
- Real OpenRouter `krea/krea-2-medium-turbo` generation has passed once: one 1K Lina candidate was generated, persisted, selected as canon and uploaded as workflow evidence.
- The provider-independent brief/job/asset/canon lifecycle is implemented.
- Parent/admin Asset Management UI exists at `/app/assets`.

## Explicitly not yet verified

- Local/production-like Docker Compose cold start is NOT yet verified.
- The user's local Compose run exposed a missing Sprint 53 schema because migrations were not part of the startup path.
- A first Node-based Compose migrator attempt failed because `pg` was not resolvable in the slim/runtime image. That approach has been removed.
- The current replacement uses the official PostgreSQL image and `psql`, with canonical schema order: auth -> profile -> world -> NPC -> story.
- Fresh-volume and migration-replay evidence for that replacement is currently pending the dedicated Compose cold-start gate.

## Workboard

- [x] T01 Visual-canon specification
- [x] T02 Generation job / managed asset / canon persistence model
- [x] T03 Deterministic visual brief + fingerprint
- [x] T04 Provider-independent generation/storage ports
- [x] T05 Candidate persistence and explicit canon lifecycle
- [x] T06 Parent/admin Asset Management UI foundation
- [x] T07 DB-backed fake-provider lifecycle evidence
- [x] T08 Real Krea one-image smoke evidence
- [ ] T09 Fresh-volume Docker Compose migration evidence
- [ ] T10 Migration replay/idempotency through Docker Compose
- [ ] T11 Web health after fresh migration and restart
- [ ] T12 `/app/assets` browser flow against production-like Compose
- [ ] T13 Final CI/regression matrix and closeout

## Compose stabilization design

`schema-migrate` is a one-shot Compose service based on `postgres:17.7-alpine`; it does not depend on Node, pnpm or workspace dependency resolution. Migration directories are mounted read-only and applied via `psql -v ON_ERROR_STOP=1` in the same dependency order already used by integration tests.

Auth SQL has been extracted from the previous JS-embedded migration into `apps/web/migrations/0001_auth_schema.sql`; the existing `auth-migrate.mjs` now reads that same canonical SQL file so CI and Docker do not maintain two auth schema definitions.

The dedicated cold-start gate must prove:

1. fresh PostgreSQL volume;
2. all canonical migrations complete with exit code 0;
3. `profile.character_visual_canons` and related S53 tables exist;
4. web becomes healthy;
5. the entire migration set can be replayed without failure;
6. web remains healthy after restart.

Until those checks are green, Sprint 53 remains IN PROGRESS regardless of other passing tests.

## Guardrails

- no generation side effect during character creation;
- no provider URL as the only persisted asset identity;
- no silent canonical-image replacement;
- no paid generation on ordinary CI runs;
- no Docker/runtime change is called ready without fresh-volume evidence;
- no Sprint 53 COMPLETE status before the production-like Compose gate and final regressions are green.
