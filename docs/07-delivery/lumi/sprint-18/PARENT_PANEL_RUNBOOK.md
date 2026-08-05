# Sprint 18 — Parent Panel and Safety Controls Runbook

## Document Status

- Version: **1.0**
- Status: **Active**
- Last updated: **2026-08-05**
- Scope: **Parent panel, safety controls, deployment and verification**

## Purpose

This runbook explains how to deploy, migrate, verify and troubleshoot the
Sprint 18 parent panel and safety controls in the production Docker
environment (`172.41.42.51`) and in a local developer environment.

## Current Scope

Sprint 18 delivers:

- parent policy domain + persistence (`DrizzleParentPolicyRepository`,
  `blockedTopics`/`customNotes`);
- audit trail persistence and GET surface (`/api/parent-policy/audit`);
- parent panel UI at `/app/settings/safety` with navigation fix;
- consent records, child data export and archive orchestration
  (`@lumi/privacy`, `/api/privacy/*`);
- lifecycle audit trail (`/api/privacy/audit`).

Purge (async data erasure job) is explicitly out of scope for Sprint 18 and
is planned as a follow-up slice.

## Architecture Overview

### Boundaries

- `packages/profiles` — parent policy domain, household membership, child
  profiles, audit persistence (`profile.policy_audit_log`).
- `packages/privacy` — consent (`privacy.consent_records`), data lifecycle
  audit (`privacy.data_lifecycle_audit_log`), exports
  (`privacy.data_export_records`), archive orchestration.
- `apps/web` — API routes and the parent panel UI.

### Auth model

All `/api/parent-policy/*` and `/api/privacy/*` routes run behind
`withParent` (session cookie → parent account). Cross-household access is
blocked at the application layer: every service re-validates household
membership and throws `AuthorizationError`, which the routes map to HTTP 403.

### Data minimization rule

Exports (`/api/privacy/export`) are metadata-only (`lumi-child-v1`). They
never include raw story text, prompts, or conversation content. Archive is a
soft operation: it sets `deleted_at` on the child profile and archives
worlds; it does not erase history (no erase-history illusion).

## Preconditions

Confirm before operating:

- `.env` exists at the repository root and contains valid values
  (see `Environment` below).
- Docker daemon is reachable and can run the compose stack.
- For production: the target host `172.41.42.51` is reachable and the
  compose stack name is `project-lumi`.

## Environment

Minimum required environment values (also documented in `.env.example`):

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://172.41.42.51:3001
DATABASE_URL=postgresql://lumi:lumi_local_only@postgres:5432/lumi
REDIS_URL=redis://redis:6379
AUTH_COOKIE_SECURE=false
WEB_PORT=3001
POSTGRES_DB=lumi
POSTGRES_USER=lumi
POSTGRES_PASSWORD=lumi_local_only
```

Notes:

- `NEXT_PUBLIC_APP_URL` is build-time inlined and must equal the public URL
  (server host + `WEB_PORT`).
- postgres and redis are internal-only in the compose network; only the web
  service publishes `WEB_PORT`. They are reached as `postgres:5432` and
  `redis:6379`.
- `AUTH_COOKIE_SECURE` must become `true` when HTTPS is introduced.
- `LUMI_SETTINGS_ENCRYPTION_KEY` is required by LLM settings encryption.
- `.env` and `apps/web/.env.local` are git-ignored; never commit them.

## Build and Deploy

### Local development

```powershell
pnpm install --frozen-lockfile
pnpm infra:up
pnpm --filter @lumi/profiles test
pnpm --filter @lumi/privacy test
pnpm --filter @lumi/web test
pnpm dev
```

### Production image build

The web image is built from the repository root with Next standalone output:

```powershell
pnpm build
```

Build requirements (do not remove):

- `apps/web/next.config.ts` sets `output: "standalone"`.
- `scripts/inject-standalone-deps.mjs` injects `drizzle-orm` and `postgres`
  into `.next/standalone` after build (Next cannot trace them from workspace
  packages).
- `apps/web/package.json` keeps `drizzle-orm` and `postgres` as direct
  dependencies for the standalone tracing.

### Production deployment

Compose exposes only the web service to the host:

```powershell
pnpm infra:up
```

To rebuild and restart the web service after a code change:

```powershell
docker compose --file infra/compose/docker-compose.yml build web
docker compose --file infra/compose/docker-compose.yml up --detach --wait web
```

On the production host the compose project runs as `project-lumi` with the
web service on port `3001`.

## Migrations

Migrations are forward-only. Each package owns its schema and its migration
ledger.

### Applying a new package migration

For Sprint 18 the privacy schema is new. Apply it before or together with
the web deploy that references it:

```powershell
docker compose --file infra/compose/docker-compose.yml exec postgres psql -U lumi -d lumi -f /tmp/0001_privacy_schema.sql
```

or, when running locally with a reachable DB:

```powershell
pnpm --filter @lumi/privacy privacy:migrate
```

Migration ledger tables live in each package schema:

- `profile._profile_migration_ledger`
- `story._story_migration_ledger`
- `privacy._privacy_migration_ledger`

Never edit an applied migration. Add a new `NNNN_*.sql` file instead.

### Verification after migration

```powershell
docker compose --file infra/compose/docker-compose.yml exec postgres psql -U lumi -d lumi -c "\dn"
```

Expected schemas: `profile`, `story`, `privacy` (plus system schemas).

## Verification

### Unit and integration checks

```powershell
pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles lint
pnpm --filter @lumi/profiles test

pnpm --filter @lumi/privacy typecheck
pnpm --filter @lumi/privacy lint
pnpm --filter @lumi/privacy test

pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web lint
pnpm --filter @lumi/web test
```

Privacy integration tests are destructive and opt-in:

```powershell
set PRIVACY_TEST_DATABASE_URL=postgres://lumi:lumi_test_pass@localhost:65432/lumi_test
set PRIVACY_TEST_ENABLE_DESTRUCTIVE=true
pnpm --filter @lumi/privacy test:int
```

### Production smoke check

1. Open `http://172.41.42.51:3001/login` and log in as a parent.
2. Open `/app/settings/safety`.
3. Update a safety policy field and confirm the audit trail refresh.
4. Open `/api/privacy/audit?householdId=<id>` (from a parent session) and
   confirm lifecycle entries appear after consent/export/archive actions.

## Parent Panel Operations

### Viewing the safety panel

- Route: `/app/settings/safety`
- Actions: update `maxDailyStories`, `contentBoundary`,
  `requireParentApprovalForAi`, `allowImageGeneration`, `allowTts`,
  `blockedTopics`, `customNotes`.
- Every update writes a `policy.update` audit entry with before/after state.

### Consent lifecycle

- `POST /api/privacy/consent` with `{ householdId, consentType }` (and
  optional `childProfileId`) grants consent.
- `POST /api/privacy/consent/[id]?householdId=` revokes it.
- Consent types: `content_generation`, `media_generation`,
  `voice_recording`, `data_processing`.
- Every grant/revoke writes a `data_lifecycle_audit_log` entry.

### Export lifecycle

- `POST /api/privacy/export` with `{ householdId, childProfileId }`
  generates a metadata-only package and persists it.
- `GET /api/privacy/export?householdId=&childProfileId=` lists exports.
- Payloads never contain raw story/prompt/memory content.

### Archive lifecycle

- `POST /api/privacy/archive` with `{ householdId, childProfileId }` soft
  archives the child profile and its worlds.
- Archive is reversible at the database layer; it is not a purge.

## Troubleshooting

### Symptom: panel shows a generic save error

Most likely causes:

- parent is not a member of the requested household (403);
- `householdId` is missing or invalid (400);
- the web container is running an image built before the privacy migration
  was applied.

First checks:

```powershell
docker compose --file infra/compose/docker-compose.yml logs web --tail 100
docker compose --file infra/compose/docker-compose.yml ps
```

### Symptom: audit trail is empty

Confirm the route is called with a valid `householdId` from a member
session. Audit entries are only written on successful actions.

### Symptom: `crypto.randomUUID is not a function`

This happens on HTTP (non-secure) origins in client components. Client code
must use `newIdempotencyKey()` from `apps/web/lib/new-id.ts` instead of
`crypto.randomUUID()`.

### Symptom: `MODULE_NOT_FOUND: drizzle-orm` at container start

The standalone build did not receive the injected deps. Rebuild with the
inject step (see `Build and Deploy`). Do not hand-copy node_modules into the
image.

## Operational Limits

- Purge (hard erasure) is not implemented; only soft archive exists.
- Email delivery for reset/policy notifications is not integrated.
- `AUTH_COOKIE_SECURE` is `false` on HTTP; flip before HTTPS adoption.
- Migration automation (automated run on deploy) is not wired; migrations are
  applied manually before/with deploy.
