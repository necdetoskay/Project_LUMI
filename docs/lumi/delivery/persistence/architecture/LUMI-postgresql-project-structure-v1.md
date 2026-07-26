# Project LUMI — PostgreSQL Project Structure v1

- **Document Type:** Implementation Standard
- **Status:** Accepted
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Persistence Implementation Plan v1, ORM Decision Record v1
- **Primary Stack:** TypeScript, Node.js, PostgreSQL, Drizzle ORM

---

## 1. Purpose

This document defines the official project structure for LUMI's PostgreSQL persistence layer.

It standardizes:

- folder hierarchy;
- file naming;
- module boundaries;
- import direction;
- schema organization;
- repository placement;
- mapper placement;
- migration placement;
- seed placement;
- worker placement;
- test placement;
- shared database utilities.

The goal is to prevent persistence code from spreading across the application without clear ownership.

---

## 2. Structural Principles

1. Persistence code belongs to infrastructure.
2. Domain code must not depend on Drizzle or PostgreSQL.
3. Application ports define repository contracts.
4. PostgreSQL implementations satisfy those contracts.
5. Schema files are organized by bounded context.
6. Migrations are ordered, immutable and reviewable.
7. Read models are separated from aggregate repositories.
8. Raw SQL is centralized and named.
9. Test utilities are separated from production code.
10. Cross-context imports are restricted.

---

## 3. Recommended Root Structure

```text
src/
├── domain/
├── application/
├── infrastructure/
├── shared/
└── config/

drizzle/
├── migrations/
├── meta/
└── seeds/

tests/
├── integration/
├── migration/
├── concurrency/
└── fixtures/
```

---

## 4. Infrastructure Database Structure

```text
src/infrastructure/database/
├── client/
│   ├── database.ts
│   ├── pool.ts
│   ├── transaction.ts
│   ├── health-check.ts
│   ├── shutdown.ts
│   └── types.ts
├── schema/
│   ├── shared/
│   ├── child-profile/
│   ├── world/
│   ├── character/
│   ├── story/
│   ├── inventory/
│   ├── simulation/
│   ├── generation/
│   ├── semantic/
│   ├── integration/
│   └── audit/
├── relations/
├── repositories/
│   ├── child-profile/
│   ├── world/
│   ├── character/
│   ├── story/
│   ├── inventory/
│   ├── integration/
│   └── shared/
├── queries/
│   ├── story/
│   ├── world/
│   ├── semantic/
│   ├── monitoring/
│   └── reporting/
├── mappers/
├── sql/
├── seeds/
├── workers/
│   └── outbox/
└── testing/
```

---

## 5. Domain Structure

```text
src/domain/
├── child-profile/
├── world/
├── character/
├── story/
├── inventory/
├── simulation/
├── generation/
├── semantic/
├── integration/
└── shared/
```

Each bounded context may contain:

```text
<domain>/
├── entities/
├── value-objects/
├── events/
├── services/
├── errors/
├── policies/
└── index.ts
```

Domain code must remain persistence-agnostic.

---

## 6. Application Structure

```text
src/application/
├── commands/
├── queries/
├── services/
├── ports/
│   ├── repositories/
│   ├── event-publisher/
│   ├── clock/
│   └── id-generator/
├── dto/
├── mappers/
└── errors/
```

Repository interfaces belong under:

```text
src/application/ports/repositories/
```

Example:

```text
story-session-repository.ts
world-repository.ts
character-repository.ts
inventory-repository.ts
outbox-repository.ts
```

---

## 7. Database Client Module

Official location:

```text
src/infrastructure/database/client/
```

Files:

```text
database.ts
pool.ts
transaction.ts
health-check.ts
shutdown.ts
types.ts
```

### `pool.ts`

Responsible for:

- creating the `pg` pool;
- connection limits;
- timeouts;
- SSL configuration;
- error listeners.

### `database.ts`

Responsible for:

- creating the Drizzle client;
- exposing the typed database object;
- binding schema definitions.

### `transaction.ts`

Responsible for:

- transaction wrapper;
- transaction context type;
- retry rules;
- rollback mapping.

### `health-check.ts`

Responsible for:

- connectivity check;
- simple validation query;
- latency measurement;
- migration state check where applicable.

### `shutdown.ts`

Responsible for:

- graceful pool shutdown;
- worker shutdown coordination.

---

## 8. Schema Organization

Each domain schema folder contains table definitions for one bounded context.

Example:

```text
schema/story/
├── stories.table.ts
├── story-versions.table.ts
├── scenes.table.ts
├── choice-points.table.ts
├── choice-options.table.ts
├── story-sessions.table.ts
├── story-session-choices.table.ts
├── story-session-events.table.ts
├── story.enums.ts
├── story.types.ts
└── index.ts
```

---

## 9. Shared Schema Module

Location:

```text
schema/shared/
```

Contents:

```text
id.columns.ts
timestamp.columns.ts
version.columns.ts
archive.columns.ts
actor.columns.ts
correlation.columns.ts
shared.enums.ts
shared.types.ts
```

This module may define reusable column groups.

It must not contain domain-specific business rules.

---

## 10. Table File Naming

Table definition files use:

```text
<plural-table-name>.table.ts
```

Examples:

```text
worlds.table.ts
characters.table.ts
story-sessions.table.ts
outbox-messages.table.ts
```

Rules:

- use lowercase kebab-case;
- use plural table names;
- file name reflects physical table;
- one main table per file;
- tightly coupled join table may have its own file.

---

## 11. Enum File Naming

Database enum files use:

```text
<domain>.enums.ts
```

Examples:

```text
story.enums.ts
world.enums.ts
inventory.enums.ts
```

Only database-level enums belong here.

Domain enum concepts may exist separately in domain modules.

---

## 12. Type File Naming

Persistence-specific types use:

```text
<domain>.types.ts
```

Examples:

```text
semantic.types.ts
generation.types.ts
audit.types.ts
```

These types must not become shared domain contracts by accident.

---

## 13. Relation Files

Relations may be defined:

- beside the table;
- or in a dedicated relation module.

Official LUMI decision:

```text
src/infrastructure/database/relations/
```

Example:

```text
story.relations.ts
world.relations.ts
character.relations.ts
inventory.relations.ts
```

This keeps relation definitions visible without creating circular imports between table files.

---

## 14. Schema Export Strategy

Each schema module exports through an explicit `index.ts`.

Example:

```text
schema/story/index.ts
```

Allowed:

```ts
export * from './stories.table';
export * from './story-versions.table';
export * from './story-sessions.table';
```

Avoid wildcard exports at the infrastructure root.

Top-level exports should remain controlled.

---

## 15. Repository Structure

Example:

```text
repositories/story/
├── drizzle-story-session.repository.ts
├── drizzle-story.repository.ts
├── story.repository-errors.ts
└── index.ts
```

Repository implementations must:

- implement application interfaces;
- accept transaction context;
- use mappers;
- map SQL errors;
- avoid returning raw rows.

---

## 16. Repository File Naming

Use:

```text
drizzle-<aggregate>.repository.ts
```

Examples:

```text
drizzle-world.repository.ts
drizzle-character.repository.ts
drizzle-story-session.repository.ts
drizzle-inventory.repository.ts
```

This makes the infrastructure implementation explicit.

---

## 17. Mapper Structure

Location:

```text
src/infrastructure/database/mappers/
```

Example:

```text
mappers/
├── child-profile.mapper.ts
├── world.mapper.ts
├── character.mapper.ts
├── story-session.mapper.ts
└── inventory.mapper.ts
```

Mapper responsibilities:

- database row to domain object;
- domain object to insert model;
- domain object to update model;
- JSONB validation;
- version translation;
- timestamp normalization.

---

## 18. Query Service Structure

Read models belong under:

```text
src/infrastructure/database/queries/
```

Example:

```text
queries/story/
├── get-story-session-view.query.ts
├── list-story-history.query.ts
└── get-choice-context.query.ts
```

Query services may return DTOs directly.

They do not return domain aggregates unless explicitly required.

---

## 19. Raw SQL Structure

Location:

```text
src/infrastructure/database/sql/
```

Recommended subfolders:

```text
sql/
├── semantic/
├── reporting/
├── maintenance/
├── locking/
└── backfill/
```

File naming:

```text
<action>.sql.ts
```

Examples:

```text
find-nearest-semantic-chunks.sql.ts
claim-outbox-batch.sql.ts
rebuild-story-summary.sql.ts
```

Each raw SQL module must include:

- reason for raw SQL;
- parameter types;
- result type;
- tests;
- owning module.

---

## 20. Migration Structure

Official migration location:

```text
drizzle/migrations/
```

Example:

```text
0001_extensions.sql
0002_reference_tables.sql
0003_child_profile.sql
0004_world.sql
0005_character.sql
0006_story.sql
0007_inventory.sql
0008_simulation.sql
0009_generation.sql
0010_semantic.sql
0011_domain_events.sql
0012_outbox.sql
0013_audit.sql
0014_indexes.sql
0015_seed_data.sql
```

---

## 21. Migration Naming Standard

Use:

```text
<four-digit-order>_<short-purpose>.sql
```

Examples:

```text
0016_add_story_session_version.sql
0017_add_outbox_claim_index.sql
```

Rules:

- lowercase snake_case;
- short and explicit;
- never rename after shared use;
- never edit after application to shared environment;
- corrective changes require a new migration.

---

## 22. Seed Structure

Runtime seed logic:

```text
src/infrastructure/database/seeds/
```

Migration-bound seed SQL:

```text
drizzle/seeds/
```

Recommended files:

```text
system-roles.seed.ts
generation-profiles.seed.ts
reference-statuses.seed.ts
default-settings.seed.ts
```

Seeds must be:

- deterministic;
- idempotent where possible;
- environment-aware;
- free from production-only secrets.

---

## 23. Outbox Worker Structure

```text
workers/outbox/
├── outbox-worker.ts
├── outbox-poller.ts
├── outbox-claimer.ts
├── outbox-delivery.ts
├── outbox-retry-policy.ts
├── dead-letter-handler.ts
├── outbox.metrics.ts
└── index.ts
```

The worker must not directly own domain logic.

It delivers committed messages.

---

## 24. Test Structure

```text
tests/
├── integration/
│   ├── repositories/
│   ├── transactions/
│   ├── outbox/
│   ├── semantic/
│   └── constraints/
├── migration/
│   ├── clean-install.test.ts
│   ├── upgrade-path.test.ts
│   ├── seed-idempotency.test.ts
│   └── schema-drift.test.ts
├── concurrency/
│   ├── story-choice-conflict.test.ts
│   ├── inventory-transfer-conflict.test.ts
│   └── outbox-claiming.test.ts
└── fixtures/
```

---

## 25. Database Test Utilities

Location:

```text
src/infrastructure/database/testing/
```

Files:

```text
database-test-harness.ts
postgres-container.ts
migration-runner.ts
database-reset.ts
fixture-loader.ts
factory-context.ts
```

Test helpers must not be imported by production modules.

---

## 26. Fixture Structure

```text
tests/fixtures/
├── child-profile.fixture.ts
├── world.fixture.ts
├── character.fixture.ts
├── story.fixture.ts
├── inventory.fixture.ts
└── outbox.fixture.ts
```

Fixtures describe stable test data.

Factories generate variable test data.

---

## 27. Configuration Structure

```text
src/config/
├── database.config.ts
├── environment.ts
├── validation.ts
└── index.ts
```

Database configuration must be validated before application startup.

Required categories:

- connection string;
- pool size;
- idle timeout;
- statement timeout;
- SSL mode;
- application name;
- migration mode;
- test database configuration.

---

## 28. Dependency Direction

Allowed dependency flow:

```text
domain
↑
application
↑
infrastructure
```

More explicitly:

```text
infrastructure -> application -> domain
```

Not allowed:

```text
domain -> infrastructure
application -> concrete Drizzle repository
domain -> Drizzle table
domain -> PostgreSQL type
```

---

## 29. Import Rules

Allowed:

```text
infrastructure repository
    imports application repository interface

application use case
    imports repository interface

domain entity
    imports domain value object
```

Forbidden:

```text
domain entity
    imports drizzle-orm

application service
    imports pg.Pool

API route
    imports table definition directly
```

---

## 30. Path Alias Recommendation

Recommended aliases:

```text
@domain/*
@application/*
@infrastructure/*
@shared/*
@config/*
```

Avoid aliases that expose database internals globally.

Do not define:

```text
@db/*
```

for unrestricted use across the whole application.

---

## 31. Shared Utility Rules

Shared utilities may include:

- clock abstraction;
- ID generation;
- result type;
- pagination type;
- logging contracts;
- correlation context.

Shared utilities must not become a dumping ground for domain-specific logic.

---

## 32. Circular Dependency Prevention

Rules:

1. table files do not import repository files;
2. mapper files may import domain and schema;
3. repository files may import mappers and schema;
4. domain never imports mappers;
5. relation files import table definitions only;
6. schema index files must avoid circular wildcard chains.

---

## 33. Bounded Context Import Policy

A persistence module may not directly manipulate another context’s tables unless one of the following applies:

- approved cross-context transaction;
- integration/outbox concern;
- read-only projection;
- architecture-approved query service.

Cross-context write access must be explicit and reviewed.

---

## 34. Aggregate Repository Policy

One repository should correspond to one aggregate root.

Examples:

```text
WorldRepository
CharacterRepository
StorySessionRepository
InventoryRepository
```

Avoid table-oriented repositories such as:

```text
SceneTableRepository
ChoiceOptionTableRepository
EmotionHistoryTableRepository
```

unless the table is itself an aggregate root or operational queue.

---

## 35. Read Model Policy

Read models may combine:

- story;
- child profile;
- character;
- world;
- inventory;
- semantic context.

They must remain read-only.

They must not update multiple contexts through hidden side effects.

---

## 36. Public Export Policy

Infrastructure exports should be minimal.

Public exports may include:

- database client;
- transaction runner;
- repository implementations;
- health check;
- worker entry point.

Table definitions should not be exported from a global application barrel file.

---

## 37. Code Review Checklist

Every persistence pull request must verify:

- correct folder placement;
- correct file naming;
- dependency direction;
- no ORM leakage;
- no unbounded query;
- transaction scope;
- migration included;
- migration reviewed;
- tests included;
- raw SQL justified;
- indexes considered;
- error mapping present.

---

## 38. Example Module

```text
story/
├── domain/
│   └── story-session.ts
├── application/
│   ├── commit-choice.use-case.ts
│   └── ports/
│       └── story-session-repository.ts
└── infrastructure/
    └── database/
        ├── schema/story/
        │   ├── story-sessions.table.ts
        │   └── story-session-choices.table.ts
        ├── mappers/
        │   └── story-session.mapper.ts
        ├── repositories/story/
        │   └── drizzle-story-session.repository.ts
        └── queries/story/
            └── get-story-session-view.query.ts
```

---

## 39. Prohibited Patterns

The following are prohibited:

- one global `database.ts` containing all schema definitions;
- API routes querying tables directly;
- domain entities extending ORM models;
- repositories returning Drizzle row types;
- migration SQL mixed into runtime repository code;
- test fixtures embedded in production modules;
- generic repository base class for all aggregates;
- unrestricted cross-context joins in write paths;
- circular barrel exports;
- raw SQL files without typed boundaries.

---

## 40. Initial Delivery Sequence

Implementation should proceed in this order:

1. configuration;
2. pool and Drizzle client;
3. transaction helper;
4. shared schema primitives;
5. schema modules;
6. relations;
7. migrations;
8. mappers;
9. repository interfaces;
10. repository implementations;
11. query services;
12. outbox worker;
13. test harness;
14. integration tests;
15. stabilization.

---

## 41. Acceptance Criteria

This project structure is accepted when:

- folders are created;
- path aliases are configured;
- dependency rules are documented;
- lint rules prevent forbidden imports;
- one example module follows the structure;
- migrations have a dedicated location;
- repositories and queries are separated;
- test infrastructure is isolated;
- raw SQL has a controlled location;
- code review checklist is adopted.

---

## 42. Decisions Finalized

1. Persistence lives under `src/infrastructure/database`.
2. Repository interfaces live under application ports.
3. Domain modules remain ORM-independent.
4. Schemas are grouped by bounded context.
5. Table files use `<plural-name>.table.ts`.
6. Repository files use `drizzle-<aggregate>.repository.ts`.
7. Read models and repositories are separate.
8. Raw SQL has a dedicated controlled module.
9. Migrations live under `drizzle/migrations`.
10. Seeds are separated by runtime and migration usage.
11. Tests use dedicated integration, migration and concurrency folders.
12. Cross-context writes require explicit approval.
13. Global schema exports are prohibited.
14. Generic table repositories are not the default.
15. Dependency direction is infrastructure → application → domain.

---

## 43. Next Artifact

**Database Configuration v1**

The next document will define:

- environment variables;
- connection strings;
- pool sizing;
- SSL modes;
- timeouts;
- development/test/production separation;
- health checks;
- startup validation;
- graceful shutdown;
- migration role and runtime role separation.
