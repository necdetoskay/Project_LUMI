# Project LUMI — ORM Mapping and Persistence Strategy v1

## Purpose
Defines persistence rules between the domain model and PostgreSQL.

## Core Principles
1. Database is the source of truth.
2. ORM is a persistence layer, not business logic.
3. Aggregate boundaries define transaction boundaries.
4. Lazy loading is avoided in critical paths.
5. Explicit loading is preferred.

## Aggregate Mapping
Main aggregate roots:
- StorySession
- World
- Character
- Inventory
- GenerationRequest
- ChildProfile

Each aggregate owns its consistency rules.

## Repository Rules
Repositories return aggregate roots.
Cross-aggregate queries use read models or dedicated query services.

## Transaction Rules
One transaction should normally modify one aggregate.
Cross-aggregate workflows use domain events and the transactional outbox.

## Identity
- UUID for business entities
- BIGINT for append-only history where appropriate

## JSONB
JSONB is reserved for flexible structures.
Frequently queried values become relational columns.

## Read Models
Complex dashboards and reports should use optimized read models instead of loading full aggregates.

## Optimistic Concurrency
Mutable aggregates use a version column.
Conflicts return explicit concurrency errors.

## Performance
- Avoid N+1 queries.
- Prefer batch loading.
- Project only required columns.
- Paginate large result sets.

## Testing
Persistence tests validate:
- mappings
- transactions
- constraints
- concurrency
- migration compatibility

## Critical Constraints
1. Business rules stay outside ORM entities.
2. Aggregate invariants are enforced before persistence.
3. Repositories hide persistence details.
4. Domain events are emitted after successful state changes.
5. ORM models do not expose infrastructure concerns.

## Decisions Finalized
- ORM remains an infrastructure component.
- Aggregate-first persistence is adopted.
- Explicit loading is preferred.
- Read models optimize complex queries.
- Transaction boundaries follow aggregate boundaries.

## Next Artifact
Physical PostgreSQL Schema v1
