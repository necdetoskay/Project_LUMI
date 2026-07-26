
# Project LUMI — Persistence Implementation Roadmap v1

## Status
Accepted

## Purpose

This document defines the execution order for implementing the completed Persistence architecture.

## Phase 1 — Foundation

- Create PostgreSQL database
- Enable required extensions (pgvector, uuid support as needed)
- Configure ORM
- Configure migration pipeline
- Configure seed infrastructure

Deliverables:
- Initial schema
- Migration system
- Development database

## Phase 2 — Core Aggregates

Implementation order:

1. Child Profile
2. World
3. Character
4. Story
5. Inventory

Each aggregate includes:

- Entity models
- Repository interfaces
- ORM mappings
- CRUD integration tests

## Phase 3 — Simulation

Implement:

- World Events
- Simulation Runs
- Delayed Effects
- Checkpoints

Goals:

- Background simulation
- 10-day decay/freeze
- Resume support

## Phase 4 — Media

Implement:

- MediaAsset
- Variants
- References
- Object storage integration

## Phase 5 — Semantic Layer

Implement:

- Semantic documents
- Chunking
- Embeddings
- Semantic cache

The relational database remains the authoritative source.

## Phase 6 — Audit & Integration

Implement:

- Audit log
- Outbox
- Event dispatcher
- Retry worker
- Dead-letter queue

## Testing Strategy

For every aggregate:

- Unit tests
- Repository tests
- Migration tests
- Transaction tests
- Concurrency tests
- Integration tests

## Definition of Done

Persistence implementation is complete when:

- All migrations execute successfully
- Repositories pass integration tests
- Transactions are atomic
- Optimistic concurrency is verified
- Outbox is operational
- Checkpoints recover correctly
- Semantic indexing functions correctly

## Milestones

M1 - Database Foundation

M2 - Core Domain

M3 - Story & Inventory

M4 - Simulation

M5 - Media & Semantic

M6 - Audit & Integration

M7 - Persistence Complete

## Next Phase

Application Layer:

- Domain Services
- Decision Engine integration
- Story Engine integration
- World Simulation Engine
- API layer
