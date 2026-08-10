# Project LUMI — Neon Backup & Restore Runbook

Status: Phase 2 validation runbook
Date: 2026-08-10
Tracks: Issue #80

## Purpose

Provide a provider-portable PostgreSQL export/restore procedure for the shared LUMI development database. The procedure deliberately uses standard PostgreSQL tooling rather than a Neon-specific backup API so the same logical recovery path can be rehearsed against another PostgreSQL provider.

## Canonical connection roles

- `DATABASE_URL`: pooled/runtime connection.
- `DATABASE_DIRECT_URL`: direct/admin connection used for export, migration and restore-sensitive operations.

Never store either value in source control or workflow artifacts.

## Logical export

Use a PostgreSQL client version that is the same major version as, or newer than, the source server. For the current Neon PostgreSQL 18 development database:

```bash
pg_dump "$DATABASE_DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=lumi-neon.dump
```

The custom format is preferred because it is suitable for `pg_restore`, supports selective inspection, and does not encode provider ownership as an application requirement.

## Restore into a clean PostgreSQL database

Provision an empty PostgreSQL database, then restore:

```bash
pg_restore \
  --host=<target-host> \
  --port=<target-port> \
  --username=<target-user> \
  --dbname=<target-db> \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  lumi-neon.dump
```

After restore, run the canonical managed PostgreSQL compatibility smoke:

```bash
DATABASE_URL=<target-url> \
DATABASE_DIRECT_URL=<target-url> \
pnpm --filter @lumi/web db:compatibility-smoke
```

For a release/incident restore, also run the relevant application journey and worker integration gates before switching traffic.

## Automated rehearsal

GitHub Actions workflow `Neon Phase 2 Closeout` performs a real rehearsal:

1. re-applies canonical migrations on Neon;
2. executes a real worker repository/integration path against Neon;
3. records informational pooled/direct latency observations;
4. creates a PostgreSQL 18 custom-format dump from the direct Neon endpoint;
5. restores that dump into a clean PostgreSQL 18 service;
6. runs the canonical compatibility smoke against the restored database.

The temporary dump artifact has a one-day retention only and exists solely as CI evidence. It must not be treated as a production backup policy.

## Production backup policy boundary

This runbook proves logical portability and recovery mechanics. Before production launch, define separately:

- automated backup schedule and retention;
- encryption and access policy;
- RPO and RTO targets;
- point-in-time recovery expectations;
- restore authorization and incident ownership;
- periodic restore rehearsal cadence.

Provider-managed PITR/backups may complement this procedure, but they do not replace the provider-portable logical export proof.

## Safety rules

- Never restore over the shared reference database as a test.
- Restore rehearsals target a clean/disposable database.
- Do not publish dump artifacts or connection strings.
- Use direct/admin connections for dump and migration work.
- Validate restored schema/application behavior before any traffic switch.
