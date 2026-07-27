# Sprint 02 - Auth Migration and Operation Runbook

## Document Status

- Version: **1.0**
- Status: **Active**
- Last updated: **2026-07-27**
- Scope: **Parent authentication foundation**

## Purpose

This runbook explains how to prepare, migrate, verify and troubleshoot the
current Project LUMI parent authentication flow in a local developer
environment.

## Current Scope

The current auth slice includes:

- parent registration;
- parent login and logout;
- protected `/app` boundary;
- `/api/auth/me` session lookup;
- refresh rotation and refresh-token reuse detection;
- remember-me session support;
- forgot-password and reset-password flow;
- in-memory auth rate limiting;
- redacted auth audit logging.

This runbook does not claim production readiness. PostgreSQL integration test
execution still depends on a reachable local database, and browser E2E coverage
is still pending.

## Preconditions

Before using auth locally, confirm all of the following:

- `.env` exists and contains a valid `DATABASE_URL`;
- local PostgreSQL is reachable;
- dependencies are installed;
- auth schema migration has been applied.

Recommended command order:

```powershell
pnpm install --frozen-lockfile
pnpm infra:up
pnpm auth:migrate
pnpm dev
```

## Required Environment

Minimum required environment values:

```env
DATABASE_URL=postgresql://lumi:lumi_local_only@localhost:15432/lumi
AUTH_COOKIE_SECURE=false
AUTH_RATE_LIMIT_MAX_REQUESTS=5
AUTH_RATE_LIMIT_WINDOW_MS=60000
```

Notes:

- `AUTH_COOKIE_SECURE` defaults to `false` outside production.
- The current auth rate limiter is in-memory and process-local.
- Password reset currently exposes a development preview token in non-production
  environments instead of sending email.

## Migration

Apply the auth schema with:

```powershell
pnpm auth:migrate
```

Expected result:

- process exits successfully;
- `Auth migration completed.` is printed;
- auth tables exist in PostgreSQL.

Tables currently expected:

- `parent_accounts`
- `parent_sessions`
- `parent_password_reset_tokens`

## Local Verification Flow

After migration and while `pnpm dev` is running, verify this sequence:

1. Open `/register` and create a parent account.
2. Confirm redirect to `/app`.
3. Log out.
4. Log in again with the created account.
5. Confirm redirect to `/app`.
6. Open `/forgot-password`.
7. Request a reset link.
8. Use the development preview link to open `/reset-password`.
9. Reset the password.
10. Log in with the new password.

## Troubleshooting

### Symptom: `Giris su anda tamamlanamadi. Tekrar dene.`

Meaning: login reached the backend but failed with an unexpected server error.

Most likely causes:

- PostgreSQL is not running;
- auth migration was not applied;
- `DATABASE_URL` is invalid;
- auth tables are missing.

First checks:

```powershell
pnpm infra:status
pnpm auth:migrate
```

### Symptom: register works but login does not redirect into the app

Check that the request is coming from the web form and not from a raw API call.
The current form flow redirects successful auth requests into `/app`.

### Symptom: password reset screen exists but no email arrives

This is expected in the current local slice. Non-production flow returns a
preview token and exposes a development link instead of using a mail provider.

### Symptom: integration tests report database unavailable

The new PostgreSQL integration tests are environment-sensitive. If PostgreSQL is
not reachable on `localhost:15432`, the suite logs a skip notice instead of
failing the entire auth test run.

Bring the database up and rerun:

```powershell
pnpm infra:up
pnpm auth:migrate
pnpm test
```

## Operational Limits

Current known limits:

- no email delivery provider is integrated yet;
- no browser E2E coverage is implemented yet;
- auth rate limiting is not distributed across multiple processes;
- production rollout evidence is not complete.

## Evidence Commands

Commands verified on 2026-07-27:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm auth:migrate
```
