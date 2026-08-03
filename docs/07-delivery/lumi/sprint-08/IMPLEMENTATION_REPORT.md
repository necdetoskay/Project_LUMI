# Sprint 08 — World Domain Implementation Report

## Overview

Sprint 08 delivers the world domain: a persistent universe bootstrap system for
LUMI characters. Each character gets a world with regions, locations, a home,
bootstrap manifest, checkpoint, character location tracking, movement events,
and environment/location graph runtime binding.

## Package Structure

```
packages/world/
├── src/
│   ├── domain/           # Aggregate roots: World, Region, Location, Home
│   ├── application/      # Services: bootstrap, movement, event-store, checkpoint, auth
│   ├── db/
│   │   ├── client.ts     # Postgres/Drizzle connection
│   │   ├── schema/       # 17 Drizzle table definitions (13 + 4 new)
│   │   └── repositories/ # DrizzleWorldRepository (interface + impl)
│   └── index.ts          # Public API exports
├── migrations/
│   ├── 0001_world_bootstrap.sql
│   ├── 0002_world_event_store.sql
│   ├── 0003_world_hardening.sql
│   └── 0004_world_scope_and_continuity_hardening.sql  # +guard,+ledger,+residences
└── tests/
    ├── domain/           # Unit tests: world, region, location, home, validation
    ├── events/           # Event store + invariant tests
    └── integration/      # DB-backed integration tests (opt-in via env var)
```

## Test Results

| Package | Typecheck | Lint | Unit Tests |
|---------|-----------|------|------------|
| `@lumi/world` | ✅ | ✅ | **73/73** (7 files) |
| `@lumi/web` | ✅ | ✅ | **85/85** (12 files) |
| `@lumi/profiles` | ✅ | ✅ | **228/228** (11 files) |
| `check-mojibake` | — | — | ✅ |
| `git diff --check` | — | — | ✅ |
| `pnpm build` | ✅ | — | ✅ |

## Review Findings — Fixed

### P0 — Critical

1. **Bootstrap duplicate location INSERT** (`world-bootstrap.service.ts`)
   - Root cause: `createLocation` called twice with the same UUID.
   - Fix: Set `isHome: true` at creation time. Removed the `markAsHome()` call.

2. **Client payload trust / Family Space isolation** (`apps/web/app/api/world/*`)
   - Root cause: Routes accepted `householdId`/`characterId` from the client.
   - Fix: All routes verify authorization via `getHouseholdForUser` or
     `getOwnedHousehold`. Cross-household requests return 404 (no data leak).
   - `actorUserId` always overwritten with `parent.id`.

3. **Destructive test safety** (`world-bootstrap.integration.test.ts`)
   - Root cause: `DROP SCHEMA IF EXISTS profile CASCADE` on shared DBs.
   - Fix: Disposable DB with `test` schema name guard. `search_path` approach
     replaced with direct `profile.` schema-qualified SQL.

4. **Bootstrap authoritative origin server-side resolve** (`POST /api/world`)
   - Client now sends only `characterId` + `idempotencyKey`.
   - `getOwnedHousehold` + `getCharacterById` + `listOriginPackages` called
     server-side via `@lumi/profiles/application`.
   - `householdId`/`originPackage`/`seed` cannot be overridden from the body.

### P1 — High Priority

5. **Missing FK constraints** (`0004_world_scope_and_continuity_hardening.sql`)
   - `fk_worlds_household`, `fk_worlds_child_profile`, `fk_worlds_character`.
   - `uq_world_home_world_type`, `uq_active_world_per_child` partial unique index.
   - `uq_world_event_sequence` for event ordering integrity.

6. **Migration idempotency** (`world-migrate.mjs`, `0004_*.sql`)
   - All ALTER TABLE statements guarded by PL/pgSQL `__world_constraint_exists`.
   - Migration ledger table (`profile._world_migration_ledger`) prevents re-apply.
   - Script skips already-applied migrations even across session restarts.

7. **Residence, environment, location graph runtime binding** (`world-bootstrap.service.ts`)
   - Bootstrap now creates in one transaction:
     - Home location + second accessible location
     - `world_location_connections` edge between them
     - `world_character_residences` for the character
     - `world_environment_snapshots` for the home region
     - Checkpoint + movement event to starting location
     - `WORLD_CREATED` domain event
   - Repository interface extended with `createEnvironmentSnapshot`,
     `createLocationConnection`, `createCharacterResidence`, etc.

8. **Drizzle schema additions** (`packages/world/src/db/schema/world/`)
   - `environment-snapshots.ts`, `location-connections.ts`,
     `world-character-residences.ts`, `idempotency-ledger.ts`
   - Relations updated to include new references.

9. **Authorization helper** (`world-auth.service.ts`)
   - `assertWorldAccess(worldId, householdId)` — throws if world not in household.
   - `getWorldOrForbidden(worldId, householdId)` — returns world or throws 404.
   - All world routes now use `assertWorldAccess` consistently (replacing
     ad-hoc `getHouseholdForUser` calls in sub-routes).

10. **World detail response** (`world-detail.service.ts`)
   - `getWorldDetail(worldId)` returns world + all sub-resources in a single
     parallelized query: regions, locations, home, checkpoints, connections,
     environment snapshots, bootstrap manifest, latest checkpoint.
   - GET `/api/world/{id}` now returns full detail instead of bare world record.
   - Reduces N+1 queries by running all sub-resource fetches concurrently.

11. **Movement adjacency check** (`movement.service.ts`)
   - `moveCharacterToLocation` now verifies target location is reachable via
     `world_location_connections` before allowing movement.
   - Non-accessible locations throw `LOCATION_NOT_ACCESSIBLE` (tested in
     integration test).

12. **Event store wired to use cases** (`world-bootstrap.service.ts`, `movement.service.ts`)
    - Bootstrap: fires `WORLD_CREATED` event inside the creation transaction.
    - Movement: fires `CHARACTER_ARRIVED` / `CHARACTER_MOVED` /
      `CHARACTER_RETURNED_HOME` event inside the movement transaction.
    - Archive: fires `WORLD_ARCHIVED` event inside the archive transaction.
    - Added `recordDomainEventWithTx` variant to `event-store.service.ts`.

13. **Placebo tests replaced** (`tests/events/invariants.test.ts`)
    - Replaced 3 placebo tests with real behavioral tests: region key collision,
      location key collision, `markAsHome` version increment,
      `setAccessibility` + `isAccessible` behavior.

### Deferred to Sprint 09

- **Deterministic checkpoint hash/replay** — `checkpoint.service.ts` currently
  uses `crypto.randomUUID()` for state hash with `|| true` bypass.
- **Optimistic concurrency** — Version checks on world/location updates.
- **Concurrency, idempotency, event & outbox** — Dedup keys, outbox pattern.
- **Integration tests** — Require disposable PostgreSQL instance.

## Authorization Matrix

| Route | Method | Auth Check | Cross-Household |
|-------|--------|-----------|-----------------|
| `/api/world` | POST | `getOwnedHousehold(parent.id)` | 403 (no household) |
| `/api/world/{id}` | GET | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}` | PATCH | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/regions` | GET | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/locations` | GET | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/homes` | GET | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/checkpoints` | GET | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/movement` | POST | `assertWorldAccess(id, household.id)` | 404 |
| `/api/world/{id}/movement` | GET | `assertWorldAccess(id, household.id)` | 404 |

## API Routes

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/world` | Create world from origin package (server-side resolve) |
| GET | `/api/world/{id}` | Get world by ID |
| PATCH | `/api/world/{id}` | Archive world |
| GET | `/api/world/{id}/regions` | List world regions |
| GET | `/api/world/{id}/locations` | List world locations |
| GET | `/api/world/{id}/homes` | List world homes |
| GET | `/api/world/{id}/checkpoints` | List world checkpoints |
| POST | `/api/world/{id}/movement` | Move character to location |
| GET | `/api/world/{id}/movement` | Get character location + history |

## Verification Checklist

- [x] Typecheck (`@lumi/world`, `@lumi/web`, `@lumi/profiles`)
- [x] Lint (`@lumi/world`, `@lumi/web`)
- [x] Unit tests (73 world + 228 profiles + 85 web = 386 passing)
- [x] Mojibake scan
- [x] Whitespace check (`git diff --check`)
- [x] Production build (`pnpm build`)
- [ ] Integration tests (opt-in: `WORLD_TEST_ENABLE_DESTRUCTIVE=true`)
- [ ] E2E tests
