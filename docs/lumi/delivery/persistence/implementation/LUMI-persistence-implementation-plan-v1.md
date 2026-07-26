# Project LUMI — Persistence Implementation Plan v1

- **Document Type:** Implementation Planning
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** LUMI Database Design Freeze v1
- **Primary Database:** PostgreSQL
- **Target Runtime:** Node.js / TypeScript

---

## 1. Purpose

This document defines the implementation plan for converting the approved LUMI database architecture into working persistence code.

It establishes:

- implementation scope;
- package and folder structure;
- delivery sequence;
- responsibility boundaries;
- coding standards;
- migration expectations;
- testing expectations;
- acceptance criteria;
- freeze conditions.

This plan does not redesign the database architecture.

It implements the approved baseline.

---

## 2. Phase Objective

The objective of the Persistence Implementation phase is to create a production-ready data access foundation that can safely support:

- child profiles;
- worlds;
- characters;
- story sessions;
- choices;
- inventories;
- world simulation;
- AI generation;
- semantic retrieval;
- domain events;
- transactional outbox;
- audit and history.

At the end of the phase, LUMI must be able to execute its first core vertical slice using the real PostgreSQL persistence layer.

---

## 3. Scope

Included:

- ORM and database driver setup;
- schema definitions;
- migrations;
- indexes;
- constraints;
- repositories;
- transaction utilities;
- domain event persistence;
- outbox persistence;
- seed data;
- test database infrastructure;
- persistence integration tests;
- health checks;
- observability hooks;
- implementation documentation.

Not included:

- frontend screens;
- full story generation;
- final AI provider integration;
- complete world simulation engine;
- complete decision engine;
- production deployment automation;
- analytics dashboard;
- billing system.

---

## 4. Implementation Principles

1. Database architecture documents remain authoritative.
2. Implementation must not silently change approved domain semantics.
3. Additive implementation is preferred.
4. Business logic does not belong inside ORM models.
5. Aggregate boundaries guide repository and transaction design.
6. Persistence code must be testable independently.
7. Migrations are immutable after use in a shared environment.
8. Domain state, domain events and outbox messages commit atomically.
9. PostgreSQL features may be used directly where ORM abstraction is insufficient.
10. Performance tuning follows real query patterns.

---

## 5. Proposed Technology Direction

Target stack:

```text
PostgreSQL
TypeScript
Node.js
Drizzle ORM
node-postgres
drizzle-kit
pgvector
Vitest
Testcontainers or Docker-based test database
```

The ORM decision will be finalized in the next artifact.

This plan assumes a PostgreSQL-first ORM that allows:

- explicit SQL control;
- custom indexes;
- JSONB;
- pgvector;
- raw migration SQL;
- transaction management;
- strongly typed schemas.

---

## 6. Recommended Project Structure

```text
src/
├── db/
│   ├── client/
│   │   ├── database-client.ts
│   │   ├── connection-pool.ts
│   │   ├── transaction.ts
│   │   └── health-check.ts
│   ├── schema/
│   │   ├── shared/
│   │   ├── child-profile/
│   │   ├── world/
│   │   ├── character/
│   │   ├── story/
│   │   ├── inventory/
│   │   ├── simulation/
│   │   ├── generation/
│   │   ├── semantic/
│   │   ├── integration/
│   │   └── audit/
│   ├── relations/
│   ├── repositories/
│   │   ├── interfaces/
│   │   └── postgres/
│   ├── queries/
│   ├── mappers/
│   ├── seeds/
│   ├── migrations/
│   ├── workers/
│   │   └── outbox/
│   └── testing/
│       ├── fixtures/
│       ├── factories/
│       └── database-test-harness.ts
├── domain/
├── application/
└── infrastructure/
```

---

## 7. Module Boundaries

### `db/client`

Responsible for:

- pool configuration;
- database connection;
- transaction wrapper;
- health checks;
- graceful shutdown.

### `db/schema`

Responsible for:

- tables;
- columns;
- constraints;
- indexes;
- relations;
- database enum definitions.

### `db/repositories`

Responsible for:

- aggregate persistence;
- domain-to-database mapping;
- transaction-aware writes;
- domain-safe reads.

### `db/queries`

Responsible for:

- read models;
- dashboards;
- reporting queries;
- complex cross-aggregate reads.

### `db/workers`

Responsible for:

- outbox delivery;
- retry;
- dead-letter handling;
- background persistence tasks.

### `db/testing`

Responsible for:

- test containers;
- fixtures;
- factories;
- reset and cleanup;
- migration validation.

---

## 8. Domain Implementation Order

Recommended sequence:

1. Shared database primitives
2. Extensions and reference tables
3. Child profile
4. World
5. Character
6. Story
7. Inventory
8. Simulation
9. AI generation
10. Semantic retrieval
11. Domain events
12. Outbox and consumer inbox
13. Audit and history
14. Index completion
15. Seed data
16. Repository implementations
17. First vertical slice

This order follows foreign-key and domain dependency direction.

---

## 9. Work Packages

### WP-01 — Database Foundation

Deliverables:

- environment configuration;
- pool;
- client;
- transaction wrapper;
- health check;
- graceful shutdown;
- development and test configuration.

### WP-02 — Schema Foundation

Deliverables:

- shared column helpers;
- UUID convention;
- timestamp convention;
- version column convention;
- JSONB typing;
- common status types.

### WP-03 — Domain Schemas

Deliverables:

- all domain tables;
- relations;
- constraints;
- initial indexes.

### WP-04 — Migration System

Deliverables:

- ordered migrations;
- clean installation;
- upgrade path;
- migration verification.

### WP-05 — Persistence Interfaces

Deliverables:

- repository contracts;
- unit-of-work conventions;
- transaction context;
- mapping contracts.

### WP-06 — Repository Implementations

Deliverables:

- PostgreSQL repositories;
- read queries;
- archive behavior;
- pagination;
- concurrency checks.

### WP-07 — Event and Outbox Persistence

Deliverables:

- domain event insert;
- outbox insert;
- consumer inbox;
- retry and dead-letter persistence;
- atomic commit.

### WP-08 — First Vertical Slice

Deliverables:

```text
Create child profile
Create world
Create character
Start story session
Commit choice
Update session
Create domain event
Create outbox message
```

### WP-09 — Persistence Test Suite

Deliverables:

- migration tests;
- repository tests;
- transaction tests;
- constraint tests;
- concurrency tests;
- outbox tests.

### WP-10 — Stabilization and Freeze

Deliverables:

- issue resolution;
- query review;
- index review;
- acceptance testing;
- implementation baseline.

---

## 10. Responsibility Boundaries

### Domain Layer

Owns:

- entities;
- value objects;
- aggregate invariants;
- domain services;
- domain events.

Does not own:

- SQL;
- ORM;
- connection pooling;
- migration logic.

### Application Layer

Owns:

- use cases;
- orchestration;
- transaction boundary requests;
- repository interfaces;
- command handling.

### Persistence Layer

Owns:

- PostgreSQL schema;
- ORM mapping;
- repository implementation;
- query implementation;
- migration execution;
- outbox persistence.

### Worker Layer

Owns:

- polling;
- retry;
- delivery;
- dead-letter routing;
- background processing.

---

## 11. Transaction Strategy

Default rule:

```text
One application use case
=
One explicit transaction boundary
```

The transaction may include:

- aggregate state change;
- history row;
- domain event;
- outbox message.

External API calls are not executed inside the database transaction.

---

## 12. Repository Design Rules

Repositories should:

- represent aggregate access;
- accept transaction context;
- return domain-safe models;
- expose explicit methods;
- enforce optimistic concurrency;
- avoid leaking ORM query builders.

Repositories should not:

- contain UI logic;
- contain AI prompt logic;
- return arbitrary untyped rows;
- coordinate unrelated aggregates without an application service;
- hide expensive cross-domain queries.

---

## 13. Query Service Rules

Use query services for:

- dashboards;
- reports;
- world summaries;
- story history views;
- semantic context preparation;
- operational monitoring.

Query services may return optimized DTOs.

They do not enforce aggregate invariants.

---

## 14. Migration Deliverables

The initial migration set should include:

```text
001_extensions
002_reference_tables
003_child_profile
004_world
005_character
006_story
007_inventory
008_simulation
009_generation
010_semantic
011_domain_events
012_outbox
013_audit
014_indexes
015_seed_data
```

Each migration requires:

- version identifier;
- purpose;
- forward SQL;
- rollback classification;
- dependency notes;
- validation notes.

---

## 15. Testing Strategy

### Unit Tests

Focus:

- mappers;
- repository method decisions;
- domain-to-row conversion;
- concurrency error mapping.

### Integration Tests

Focus:

- real PostgreSQL behavior;
- constraints;
- transactions;
- indexes;
- JSONB;
- pgvector;
- outbox atomicity.

### Migration Tests

Focus:

- empty installation;
- upgrade;
- checksum consistency;
- seed idempotency;
- schema drift.

### Acceptance Tests

Focus:

- full vertical slice;
- rollback behavior;
- duplicate prevention;
- concurrent request safety.

---

## 16. Test Database Policy

Tests must use a real PostgreSQL engine.

SQLite or in-memory database substitutes are not sufficient for:

- JSONB;
- pgvector;
- locking;
- constraints;
- index behavior;
- transaction isolation.

Preferred:

```text
Testcontainers
```

Fallback:

```text
Dedicated Docker Compose test database
```

---

## 17. Definition of Done per Schema Module

A domain schema module is complete when:

- tables are defined;
- relations are defined;
- PK/FK rules are implemented;
- constraints are implemented;
- indexes are implemented;
- migration is generated and reviewed;
- clean migration succeeds;
- integration tests pass;
- documentation is updated.

---

## 18. Definition of Done per Repository

A repository is complete when:

- interface is approved;
- create/read/update/archive paths exist;
- transaction context is supported;
- concurrency is handled;
- error mapping is explicit;
- tests cover happy and failure paths;
- no ORM types leak outside infrastructure.

---

## 19. First Vertical Slice Acceptance Criteria

The first vertical slice is accepted when:

1. A child profile can be created.
2. A world can be created for that profile.
3. A character can be added to the world.
4. A story session can be started.
5. A valid choice can be committed.
6. Duplicate choice commit is rejected or treated idempotently.
7. Session version increments.
8. Domain event is stored.
9. Outbox message is stored in the same transaction.
10. A failed transaction leaves no partial state.
11. Integration tests prove the workflow.

---

## 20. Error Handling

Persistence errors should be mapped into known application errors.

Examples:

```text
NotFoundError
ConflictError
ConcurrencyConflictError
ConstraintViolationError
DuplicateOperationError
PersistenceUnavailableError
TransactionFailedError
```

Raw database error codes must not leak directly into user-facing responses.

---

## 21. Observability Requirements

Minimum persistence metrics:

- connection pool usage;
- query latency;
- slow query count;
- transaction failures;
- migration status;
- outbox backlog;
- retry count;
- dead-letter count;
- repository error count.

Structured logs should include:

- correlation ID;
- transaction ID;
- aggregate type;
- aggregate ID;
- operation;
- duration;
- result.

---

## 22. Security Requirements

- credentials come from secure environment configuration;
- application uses minimum required database privileges;
- migration role may be separate from runtime role;
- child data access is scoped;
- raw SQL is parameterized;
- backups are encrypted;
- audit trails are protected from casual modification.

---

## 23. Performance Guardrails

Initial guardrails:

- no unbounded list queries;
- all large lists use pagination;
- queue polling uses indexed predicates;
- no N+1 query patterns in core flows;
- no unnecessary aggregate hydration;
- batch writes where appropriate;
- vector search always uses relational filters;
- slow queries are reviewed before adding speculative indexes.

---

## 24. Documentation Deliverables

Required implementation documents:

- ORM Decision Record
- Database Configuration Guide
- Schema Module Guide
- Migration Runbook
- Repository Conventions
- Transaction Guide
- Test Database Guide
- Outbox Worker Guide
- Persistence Acceptance Report
- Persistence Implementation Freeze

---

## 25. Risks

Main risks:

- schema implementation diverges from architecture;
- ORM limitations hide PostgreSQL capabilities;
- excessive repository abstraction;
- incorrect transaction scope;
- cross-aggregate coupling;
- untested migration order;
- premature indexing;
- insufficient pgvector testing;
- outbox duplication;
- weak test data isolation.

Each risk must be tracked during implementation.

---

## 26. Non-Goals

This phase does not attempt to:

- optimize every future query;
- implement every possible world system;
- finalize all AI providers;
- create production analytics;
- design UI-specific APIs;
- support multiple database engines;
- replace PostgreSQL with a generic abstraction.

---

## 27. Completion Criteria

The Persistence Implementation phase is complete when:

- ORM decision is final;
- all required schema modules exist;
- initial migration chain works;
- repositories for core aggregates work;
- event and outbox atomicity is proven;
- first vertical slice passes;
- migration and concurrency tests pass;
- backup/restore path is validated;
- observability exists;
- known risks are documented;
- Persistence Implementation Freeze is approved.

---

## 28. Decisions Finalized

1. Persistence implementation follows the frozen database architecture.
2. The work is divided into explicit packages.
3. Aggregate boundaries guide repositories and transactions.
4. PostgreSQL-specific features are allowed where needed.
5. Real PostgreSQL is mandatory for integration tests.
6. Domain state, events and outbox commit atomically.
7. The first milestone is an end-to-end story choice vertical slice.
8. Migration validation is part of implementation, not a later task.
9. Observability and security are required from the foundation stage.
10. Implementation ends with a formal persistence freeze.

---

## 29. Next Artifact

**ORM Decision Record v1**

The next document will compare:

- Drizzle ORM;
- Prisma;
- direct `node-postgres`;
- hybrid ORM + raw SQL;

and finalize the official persistence technology for LUMI.
