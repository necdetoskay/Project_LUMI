# Project LUMI — Neon Compatibility Spike Runbook

Status: Ready for execution once credentials are provisioned
Date: 2026-08-10
Tracks: Issue #80, Phase 2

## Purpose

Verify that the canonical Project LUMI PostgreSQL schema and migration chain run unchanged on Neon PostgreSQL before Neon becomes the preferred shared development provider.

This spike is intentionally provider-validation only. Passing it does not make Neon a domain/application dependency.

## Required GitHub repository secrets

- `LUMI_DEV_DATABASE_URL`: Neon pooled runtime connection string.
- `LUMI_DEV_DATABASE_DIRECT_URL`: Neon direct connection string for migrations/admin operations.

Do not commit either value to the repository or paste credentials into documentation/issues.

## Execution

Use GitHub Actions → `Neon Compatibility Spike` → `Run workflow`.

The workflow performs the following in order:

1. validates that both connection secrets exist;
2. installs the locked workspace dependencies;
3. applies auth migration;
4. applies profile migration;
5. applies world migration;
6. applies NPC Intelligence migration;
7. applies story migration;
8. runs the managed PostgreSQL compatibility smoke.

## Compatibility smoke assertions

The smoke test verifies:

- PostgreSQL connection and server version discovery;
- `pgcrypto` is installed;
- canonical schemas `profile`, `story`, and `npc_intelligence` exist;
- representative canonical tables exist across public/custom schemas;
- `gen_random_uuid()` works;
- a real transaction can begin and roll back cleanly.

Representative tables checked:

- `public.parent_accounts`
- `profile.households`
- `profile.child_profiles`
- `profile.worlds`
- `story.story_sessions`
- `npc_intelligence.npc_snapshots`

## Pass criteria

Phase 2 schema compatibility is PASS when:

- all migration steps exit successfully on a blank/disposable Neon database/branch;
- compatibility smoke exits successfully;
- no canonical migration requires Neon-specific SQL;
- no provider SDK is required by application/domain code;
- local PostgreSQL CI remains green.

## Follow-up validation after schema PASS

Schema PASS is necessary but not sufficient for shared-development adoption. Afterward validate:

- deterministic demo seed/prepare;
- login → household → profile → character → world → story → memory journey;
- worker database access;
- representative transaction/idempotency/recovery tests;
- pooled runtime connection behavior using `DATABASE_URL`;
- direct migration behavior using `DATABASE_DIRECT_URL`;
- cold-start and request latency observations;
- export/restore rehearsal.

## Failure interpretation

A failure must be classified before changing canonical schema:

1. credential/network/configuration failure;
2. migration ordering/idempotency failure;
3. unsupported PostgreSQL extension/feature;
4. provider connection/pooling behavior;
5. genuine canonical schema incompatibility.

Do not add Neon-specific schema code merely to make the spike green unless an architecture decision explicitly approves it.

## Rollback

There is no runtime cutover in this spike. Current local/container PostgreSQL remains supported and CI continues to use isolated PostgreSQL. A failed spike therefore does not require an application rollback.
