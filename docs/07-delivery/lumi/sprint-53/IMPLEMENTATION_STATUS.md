# Sprint 53 — Implementation Status

Status: COMPLETE
Date: 2026-08-10
Branch: `s53/character-visual-canon`

## Objective

Implement the first production visual pipeline for LUMI: existing character data -> reproducible visual brief -> provider generation job -> managed candidate assets -> explicit character visual canon selection.

## Verified evidence

- DB-backed S53 fake-provider lifecycle gate passed against disposable PostgreSQL.
- Real OpenRouter `krea/krea-2-medium-turbo` generation passed: one 1K Lina candidate was generated, persisted, selected as canon and uploaded as workflow evidence.
- The provider-independent brief/job/asset/canon lifecycle is implemented.
- Parent/admin Asset Management UI is available at `/app/assets`.
- Production-like Docker Compose cold start passed from a fresh PostgreSQL volume.
- Canonical migrations execute in auth -> profile -> world -> NPC -> story order and can be replayed idempotently.
- Web and worker health checks passed after fresh migration.
- Web remained healthy after restart and Sprint 53 state remained available.
- Real browser E2E passed against the Compose web artifact: parent login -> `/app/assets` -> Lina visual library.
- Final head `88531ce4e37b5b6e1793f15532bbcea05814a717` passed CI #1160, ULTEF S53 Compose Cold Start #22, ULTEF S53 Character Visual Canon #62, ULTEF S53 Live Krea Image #77, ULTEF Integration #843, Security Scan #1105 and the active regression matrix.

## Workboard

- [x] T01 Visual-canon specification
- [x] T02 Generation job / managed asset / canon persistence model
- [x] T03 Deterministic visual brief + fingerprint
- [x] T04 Provider-independent generation/storage ports
- [x] T05 Candidate persistence and explicit canon lifecycle
- [x] T06 Parent/admin Asset Management UI foundation
- [x] T07 DB-backed fake-provider lifecycle evidence
- [x] T08 Real Krea one-image smoke evidence
- [x] T09 Fresh-volume Docker Compose migration evidence
- [x] T10 Migration replay/idempotency through Docker Compose
- [x] T11 Web and worker health after fresh migration and restart
- [x] T12 `/app/assets` browser flow against production-like Compose
- [x] T13 Final CI/regression matrix and closeout

## Stabilization outcome

`schema-migrate` is a one-shot Compose service based on `postgres:17.7-alpine`; it does not depend on Node, pnpm or workspace dependency resolution. Migration directories are mounted read-only and applied via `psql -v ON_ERROR_STOP=1` in the same dependency order used by integration tests.

Auth SQL was extracted from the previous JS-embedded migration into `apps/web/migrations/0001_auth_schema.sql`; the existing `auth-migrate.mjs` reads that same canonical SQL file, preventing separate CI and Docker auth schema definitions.

The cold-start gate now proves:

1. fresh PostgreSQL volume;
2. all canonical migrations complete with exit code 0;
3. Sprint 53 tables exist;
4. web becomes healthy;
5. canonical demo preparation succeeds;
6. parent login and `/app/assets` succeed in a real browser against the Compose artifact;
7. worker remains running and healthy;
8. the entire migration set can be replayed without failure;
9. web remains healthy after restart;
10. Sprint 53 persisted state remains available after migration replay and restart.

## Guardrails retained

- no generation side effect during character creation;
- no provider URL as the only persisted asset identity;
- no silent canonical-image replacement;
- no paid generation on ordinary CI runs;
- no Docker/runtime change is called ready without fresh-volume evidence;
- future visual sprints must preserve production-like browser, migration and regression evidence before COMPLETE.
