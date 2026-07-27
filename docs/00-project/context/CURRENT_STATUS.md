# Project LUMI - Current Status

**Lifecycle:** Execution

**Active branch:** `main`

**Active delivery:** Sprint 02 - Authentication and Parent Account

**Last updated:** 2026-07-27

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

## Active Scope

1. Complete Sprint 02 parent authentication vertical slice.
2. Validate auth migrations and PostgreSQL-backed login flows on a developer machine.
3. Add PostgreSQL integration tests for authentication.
4. Add browser-level end-to-end coverage for register, login, logout and password reset flows.
5. Prepare Sprint 02 delivery evidence and update traceability.

## In Progress Now

- Parent register, login, logout, `/me` and protected `/app` flow implemented.
- Refresh rotation and refresh-token reuse detection implemented.
- Rate limiting and redacted auth audit logging implemented.
- Forgot-password and reset-password screens and routes implemented.
- Remember-me and confirm-password UX implemented.

## Deferred Backlog

- Story Outcome & World State Commit System integration and scenario tests.
- NPC Emergent Interaction Engine evaluation.
- Other ideas explicitly recorded under `docs/08-backlog/`.

## Known Constraints

- EOS-ASDS v1.0 structure is under change freeze.
- PostgreSQL is the authoritative datastore.
- Real PostgreSQL integration tests are still required before Sprint 02 can be called complete.
- Browser E2E coverage is still required before Sprint 02 can be called complete.
- Docker validation must be performed on a Docker-enabled machine.
