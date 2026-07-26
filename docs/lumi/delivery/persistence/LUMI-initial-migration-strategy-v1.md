# Project LUMI — Initial Migration Strategy v1

## Purpose
Defines how the first production-ready database migrations are created, ordered and executed.

## Goals
- Repeatable deployments
- Deterministic schema creation
- Safe upgrades
- Environment consistency
- Automated execution

## Migration Principles

1. Migrations are immutable.
2. Every schema change is version controlled.
3. Production schema is created only through migrations.
4. Manual SQL changes are prohibited except emergency procedures.
5. Every migration is idempotent where practical.

## Recommended Initial Order

001_extensions
002_reference_tables
003_world
004_character
005_story
006_inventory
007_ai_generation
008_semantic
009_domain_events
010_outbox
011_indexes
012_seed_data

## Extension Migration

Install only required extensions:

- pgcrypto (or UUID support)
- pgvector

Optional:
- pg_trgm

## Reference Data

Seed only stable system data:

- statuses
- default roles
- capability definitions
- generation profiles
- system configuration

Application data is never inserted through seed migrations.

## Migration Validation

Each migration must be tested on:

- empty database
- production-like snapshot
- upgrade path
- repeated deployment attempt

## Rollback

Preferred strategy:
Forward-fix.

Rollback is reserved for explicitly reversible migrations.

## Deployment Flow

1. Backup
2. Run migrations
3. Validate schema
4. Start application
5. Health checks
6. Smoke tests
7. Monitor

## Constraints

- No destructive migration as first step.
- Foreign keys after referenced tables.
- Indexes after table creation.
- Seed data after structural migrations.
- Large backfills run outside deployment when possible.

## Success Criteria

- Clean install succeeds.
- Upgrade succeeds.
- No schema drift.
- Checksums match.
- Application starts successfully.

## Decisions Finalized

1. Schema is created exclusively through migrations.
2. Ordered migration pipeline is mandatory.
3. Reference data is separated from user data.
4. Forward-fix is preferred.
5. Deployment always validates migration success.

## Next Artifact

Database Design Freeze v1
