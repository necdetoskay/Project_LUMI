# ADR-001 — Primary Database Architecture for Project LUMI

- **Status:** Accepted
- **Decision Date:** 2026-07-25
- **Decision Owner:** Project LUMI
- **Scope:** Primary operational database and supporting persistence components
- **Review Policy:** Revisit only when an explicit review trigger in this ADR occurs

---

## 1. Decision

Project LUMI will use **PostgreSQL as its primary system of record**.

The persistence architecture will follow this model:

- **PostgreSQL:** authoritative operational data store
- **JSONB:** flexible, evolving and AI-generated attributes
- **pgvector:** embeddings and semantic similarity where required
- **Redis:** non-authoritative cache, rate limiting, short-lived locks and job coordination
- **S3-compatible object storage:** images, audio, maps and generated media
- **PostgreSQL event/outbox tables:** reliable domain events and integration delivery

MongoDB, CockroachDB, Neo4j, SurrealDB and a dedicated event store are **not selected as the primary database**.

This is a deliberate architecture decision, not a temporary preference.

---

## 2. Context

LUMI is a living-universe storytelling and simulation platform. Its persistence layer must support:

- users and child profiles;
- worlds, regions, locations and settlements;
- characters, NPCs, families and social relationships;
- stories, sessions, choices and consequences;
- inventories, items and ownership;
- NPC memories, goals, emotions and traits;
- world events and background simulation;
- time progression and state transitions;
- AI-generated content and evolving metadata;
- semantic retrieval and contextual similarity;
- auditability, consistency and recovery.

The system contains flexible data, but it is not primarily a collection of independent documents. Most important entities participate in multiple durable relationships.

---

## 3. Architecture Validation Scenarios

The decision was evaluated against representative LUMI workloads.

### Scenario A — Story choice transaction

When a child makes a choice, the system may need to atomically:

1. record the choice;
2. update the story session;
3. add or remove an inventory item;
4. modify one or more relationships;
5. create character memories;
6. append domain events;
7. update world state.

These changes must either succeed together or fail together.

**Result:** PostgreSQL is the strongest natural fit.

### Scenario B — Context Builder query

The Context Builder may request:

- the current character;
- active companions;
- nearby NPCs;
- relevant relationships;
- unresolved promises;
- recent memories;
- current regional events;
- inventory items relevant to the situation;
- semantically similar prior events.

This is a relational query enriched by JSON and vector search.

**Result:** PostgreSQL + JSONB + pgvector is a better fit than a document-first model.

### Scenario C — NPC social graph

An NPC can belong to:

- a family;
- a settlement;
- one or more groups;
- friendship and rivalry networks;
- ongoing story arcs;
- event impact groups.

The graph is important, but the product also requires conventional transactions, ownership, sessions and reporting.

**Result:** A graph database may become a derived read model later, but should not be the primary system of record.

### Scenario D — Flexible simulation state

Traits, emotional vectors, effect vectors, simulation parameters and AI-generated metadata may evolve during development.

**Result:** PostgreSQL JSONB provides sufficient schema flexibility without giving up relational integrity.

### Scenario E — Event history

LUMI requires an append-oriented history of meaningful domain changes but does not currently require full event sourcing.

**Result:** PostgreSQL event and outbox tables are sufficient. Full event sourcing would add unnecessary reconstruction, versioning and operational complexity.

### Scenario F — Semantic memory

Memories and events may require embedding-based similarity search.

**Result:** pgvector allows the first implementation to remain in the primary database. A dedicated vector database is only justified after measured scale or latency requires it.

---

## 4. Alternatives Considered

### 4.1 MongoDB

**Strengths**

- Natural document representation
- Flexible schema
- Convenient nested data
- Good fit for independent aggregates
- Mature managed hosting options

**Reasons not selected**

- LUMI has extensive many-to-many and cross-aggregate relationships.
- Embedding large histories and relationships would create growing documents, duplication and update complexity.
- Separating those relationships into collections would reintroduce relational behavior without native foreign-key enforcement.
- Multi-document transactions exist, but frequent dependence on them indicates that the workload is not naturally document-oriented.
- Reporting and cross-domain consistency would require more application-level discipline.

**Verdict:** Valid technology, but not the best primary model for LUMI.

### 4.2 CockroachDB

**Strengths**

- Distributed SQL
- Strong consistency
- Horizontal scaling
- Multi-region capabilities
- PostgreSQL protocol compatibility

**Reasons not selected**

- LUMI does not currently require active-active multi-region writes.
- Operational and transaction-retry complexity would be introduced before it provides product value.
- PostgreSQL compatibility is substantial but not identical to PostgreSQL.
- Premature distributed-database adoption would increase cost and reduce simplicity.

**Verdict:** Reconsider only if multi-region availability becomes a proven requirement.

### 4.3 Neo4j or another graph database

**Strengths**

- Excellent relationship traversal
- Natural social and influence graph queries

**Reasons not selected**

- It is not the best single store for users, story sessions, inventories, transactional updates and operational reporting.
- It would introduce polyglot persistence too early.
- PostgreSQL can model the initial graph using relationship tables and recursive queries.

**Verdict:** Potential future derived read model, not primary storage.

### 4.4 SurrealDB or another multi-model database

**Strengths**

- Attractive combined document, graph and relational concepts
- Flexible developer model

**Reasons not selected**

- Smaller ecosystem and operational knowledge base
- Higher long-term product and migration risk
- Less mature tooling and hosting support than PostgreSQL
- The expected benefits do not outweigh platform risk for LUMI

**Verdict:** Rejected for the primary production store.

### 4.5 Full event sourcing with a dedicated event store

**Strengths**

- Complete event history
- State reconstruction
- Strong auditability

**Reasons not selected**

- Considerable complexity in event versioning, projections, replay and debugging
- LUMI needs event history, but not every state mutation must be reconstructed exclusively from events
- PostgreSQL can store append-only domain events alongside current state

**Verdict:** Use event logging and transactional outbox, not full event sourcing.

---

## 5. Decision Matrix

Scoring: 1 = weak, 5 = excellent. Weighted totals use the importance of each criterion for LUMI.

| Criterion | Weight | PostgreSQL | MongoDB | CockroachDB | Neo4j | SurrealDB |
|---|---:|---:|---:|---:|---:|---:|
| Relational integrity | 20 | 5 | 2 | 5 | 3 | 3 |
| Complex cross-domain queries | 15 | 5 | 2 | 5 | 4 | 3 |
| Transaction reliability | 15 | 5 | 3 | 5 | 3 | 3 |
| Flexible evolving data | 10 | 4 | 5 | 4 | 3 | 5 |
| AI/vector integration | 10 | 4 | 4 | 3 | 3 | 3 |
| Operational simplicity | 10 | 5 | 4 | 2 | 3 | 2 |
| Ecosystem and tooling | 10 | 5 | 5 | 3 | 4 | 2 |
| Hosting portability | 5 | 5 | 4 | 3 | 3 | 2 |
| Long-term migration risk | 5 | 5 | 4 | 3 | 3 | 2 |
| **Weighted result / 500** | **100** | **480** | **320** | **410** | **330** | **300** |
| **Normalized result / 100** |  | **96** | **64** | **82** | **66** | **60** |

PostgreSQL wins because it satisfies the highest-priority requirements without requiring premature polyglot persistence or distributed-database complexity.

---

## 6. PostgreSQL Data Modeling Rules

### 6.1 Use normal columns for stable, query-critical data

Examples:

- identifiers;
- foreign keys;
- ownership;
- names and entity types;
- lifecycle status;
- timestamps;
- ordering;
- visibility;
- version numbers;
- commonly filtered values.

### 6.2 Use JSONB for flexible but bounded data

Appropriate examples:

- personality vectors;
- emotional state dimensions;
- influence vectors;
- simulation tuning parameters;
- AI provider metadata;
- generation provenance;
- optional age-specific presentation settings;
- evolving content attributes.

JSONB must not become a container for an entire domain entity merely to avoid schema design.

### 6.3 Promote JSONB fields to columns when necessary

A JSONB property must be promoted to a normal column when it:

- becomes required for integrity;
- is frequently filtered, joined or sorted;
- needs a foreign key;
- needs uniqueness;
- is used in financial, security or authorization logic;
- becomes stable across the domain model.

### 6.4 Use explicit relationship tables

Examples:

- `character_relationships`
- `character_group_memberships`
- `story_participants`
- `event_impacts`
- `inventory_entries`
- `memory_entity_links`

Relationships must not be duplicated inside multiple JSON documents as the sole source of truth.

### 6.5 Use events without making events the only state

Store:

- current authoritative state in domain tables;
- important historical transitions in append-only event tables;
- integration events in a transactional outbox.

### 6.6 Keep binaries outside PostgreSQL

Images, audio and generated maps will be stored in object storage. PostgreSQL stores metadata, ownership, checksums and object keys.

---

## 7. Initial Persistence Topology

```text
Application Services
        |
        v
PostgreSQL — authoritative source of truth
  ├── relational domain tables
  ├── JSONB flexible attributes
  ├── event history
  ├── transactional outbox
  ├── full-text indexes
  └── pgvector embeddings

Redis — disposable infrastructure
  ├── cache
  ├── rate limits
  ├── distributed locks
  ├── job coordination
  └── short-lived simulation snapshots

S3/MinIO-compatible storage
  ├── images
  ├── audio
  ├── maps
  └── generated media
```

Redis and object storage are not authoritative substitutes for PostgreSQL.

---

## 8. ORM and Migration Direction

The database schema, constraints and migrations must remain explicit and reviewable.

Recommended direction for the TypeScript stack:

- PostgreSQL-native migrations;
- an ORM or typed query builder that does not hide SQL capabilities;
- migration files committed to the repository;
- forward migration and tested restore procedures;
- database constraints in addition to application validation.

The final ORM choice will be recorded separately and must not change this database decision.

---

## 9. Consequences

### Positive

- Strong referential integrity
- Reliable multi-entity transactions
- One initial source of truth
- Flexible JSONB support
- Integrated semantic search path
- Easier reporting and administration
- Mature backup, restore and migration ecosystem
- Lower early operational complexity
- Reduced risk of later relational migration

### Negative

- Schema discipline and migrations are required.
- Poorly designed JSONB can become difficult to maintain.
- Very large vector workloads may eventually require a specialized store.
- Very deep graph traversals may eventually justify a graph projection.
- Extreme global scale may eventually require distributed SQL or partitioning.

These costs are accepted.

---

## 10. Rejected Architecture Patterns

The following are prohibited unless a new ADR supersedes this decision:

- using MongoDB as the default primary store;
- storing complete worlds as uncontrolled giant JSON documents;
- using JSONB to avoid all schema migrations;
- storing authoritative inventory or ownership only in cache;
- adding a second operational database without measured need;
- implementing full event sourcing by default;
- storing generated media directly as large database blobs;
- selecting a dedicated vector database before pgvector is measured.

---

## 11. Review Triggers

This ADR remains accepted unless one or more of these measurable conditions occurs:

1. A single PostgreSQL deployment cannot meet validated availability requirements.
2. Active-active writes across multiple geographic regions become mandatory.
3. Semantic search exceeds pgvector’s measured latency or scale targets after indexing and query optimization.
4. Graph traversals become a dominant workload and cannot meet performance targets using PostgreSQL.
5. Event replay becomes a formal product requirement rather than an audit/debugging feature.
6. A domain develops an independently scalable workload with clearly different storage requirements.
7. Regulatory or hosting constraints require a different persistence platform.

A trigger starts a new ADR. It does not automatically replace PostgreSQL.

---

## 12. Final Decision Statement

**PostgreSQL is accepted as the primary and authoritative database for Project LUMI.**

The selected design is:

> **Relational Core + JSONB Flexibility + PostgreSQL Event History + Transactional Outbox + pgvector**

Redis and S3-compatible object storage are supporting infrastructure. Additional databases will only be introduced after measurable requirements demonstrate that PostgreSQL is insufficient for a specific workload.

This decision is now considered **final for the initial LUMI architecture** and may only be changed through a superseding ADR.
