# Project LUMI — Physical PostgreSQL Schema v1

## Purpose
Defines the physical PostgreSQL organization of the LUMI database.

## Core Principles
1. One logical domain per schema when justified.
2. Consistent naming conventions.
3. UUID primary keys for business entities.
4. Append-only history separated from mutable tables.
5. Physical layout follows domain boundaries.

## Recommended Schemas

- public (shared/reference)
- story
- world
- character
- inventory
- ai
- semantic
- integration
- audit

For MVP, deployment may start with a single schema and evolve later without changing the logical model.

## Naming

Tables:
snake_case plural

Columns:
snake_case

Primary keys:
id

Foreign keys:
<entity>_id

Indexes:
idx_<table>_<purpose>

Unique:
uq_<table>_<purpose>

## Core Table Groups

Story:
- story_sessions
- story_versions
- choice_points
- choice_selections

World:
- worlds
- world_events
- world_clock
- locations

Character:
- characters
- memories
- emotional_states
- relationships

Inventory:
- inventories
- inventory_entries
- item_instances
- item_transfers

AI:
- generation_requests
- generation_runs
- generation_outputs

Semantic:
- semantic_sources
- semantic_chunks
- embeddings

Integration:
- outbox_messages
- consumer_inbox

Audit:
- domain_events
- audit_logs
- state_transitions

## Extensions

Required:
- pgcrypto (or UUID support)
- pgvector

Optional:
- pg_trgm

## Partition Candidates

Large append-only tables:
- domain_events
- audit_logs
- emotion_history
- message_delivery_attempts

Time-based partitioning may be introduced when operational metrics justify it.

## Constraints

- FK integrity enforced.
- NOT NULL by default where meaningful.
- CHECK constraints for bounded values.
- Unique constraints for business invariants.

## Storage

Large binary assets are not stored inside PostgreSQL.
Only metadata and object references are persisted.

## Decisions Finalized

1. PostgreSQL remains the authoritative datastore.
2. Physical layout mirrors logical domains.
3. Business entities use UUID keys.
4. Append-only history is isolated.
5. Object storage holds media.
6. Extensions are kept minimal.
7. Partitioning is introduced only when needed.

## Next Artifact

Initial Migration Strategy v1
