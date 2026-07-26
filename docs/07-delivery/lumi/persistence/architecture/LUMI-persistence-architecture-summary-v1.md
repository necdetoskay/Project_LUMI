
# Project LUMI — Persistence Architecture Summary v1

## Status
Accepted

## Purpose

This document summarizes the complete persistence architecture of Project LUMI.

## Bounded Contexts

- Child Profile
- World
- Character
- Story
- Inventory
- Simulation
- Media
- Semantic Memory
- Audit & Integration

Each context owns its own aggregates and persistence rules.

## Aggregate Roots

- ChildProfile
- World
- Character
- StoryDefinition
- StorySession
- ItemDefinition
- ItemInstance
- Inventory
- WorldEvent
- SimulationRun
- MediaAsset
- SemanticDocument
- AuditLog
- OutboxMessage

## Persistence Principles

- PostgreSQL is the authoritative datastore.
- JSONB is used only for dynamic, versioned structures.
- Binary media is stored outside PostgreSQL.
- Embeddings are secondary representations.
- Domain events are persisted through the Outbox Pattern.
- Historical records are append-only where appropriate.

## Transaction Rules

Single transaction:

- aggregate update
- audit log
- outbox message
- domain event persistence

External API calls never occur inside database transactions.

## Concurrency

- Optimistic concurrency by default.
- Row locking only for critical workflows.
- Idempotent processing for distributed operations.

## Recovery

- Simulation checkpoints
- Story checkpoints
- Persistent world state
- Delayed effects
- Replay-safe messaging

## Performance

- Indexed foreign keys
- Partial indexes for active data
- Append-only history tables
- Read models optimized for story playback
- Semantic cache for repeated retrieval

## Security

- Ownership-based access
- Parent/child isolation
- Immutable audit history
- Safety validation before generated content is exposed

## Architectural Decisions

1. PostgreSQL is the Single Source of Truth.
2. Aggregates define transaction boundaries.
3. World simulation is persistent.
4. Stories are immutable after publication.
5. Item ownership and custody are separate.
6. Semantic search never replaces relational truth.
7. Outbox is mandatory.
8. Checkpoints replace long replay.
9. Background simulation follows the ten-day decay/freeze policy.
10. All major persistence models support optimistic concurrency.

## Persistence Package Completion

Completed specifications:

1. Persistence Plan
2. ORM Decision
3. PostgreSQL Structure
4. Database Configuration
5. PostgreSQL Extensions
6. Shared Types
7. Child Profile Schema
8. World Schema
9. Character Schema
10. Story Schema
11. Inventory & Item Schema
12. World Event & Simulation Schema
13. Media & Asset Schema
14. Semantic Memory & Embedding Schema
15. Audit, Outbox & Integration Schema
16. Persistence Architecture Summary

## Result

The Persistence layer is now considered architecturally complete and ready for implementation according to the EOS engineering workflow.

## Next Phase

Implementation:
- Entity models
- ORM mappings
- Database migrations
- Repository implementations
- Integration tests
