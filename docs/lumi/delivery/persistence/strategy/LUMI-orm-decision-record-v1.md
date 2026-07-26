# Project LUMI — ORM Decision Record v1

- **Document Type:** Architecture Decision Record
- **Status:** Accepted
- **Decision Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Database Design Freeze v1, Persistence Implementation Plan v1
- **Target Stack:** TypeScript / Node.js / PostgreSQL

---

## 1. Decision

Project LUMI will use:

```text
Drizzle ORM
+
node-postgres
+
Drizzle Kit
+
controlled raw SQL
```

as its official persistence technology.

This is a PostgreSQL-first hybrid approach.

Drizzle will be used for:

- table and column definitions;
- typed SQL queries;
- relations;
- standard constraints;
- common indexes;
- repository implementation;
- transaction integration;
- migration generation and tracking.

Raw PostgreSQL SQL will be used selectively for:

- extension installation;
- advanced pgvector configuration;
- complex partial or expression indexes;
- BRIN and specialized indexes;
- concurrent index operations;
- `NOT VALID` constraint workflows;
- advanced backfills;
- database-native functions where ORM syntax is insufficient.

`node-postgres` remains the underlying PostgreSQL driver and connection-pool layer.

---

## 2. Context

LUMI is not a simple CRUD application.

Its persistence layer must support:

- relational domain modeling;
- transactional story choices;
- world simulation;
- append-only event history;
- transactional outbox;
- JSONB;
- pgvector;
- custom indexes;
- optimistic concurrency;
- row locking;
- idempotency;
- batched backfills;
- long-lived migration evolution.

The ORM must not hide PostgreSQL capabilities required by the approved architecture.

---

## 3. Options Evaluated

Four approaches were evaluated:

1. Drizzle ORM
2. Prisma ORM
3. Direct `node-postgres`
4. Hybrid ORM plus raw SQL

---

## 4. Evaluation Criteria

The options were evaluated against:

- PostgreSQL fidelity;
- TypeScript type safety;
- schema readability;
- migration transparency;
- JSONB support;
- pgvector support;
- advanced index support;
- transaction control;
- raw SQL escape hatch;
- repository suitability;
- performance visibility;
- operational complexity;
- maintainability;
- vendor abstraction risk.

---

## 5. Option A — Drizzle ORM

### Strengths

- schema definitions remain close to SQL;
- strong TypeScript inference;
- explicit query construction;
- PostgreSQL-specific column types;
- JSON and JSONB support;
- native vector column modeling;
- pgvector index and distance-operation support;
- raw SQL remains available;
- migration output is inspectable SQL;
- suitable for repository-oriented persistence;
- low conceptual distance from PostgreSQL.

### Weaknesses

- less high-level automation than Prisma;
- developers must understand SQL and PostgreSQL;
- advanced migrations still require manual SQL;
- relation loading requires deliberate query design;
- architecture discipline remains the team’s responsibility.

### LUMI Assessment

Very strong fit.

Drizzle provides enough type safety without forcing the database into a generic abstraction model.

---

## 6. Option B — Prisma ORM

### Strengths

- polished developer experience;
- approachable schema language;
- generated client;
- strong CRUD productivity;
- mature migration workflow;
- good ecosystem and documentation;
- convenient relation APIs.

### Weaknesses for LUMI

- greater abstraction distance from PostgreSQL;
- pgvector and some extension types require unsupported/custom-type handling;
- raw SQL or TypedSQL is still required for several advanced PostgreSQL features;
- specialized indexes and migration workflows may need manual intervention;
- generated-client patterns can encourage persistence models to leak into application code;
- complex PostgreSQL-first designs may become split between Prisma schema and custom SQL.

### LUMI Assessment

Prisma is suitable for many conventional web applications, but LUMI’s use of pgvector, specialized indexes, outbox polling and PostgreSQL-native evolution makes it less direct than Drizzle.

---

## 7. Option C — Direct `node-postgres`

### Strengths

- complete SQL control;
- no ORM limitations;
- direct access to all PostgreSQL features;
- transparent performance behavior;
- stable and proven driver;
- parameterized queries;
- explicit connection-pool control;
- explicit transaction control.

### Weaknesses

- extensive manual row typing;
- more repetitive query code;
- manual mapping overhead;
- higher schema/query drift risk;
- harder refactoring;
- more boilerplate for common CRUD;
- migration tooling must be added separately.

### LUMI Assessment

Technically capable, but too costly as the primary abstraction for the full LUMI domain.

It remains valuable as the underlying driver and escape hatch.

---

## 8. Option D — Hybrid ORM plus Raw SQL

### Definition

Use an ORM for the common 80–90% of persistence work and raw SQL for advanced PostgreSQL features.

Possible combinations:

```text
Drizzle + node-postgres + raw SQL
Prisma + raw SQL
```

### LUMI Assessment

This is the correct architectural pattern.

The chosen implementation is:

```text
Drizzle + node-postgres + controlled raw SQL
```

because Drizzle already remains close to PostgreSQL and reduces the amount of raw SQL required.

---

## 9. Decision Matrix

Scoring:

```text
1 = weak
3 = acceptable
5 = excellent
```

| Criterion | Drizzle | Prisma | node-postgres | Drizzle Hybrid |
|---|---:|---:|---:|---:|
| PostgreSQL fidelity | 5 | 3 | 5 | 5 |
| Type safety | 5 | 5 | 2 | 5 |
| Schema readability | 5 | 5 | 2 | 5 |
| Migration transparency | 5 | 3 | 2 | 5 |
| JSONB support | 5 | 4 | 5 | 5 |
| pgvector support | 5 | 2 | 5 | 5 |
| Advanced indexes | 4 | 2 | 5 | 5 |
| Transaction control | 5 | 4 | 5 | 5 |
| Raw SQL access | 5 | 4 | 5 | 5 |
| Low boilerplate | 4 | 5 | 2 | 4 |
| Repository suitability | 5 | 4 | 4 | 5 |
| Long-term flexibility | 5 | 3 | 5 | 5 |

Result:

```text
Drizzle Hybrid is the preferred architecture.
```

---

## 10. Official Technology Components

### Runtime ORM

```text
drizzle-orm
```

### Migration Tooling

```text
drizzle-kit
```

### PostgreSQL Driver

```text
pg
```

### Vector Support

```text
pgvector PostgreSQL extension
```

### Runtime Validation

Recommended:

```text
Zod
```

Drizzle schemas may help derive select and insert validation schemas, but domain validation remains separate.

---

## 11. Layering Decision

The ORM will remain inside the infrastructure layer.

```text
Domain
    ↓
Application repository interfaces
    ↓
PostgreSQL repository implementations
    ↓
Drizzle
    ↓
node-postgres
    ↓
PostgreSQL
```

Domain and application modules must not import:

- `drizzle-orm`;
- `pg`;
- Drizzle table definitions;
- migration tooling.

---

## 12. Schema Definition Rule

Drizzle table definitions are physical persistence definitions.

They are not domain entities.

Example separation:

```text
domain/story/story-session.ts
db/schema/story/story-sessions.table.ts
db/mappers/story-session.mapper.ts
db/repositories/postgres-story-session.repository.ts
```

This avoids coupling domain behavior to database rows.

---

## 13. Repository Interface Ownership

Repository interfaces belong to the application or domain-facing port layer.

Implementations belong to infrastructure.

Example:

```text
application/ports/story-session-repository.ts
infrastructure/db/repositories/drizzle-story-session-repository.ts
```

Repository methods should express use-case needs, not generic ORM access.

Preferred:

```text
findActiveSessionForChild
commitChoice
saveWithExpectedVersion
```

Avoid exposing unrestricted methods such as:

```text
query()
findAnything()
rawClient()
```

---

## 14. Transaction Decision

Transactions will use a shared transaction-scoped Drizzle client built on one checked-out PostgreSQL client.

All statements in a transaction must use the same connection.

Canonical transaction helper:

```text
database.transaction(async tx => {
  // aggregate state
  // domain event
  // outbox message
})
```

Repositories must accept or inherit the active transaction context.

---

## 15. Raw SQL Policy

Raw SQL is allowed only when at least one applies:

- Drizzle has no adequate representation;
- PostgreSQL-native behavior must be explicit;
- migration safety requires specialized SQL;
- performance-critical query is clearer in SQL;
- operational command is not normal repository behavior.

Raw SQL must:

- use parameters;
- have tests;
- include a purpose comment;
- remain encapsulated;
- not leak into UI or domain code.

---

## 16. Migration Decision

Drizzle Kit will generate and track migrations.

Generated SQL must be reviewed before application.

Custom SQL migrations will be used for:

- `CREATE EXTENSION`;
- vector-specific setup;
- specialized indexes;
- concurrent index creation;
- large-data migration preparation;
- advanced PostgreSQL constraints.

Applied migration files remain immutable.

---

## 17. pgvector Decision

Drizzle will model vector columns where supported.

Example conceptual definition:

```text
embedding vector(dimensions)
```

The vector extension itself will be installed by custom SQL migration.

Initial semantic search will use exact vector search.

HNSW will be introduced later when measured scale requires it.

---

## 18. JSONB Decision

Drizzle JSONB types will be used with explicit TypeScript typing.

However:

- TypeScript typing does not replace runtime validation;
- JSONB documents require schema versions;
- Zod or equivalent validation is required at boundaries;
- frequently queried JSONB fields must become relational columns.

---

## 19. Relation Loading Decision

Automatic deep relation loading is not the default.

Preferred approaches:

- explicit joins;
- explicit relation queries;
- batch queries;
- dedicated read models.

This reduces:

- N+1 queries;
- accidental over-fetching;
- hidden performance cost;
- oversized aggregate hydration.

---

## 20. Query Strategy

Use Drizzle query builders for:

- normal repository queries;
- inserts;
- updates;
- deletes/archives;
- joins;
- common pagination;
- conflict handling.

Use typed SQL or raw SQL for:

- advanced CTEs;
- vector retrieval;
- specialized locking;
- complex reporting;
- database-native operations.

---

## 21. Connection Pool Decision

`node-postgres` pool is the standard runtime connection mechanism.

Pool configuration must consider:

- database connection limits;
- application replica count;
- worker replica count;
- migration connections;
- test isolation.

A transaction must not use independent `pool.query()` calls.

It must use one checked-out client or the ORM’s transaction wrapper.

---

## 22. Error Mapping

PostgreSQL and Drizzle errors must be mapped to application errors.

Examples:

```text
23505 -> DuplicateOperationError or ConflictError
23503 -> RelationshipConstraintError
23514 -> ConstraintViolationError
40001 -> RetryableTransactionError
40P01 -> DeadlockRetryError
```

Raw SQLSTATE codes remain inside infrastructure logs.

---

## 23. ORM Escape Hatch Governance

The escape hatch must not become uncontrolled SQL sprawl.

Rules:

1. place raw SQL in named query or migration files;
2. document why Drizzle syntax was insufficient;
3. add integration tests;
4. parameterize runtime values;
5. measure critical queries;
6. keep return mapping typed.

---

## 24. Rejected Alternatives

### Prisma as Primary ORM

Rejected because LUMI would require a larger custom-SQL surface for pgvector and specialized PostgreSQL features.

### Direct node-postgres Only

Rejected because manual mapping and typing cost would be excessive across the full domain.

### Database-Agnostic Repository Implementation

Rejected because LUMI intentionally depends on PostgreSQL features.

### Active Record Pattern

Rejected because domain behavior must not depend on ORM entities.

---

## 25. Consequences

### Positive

- strong TypeScript experience;
- PostgreSQL remains visible;
- lower pgvector friction;
- inspectable migrations;
- typed repositories;
- raw SQL remains available;
- architecture stays flexible.

### Negative

- SQL knowledge is required;
- migration reviews remain mandatory;
- some advanced features require manual SQL;
- developers must enforce layer boundaries;
- no generic database portability.

---

## 26. Implementation Guardrails

1. No Drizzle imports in domain modules.
2. No generated ORM row returned directly from API handlers.
3. No unreviewed generated migrations.
4. No raw string interpolation in SQL.
5. No transaction implemented with unrelated pooled connections.
6. No automatic deep-loading in critical flows.
7. No persistence behavior hidden inside domain entities.
8. No database-agnostic abstraction that removes required PostgreSQL features.
9. No permanent dual schema definitions.
10. No Prisma introduction alongside Drizzle without a new architecture decision.

---

## 27. Testing Requirements

The ORM decision is validated through a technical spike covering:

- UUID creation;
- JSONB insert and validation;
- pgvector insert and similarity query;
- partial index migration;
- story-session optimistic update;
- `SELECT ... FOR UPDATE`;
- state + event + outbox transaction;
- rollback verification;
- migration from empty database;
- repository mapping.

The spike must use real PostgreSQL.

---

## 28. Initial Dependencies

Conceptual package set:

```text
drizzle-orm
drizzle-kit
pg
zod
drizzle-zod
vitest
testcontainers
```

Exact versions will be pinned during implementation after compatibility verification.

---

## 29. Review Trigger

This decision must be reviewed if:

- Drizzle no longer supports required PostgreSQL features;
- migration tooling becomes operationally unsafe;
- pgvector integration becomes incompatible;
- application scale requires a specialized data-access layer;
- a major architectural change replaces PostgreSQL;
- measurable productivity or reliability problems appear.

Preference alone is not sufficient to reopen the decision.

---

## 30. Final Decision Summary

Official LUMI persistence stack:

```text
PostgreSQL
    +
node-postgres connection pool
    +
Drizzle ORM
    +
Drizzle Kit migrations
    +
controlled raw PostgreSQL SQL
    +
Zod boundary validation
```

This gives LUMI:

- type safety without hiding SQL;
- direct PostgreSQL capability;
- practical pgvector support;
- explicit transaction control;
- transparent migrations;
- long-term schema flexibility.

---

## 31. Decisions Finalized

1. Drizzle ORM is LUMI’s official ORM.
2. `node-postgres` is the underlying PostgreSQL driver.
3. Drizzle Kit manages migration generation and tracking.
4. Raw SQL is an approved controlled escape hatch.
5. PostgreSQL portability is not a goal.
6. ORM models remain outside the domain layer.
7. Repository interfaces hide ORM details.
8. Transactions use a single connection context.
9. pgvector is modeled through Drizzle and custom migration SQL.
10. Runtime JSONB validation remains mandatory.
11. Deep automatic relation loading is avoided.
12. Generated migrations require human review.
13. Prisma is not used as the primary ORM.
14. Direct `node-postgres` is not used as the sole persistence abstraction.
15. The decision is validated through a real PostgreSQL technical spike.

---

## 32. Next Artifact

**PostgreSQL Project Structure v1**

The next document will define:

- exact folders;
- file naming;
- schema module boundaries;
- repository placement;
- migration placement;
- seed structure;
- test structure;
- import rules;
- dependency direction.
