# Project LUMI — PostgreSQL Index Strategy v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Logical Data Model v1, PK/FK & Ownership Model v1, Story Session Transaction Boundaries v1, pgvector Data Model v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the canonical indexing strategy for Project LUMI.

It covers:

- primary key indexes;
- foreign key indexes;
- unique indexes;
- composite indexes;
- partial indexes;
- covering indexes;
- JSONB indexes;
- pgvector indexes;
- time-based indexes;
- soft-delete-aware indexes;
- partition-aware indexing;
- index lifecycle;
- slow-query review;
- write/read trade-offs.

The goal is to provide predictable query performance without over-indexing a write-heavy simulation system.

---

## 2. Core Principle

Project LUMI follows this rule:

```text
Every index must support a known access pattern, invariant or operational need.
```

Indexes are not created speculatively.

Every production index should have one of these reasons:

- primary key;
- foreign key lookup;
- uniqueness;
- frequent filter;
- frequent sort;
- join path;
- concurrency control;
- queue polling;
- semantic search;
- operational monitoring.

---

## 3. Default Index Types

Primary index types:

```text
B-tree
GIN
GiST
HNSW
IVFFlat
BRIN
```

Default choice:

```text
B-tree
```

Use another type only when the data and query pattern require it.

---

## 4. Primary Key Indexes

Every primary key automatically receives a unique B-tree index.

Default:

```sql
PRIMARY KEY (id)
```

For UUID tables:

```text
id UUID
```

For append-only operational/history tables:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY
```

No duplicate secondary index should be created on the same primary key column.

---

## 5. UUID Strategy and Index Locality

Preferred UUID strategy:

```text
UUIDv7
```

Reason:

- better insertion locality;
- less random page splitting than UUIDv4;
- chronological ordering properties;
- still globally unique.

Fallback UUIDv4 remains acceptable, but high-write tables benefit more from UUIDv7.

---

## 6. Foreign Key Index Rule

PostgreSQL does not automatically create indexes for foreign keys.

Therefore:

```text
Every frequently joined, filtered or cascaded foreign key should have an index.
```

Typical examples:

```sql
CREATE INDEX idx_story_sessions_child_profile_id
ON story_sessions (child_profile_id);

CREATE INDEX idx_story_sessions_story_version_id
ON story_sessions (story_version_id);

CREATE INDEX idx_memories_character_id
ON memories (character_id);

CREATE INDEX idx_world_events_world_id
ON world_events (world_id);
```

---

## 7. Foreign Key Index Exceptions

An FK index may be omitted when:

- the table is tiny;
- the FK is never queried;
- another composite index already starts with that FK;
- the table is append-only and accessed by a stronger covering pattern.

The omission must be documented.

---

## 8. Composite Index Column Order

General rule:

```text
equality filters
then
range filters
then
sort columns
```

Example query:

```sql
WHERE world_id = ?
  AND status = ?
  AND started_world_time >= ?
ORDER BY started_world_time DESC
```

Recommended index:

```sql
CREATE INDEX idx_world_events_world_status_started
ON world_events (
  world_id,
  status,
  started_world_time DESC
);
```

---

## 9. Leftmost Prefix Rule

For index:

```text
(a, b, c)
```

Efficient patterns usually include:

```text
a
a + b
a + b + c
```

A query filtering only by `b` or `c` generally cannot fully use the index.

Composite index design must reflect real query order.

---

## 10. Unique Index Strategy

Use unique indexes for business invariants.

Examples:

```sql
UNIQUE (world_id, code)
UNIQUE (story_session_id, choice_point_id)
UNIQUE (consumer_name, message_uuid)
UNIQUE (semantic_chunk_id, embedding_profile_id)
UNIQUE (simulation_run_id, sequence_no)
```

Unique indexes are correctness mechanisms, not only performance tools.

---

## 11. Partial Unique Indexes

Use partial unique indexes when uniqueness applies only to active rows.

Example: one active unique item placement.

```sql
CREATE UNIQUE INDEX uq_inventory_entries_active_item_instance
ON inventory_entries (item_instance_id)
WHERE item_instance_id IS NOT NULL
  AND archived_at IS NULL;
```

Example: one active default embedding profile.

```sql
CREATE UNIQUE INDEX uq_embedding_profiles_one_default
ON embedding_profiles ((is_default))
WHERE is_default = true
  AND status = 'active';
```

---

## 12. Soft Delete-Aware Indexing

For frequently queried active rows:

```sql
CREATE INDEX idx_characters_world_active
ON characters (world_id, status)
WHERE archived_at IS NULL;
```

Avoid including archived records in hot indexes unless historical access requires them.

---

## 13. Story Session Indexes

Recommended:

```sql
CREATE INDEX idx_story_sessions_child_status_updated
ON story_sessions (
  child_profile_id,
  status,
  updated_at DESC
);

CREATE INDEX idx_story_sessions_world_status
ON story_sessions (
  world_id,
  status
);

CREATE UNIQUE INDEX uq_story_sessions_idempotency
ON story_sessions (idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

Frequent access patterns:

- active session by child;
- recent sessions;
- sessions in a world;
- idempotent creation.

---

## 14. Choice Commit Indexes

Recommended:

```sql
CREATE UNIQUE INDEX uq_choice_selections_session_point
ON choice_selections (
  story_session_id,
  choice_point_id
);

CREATE UNIQUE INDEX uq_choice_selections_session_idempotency
ON choice_selections (
  story_session_id,
  idempotency_key
);

CREATE INDEX idx_choice_selections_session_created
ON choice_selections (
  story_session_id,
  created_at
);
```

These support:

- duplicate prevention;
- replay-safe retries;
- ordered story history.

---

## 15. Inventory Indexes

Recommended:

```sql
CREATE INDEX idx_inventory_entries_inventory
ON inventory_entries (inventory_id);

CREATE INDEX idx_inventory_entries_definition
ON inventory_entries (item_definition_id);

CREATE UNIQUE INDEX uq_inventory_entries_unique_item
ON inventory_entries (item_instance_id)
WHERE item_instance_id IS NOT NULL
  AND archived_at IS NULL;

CREATE INDEX idx_item_transfers_from_inventory_created
ON item_transfers (
  from_inventory_id,
  created_at DESC
);

CREATE INDEX idx_item_transfers_to_inventory_created
ON item_transfers (
  to_inventory_id,
  created_at DESC
);
```

---

## 16. Memory Indexes

Recommended:

```sql
CREATE INDEX idx_memories_character_active_importance
ON memories (
  character_id,
  importance DESC,
  occurred_world_time DESC
)
WHERE status = 'active';

CREATE INDEX idx_memories_world_time
ON memories (
  world_id,
  occurred_world_time DESC
);

CREATE INDEX idx_memories_source
ON memories (
  source_type,
  source_id
);
```

The semantic vector index remains separate.

---

## 17. Emotion and Relationship Indexes

Recommended:

```sql
CREATE UNIQUE INDEX uq_emotional_states_character
ON emotional_states (character_id);

CREATE INDEX idx_emotion_history_character_time
ON emotion_history (
  character_id,
  occurred_world_time DESC
);

CREATE UNIQUE INDEX uq_character_relationships_direction
ON character_relationships (
  source_character_id,
  target_character_id
);

CREATE INDEX idx_character_relationships_target
ON character_relationships (
  target_character_id
);
```

Directional relationships require both source and target access paths.

---

## 18. World Event Indexes

Recommended:

```sql
CREATE INDEX idx_world_events_world_status_time
ON world_events (
  world_id,
  status,
  started_world_time DESC
);

CREATE INDEX idx_world_events_location_status
ON world_events (
  location_id,
  status
)
WHERE location_id IS NOT NULL;

CREATE INDEX idx_world_events_region_status
ON world_events (
  region_id,
  status
)
WHERE region_id IS NOT NULL;

CREATE INDEX idx_event_participants_event
ON event_participants (world_event_id);

CREATE INDEX idx_event_participants_character
ON event_participants (character_id)
WHERE character_id IS NOT NULL;
```

---

## 19. Simulation Queue Indexes

Recommended hot polling indexes:

```sql
CREATE INDEX idx_simulation_tasks_poll
ON simulation_tasks (
  status,
  scheduled_world_time,
  priority DESC
)
WHERE status IN ('pending', 'retry_wait');

CREATE INDEX idx_scheduled_effects_poll
ON scheduled_effects (
  status,
  due_world_time,
  priority DESC
)
WHERE status IN ('pending', 'eligible', 'retry_wait');
```

Partial indexes keep queue scans small.

---

## 20. Outbox Indexes

Recommended:

```sql
CREATE INDEX idx_outbox_poll
ON outbox_messages (
  status,
  available_at,
  priority DESC,
  id
)
WHERE status IN ('pending', 'retry_wait');

CREATE INDEX idx_outbox_processing_lease
ON outbox_messages (
  lock_expires_at
)
WHERE status = 'processing';

CREATE INDEX idx_outbox_event_uuid
ON outbox_messages (event_uuid);

CREATE INDEX idx_outbox_destination_status
ON outbox_messages (
  destination,
  status,
  available_at
);
```

---

## 21. Domain Event Indexes

Recommended:

```sql
CREATE INDEX idx_domain_events_aggregate_version
ON domain_events (
  aggregate_type,
  aggregate_id,
  aggregate_version
);

CREATE INDEX idx_domain_events_correlation
ON domain_events (correlation_id);

CREATE INDEX idx_domain_events_causation
ON domain_events (causation_id)
WHERE causation_id IS NOT NULL;

CREATE INDEX idx_domain_events_story_session
ON domain_events (
  story_session_id,
  occurred_at
)
WHERE story_session_id IS NOT NULL;

CREATE INDEX idx_domain_events_world_time
ON domain_events (
  world_id,
  occurred_world_time
)
WHERE world_id IS NOT NULL;
```

---

## 22. AI Generation Indexes

Recommended:

```sql
CREATE INDEX idx_generation_requests_status_created
ON generation_requests (
  status,
  created_at
);

CREATE INDEX idx_generation_requests_story_session
ON generation_requests (
  story_session_id,
  created_at DESC
);

CREATE UNIQUE INDEX uq_generation_requests_idempotency
ON generation_requests (idempotency_key);

CREATE INDEX idx_generation_runs_request
ON generation_runs (generation_request_id);

CREATE INDEX idx_generation_outputs_run_status
ON generation_outputs (
  generation_run_id,
  status
);
```

---

## 23. JSONB Index Strategy

Do not create a GIN index on every JSONB column.

Use GIN only when:

- containment queries are frequent;
- key existence queries are frequent;
- JSONB data is part of a stable access pattern.

Example:

```sql
CREATE INDEX idx_world_events_state_gin
ON world_events
USING GIN (state_jsonb jsonb_path_ops);
```

---

## 24. `jsonb_path_ops` vs Default GIN

Use:

```text
jsonb_path_ops
```

when most queries are containment:

```sql
state_jsonb @> '{"weather":"storm"}'
```

Use default GIN when key and operator variety is broader.

This choice must follow actual query patterns.

---

## 25. Expression Indexes for JSONB

Frequently queried stable JSONB keys should be promoted to columns.

Until promotion, expression indexes may be used.

Example:

```sql
CREATE INDEX idx_item_instances_state_magic_level
ON item_instances (
  ((state_jsonb ->> 'magic_level')::integer)
);
```

If this query becomes core business logic, convert the value into a relational column.

---

## 26. Text Search Indexes

For PostgreSQL full-text search:

```sql
CREATE INDEX idx_story_summaries_fts
ON story_summaries
USING GIN (
  to_tsvector('simple', coalesce(summary_text, ''))
);
```

Use full-text search for lexical matching.

Use pgvector for semantic matching.

The two may be combined later through hybrid retrieval.

---

## 27. pgvector Index Strategy

### Initial Scale

Use exact vector search without approximate index.

Reason:

- simplest;
- highest recall;
- easier evaluation;
- likely sufficient at low volume.

### Growth Stage

Default approximate preference:

```text
HNSW
```

Example:

```sql
CREATE INDEX idx_embeddings_hnsw_cosine
ON embeddings
USING hnsw (embedding vector_cosine_ops);
```

---

## 28. HNSW vs IVFFlat

### HNSW

Advantages:

- strong retrieval quality;
- no training step;
- good query latency;
- easier incremental inserts.

Costs:

- larger index;
- slower builds;
- higher write overhead.

### IVFFlat

Advantages:

- lower memory in some cases;
- effective for large stable datasets.

Costs:

- requires suitable list configuration;
- sensitive to training/data distribution;
- weaker behavior at small scale.

Default recommendation:

```text
Exact search -> HNSW when needed
```

---

## 29. Vector Filter Strategy

Relational filters must remain selective.

Recommended supporting indexes:

```sql
CREATE INDEX idx_semantic_sources_world_type_status
ON semantic_sources (
  world_id,
  source_type,
  status
);

CREATE INDEX idx_semantic_sources_character_status
ON semantic_sources (
  character_id,
  status
)
WHERE character_id IS NOT NULL;
```

Vector search performance depends on both vector index and filter selectivity.

---

## 30. BRIN Indexes

Use BRIN for very large append-only chronological tables.

Candidates:

- `domain_events`
- `message_delivery_attempts`
- `state_transitions`
- `emotion_history`
- `audit_logs`

Example:

```sql
CREATE INDEX idx_domain_events_occurred_brin
ON domain_events
USING BRIN (occurred_at);
```

BRIN is compact but less selective than B-tree.

It complements, not replaces, key B-tree indexes.

---

## 31. Covering Indexes

Use `INCLUDE` for frequently returned non-filter columns.

Example:

```sql
CREATE INDEX idx_story_sessions_child_status_cover
ON story_sessions (
  child_profile_id,
  status,
  updated_at DESC
)
INCLUDE (
  current_scene_id,
  story_version_id
);
```

Use only when it measurably reduces heap reads.

---

## 32. Indexes for Optimistic Concurrency

Primary key lookup plus version check usually uses the PK index.

Example:

```sql
UPDATE story_sessions
SET version = version + 1
WHERE id = ?
  AND version = ?;
```

A separate `(id, version)` index is usually unnecessary because `id` is unique.

---

## 33. Indexes for Row Locking

Queries using:

```sql
SELECT ... FOR UPDATE
```

must locate rows through narrow indexed predicates.

Examples:

- PK;
- unique idempotency key;
- unique item instance ID;
- aggregate identity.

Lock queries must not scan broad tables.

---

## 34. Partition-Aware Indexing

If a table is partitioned:

- define local indexes on partitions;
- preserve equivalent access paths across partitions;
- avoid assumptions that one parent index covers all practical needs;
- monitor index count growth.

Likely partition candidates:

```text
domain_events
audit_logs
message_delivery_attempts
state_transitions
emotion_history
```

Partitioning itself will be finalized in the physical schema step.

---

## 35. Index Naming Convention

Canonical format:

```text
idx_<table>_<columns_or_purpose>
uq_<table>_<columns_or_purpose>
```

Examples:

```text
idx_world_events_world_status_time
uq_choice_selections_session_point
idx_outbox_poll
```

Names should describe purpose, not internal ticket numbers.

---

## 36. Avoiding Duplicate Indexes

Before adding an index, check whether another index already covers the same leftmost prefix.

Example:

```text
idx_a_b_c (a, b, c)
```

may already cover:

```text
(a)
(a, b)
```

Do not create redundant indexes without measured benefit.

---

## 37. Over-Indexing Risks

Every index adds:

- insert cost;
- update cost;
- delete cost;
- WAL volume;
- storage usage;
- vacuum work;
- migration time;
- cache pressure.

High-write tables must remain conservative.

---

## 38. Index Fillfactor

Use default fillfactor unless measurements justify change.

Possible candidates for lower fillfactor:

- frequently updated relationship rows;
- emotional state rows;
- hot queue rows.

Do not tune fillfactor globally.

---

## 39. Concurrent Index Creation

Production index creation should prefer:

```sql
CREATE INDEX CONCURRENTLY
```

when table locking would be harmful.

Note:

- cannot run inside a normal transaction block;
- migration tooling must support this explicitly;
- failure cleanup must be handled.

---

## 40. Index Removal

An index may be removed only after confirming:

- no constraint depends on it;
- no critical query depends on it;
- usage is low across a meaningful window;
- sequential scan behavior remains acceptable;
- rollback plan exists.

Use:

```sql
DROP INDEX CONCURRENTLY
```

in production where appropriate.

---

## 41. Index Observability

Monitor:

```text
index scans
tuple reads
tuple fetches
index size
table size
unused indexes
duplicate indexes
cache hit ratio
write amplification
vacuum behavior
```

Useful PostgreSQL views:

```text
pg_stat_user_indexes
pg_statio_user_indexes
pg_stat_statements
pg_indexes
```

---

## 42. Slow Query Review

Slow query review process:

1. capture normalized query;
2. inspect frequency and total time;
3. run `EXPLAIN (ANALYZE, BUFFERS)`;
4. verify row estimate accuracy;
5. review existing indexes;
6. consider query rewrite;
7. consider index;
8. test write impact;
9. deploy safely;
10. verify production effect.

Index creation is not the automatic first response to every slow query.

---

## 43. Statistics and ANALYZE

PostgreSQL planner quality depends on statistics.

Recommended:

- autovacuum and autoanalyze enabled;
- increase statistics target selectively for skewed columns;
- analyze after large backfills;
- analyze after major index migration;
- monitor stale estimates.

Candidates for higher statistics:

```text
status
event_type
source_type
visibility_scope
destination
```

---

## 44. Query Pattern Registry

Each critical index should map to a documented access pattern.

Suggested registry fields:

```text
index_name
table_name
query_pattern
owner_module
criticality
introduced_in_migration
last_reviewed_at
status
```

This may live in documentation rather than a runtime table.

---

## 45. MVP Index Set

Required at MVP:

- all primary keys;
- FK indexes for main relationships;
- choice uniqueness;
- item instance uniqueness;
- active story session lookups;
- outbox polling;
- scheduled effect polling;
- world event lookups;
- memory character/time lookups;
- generation request status;
- semantic source filters;
- exact pgvector search initially.

Avoid introducing dozens of speculative JSONB and vector indexes in the first release.

---

## 46. Critical Constraints

1. Every index must support a known purpose.
2. Primary keys use their automatic unique indexes.
3. Frequently used foreign keys are indexed.
4. Composite column order follows equality, range and sort patterns.
5. Unique indexes enforce business invariants.
6. Partial indexes are preferred for active hot subsets.
7. JSONB GIN indexes are selective and query-driven.
8. Stable hot JSONB keys should be promoted to columns.
9. Exact vector search is the initial default.
10. HNSW is the preferred approximate vector index when scale requires it.
11. Queue polling uses partial indexes.
12. Large append-only time tables may use BRIN.
13. Duplicate and overlapping indexes are avoided.
14. Production index builds use concurrent creation where needed.
15. Indexes are reviewed through real query telemetry.
16. Over-indexing is treated as a performance defect.
17. Index removal requires usage evidence and rollback planning.
18. Partitioned tables require consistent local index strategy.

---

## 47. Decisions Finalized

1. B-tree is the default index type.
2. UUIDv7 is preferred for locality.
3. PostgreSQL FK columns are explicitly indexed when used.
4. Partial indexes support active-row and queue access patterns.
5. Composite indexes are based on real access paths.
6. Unique indexes are part of the domain integrity model.
7. JSONB indexing remains selective.
8. Full-text and semantic search remain separate but complementary.
9. Exact pgvector search is used first.
10. HNSW is the preferred scale-up path.
11. BRIN supports very large chronological history tables.
12. Covering indexes require measured justification.
13. Query optimization includes query design and statistics, not only indexes.
14. Production index lifecycle is observable and reversible.
15. The initial release uses a conservative index set.

---

## 48. Next Artifact

**Versioning and Schema Evolution Strategy v1**

The next document will define:

- schema versioning;
- row versioning;
- content versioning;
- story version immutability;
- event schema evolution;
- JSONB schema versions;
- backward compatibility;
- expand-and-contract migrations;
- zero-downtime change strategy;
- deprecation rules.
