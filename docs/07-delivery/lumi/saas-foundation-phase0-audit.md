# Project LUMI — SaaS Foundation Phase 0 Audit

Date: 2026-08-10
Status: **Initial audit complete; implementation started**
Tracking: #80

## Database stack observed

The current application uses PostgreSQL through:

- Drizzle ORM with `postgres.js` in runtime repositories;
- `pg` / node-postgres in migration scripts;
- raw canonical SQL migrations;
- PostgreSQL 17.7 in Docker Compose.

This is a favorable portability baseline because the application is already coupled primarily to PostgreSQL rather than to a managed database vendor SDK.

## Runtime connection pattern

Observed runtime database clients include package-level Drizzle clients for at least:

- profiles;
- world;
- story;
- NPC intelligence.

Each currently constructs a `postgres.js` client with `max: 5` and caches package-local database instances. This means a single long-running process may open multiple package-level pools. This is acceptable for local development but should be reviewed before shared/serverless managed PostgreSQL becomes the default.

### Phase 1 follow-up

Do not collapse package boundaries merely to reduce connection count. First introduce a shared connection policy/configuration and measure actual process-level connection behavior. Prefer pooled managed endpoints for runtime. Revisit `max` values after Neon smoke/load measurements.

## Migration entry points

Canonical migration entry points inspected:

- `apps/web/scripts/auth-migrate.mjs`
- `packages/profiles/scripts/profile-migrate.mjs`
- `packages/world/scripts/world-migrate.mjs`
- `packages/npc-intelligence/scripts/npc-migrate.mjs`
- `packages/story/scripts/story-migrate.mjs`

Before this phase all of these selected `DATABASE_URL`. Phase 1 changes them to prefer `DATABASE_DIRECT_URL` and fall back to `DATABASE_URL`, preserving local compatibility while enabling pooled runtime/direct migration separation.

Docker Compose also includes a canonical `schema-migrate` service using `psql` against the local Compose PostgreSQL service. This deterministic local/CI path should remain available.

## PostgreSQL features requiring provider compatibility proof

Observed/known canonical requirements include:

- PostgreSQL schemas (`profile`, `story`, `npc_intelligence` and public auth tables);
- `pgcrypto`;
- `gen_random_uuid()` UUID defaults;
- `timestamptz`;
- foreign keys and cascade/set-null behavior;
- partial indexes;
- raw SQL migrations;
- transactions and idempotency/recovery behavior;
- migration ledgers in world/NPC/story paths.

These become explicit Phase 2 Neon spike checks rather than assumptions.

## Provider coupling findings

No Neon SDK is required by the inspected database runtime/migration paths. The current persistence model is therefore suitable for a PostgreSQL-provider portability strategy.

Provider-specific capabilities such as Neon branching should remain in CI/tooling/infrastructure and not enter domain/application packages.

## Asset/storage finding

Sprint 53 already introduced provider-independent visual generation ports and a local managed visual storage adapter. The S3/R2 implementation should extend this existing abstraction rather than introduce a parallel asset-storage architecture.

The later storage audit must verify:

- current logical asset identifiers;
- whether any provider/local filesystem URL leaks into canonical persistence;
- lifecycle and orphan cleanup behavior;
- how generated grid outputs/derived assets should map to logical storage keys.

## Localization finding

The existing UI contains hard-coded Turkish user-facing strings. This is expected at the current stage but confirms that the i18n phase must migrate existing copy rather than only govern new copy.

Localization work should remain after the database/storage foundation wave so infrastructure migration does not destabilize user-facing flows at the same time.

## Phase 1 changes initiated

- `DATABASE_URL` remains the runtime connection contract.
- `DATABASE_DIRECT_URL` is introduced for migrations/admin operations.
- Migration scripts prefer `DATABASE_DIRECT_URL` and safely fall back to `DATABASE_URL`.
- `.env.example` documents pooled/runtime vs direct/admin semantics.
- No provider SDK or provider name is introduced into domain/application code.

## Still open before Phase 2

- audit all remaining `DATABASE_URL` consumers, including worker/tooling/test-only code;
- determine whether connection-pool defaults should be centralized in this wave or after Neon measurements;
- add automated coverage for direct-vs-runtime connection selection where it provides meaningful regression protection;
- capture baseline CI/ULTEF results for the implementation PR;
- provision Neon and execute the compatibility spike once credentials are available.
