# Migration and Seed Strategy

## Migration rules

1. Every schema change is represented by a committed migration.
2. Applied migrations are never edited.
3. Destructive changes require an explicit data-migration plan.
4. Production startup must not run development migration commands.
5. CI validates that schema and migrations are synchronized.
6. Database names and credentials differ across development, test and production.

## Initial migration

The first migration creates:

- PostgreSQL extensions if required and approved;
- identity tables;
- household membership;
- application settings;
- audit events;
- indexes and constraints.

## Seed data

Development seed creates:

- one test adult user;
- one test household;
- owner membership;
- non-secret system settings;
- optional audit event proving seed completion.

Seed uses upsert or deterministic keys and is safe to rerun.

## Test database

Integration tests use a dedicated database. Tests must not run against the developer's normal database. Each test suite resets state through transactions, truncation or disposable schema strategy.

## Backup considerations

Production backup policy is outside Sprint 01, but migrations must be compatible with standard PostgreSQL backup and restore.
