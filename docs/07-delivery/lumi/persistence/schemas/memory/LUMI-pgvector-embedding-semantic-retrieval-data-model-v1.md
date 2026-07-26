# Project LUMI — pgvector, Embedding and Semantic Retrieval Data Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Database Domain Map, Logical Data Model v1, NPC Memory Model v1, Domain Event & Outbox Model v1
- **Primary Database:** PostgreSQL + pgvector

---

## 1. Purpose

This document defines the canonical data model for:

- embedding profiles;
- vector storage;
- semantic source records;
- chunking;
- source versioning;
- memory embeddings;
- story, event and dialogue embeddings;
- semantic retrieval;
- filter strategy;
- re-embedding;
- model migration;
- embedding lifecycle;
- retrieval observability.

The goal is to provide relevant context to the story and simulation engines without turning pgvector into an authoritative data store.

---

## 2. Core Principle

Project LUMI uses pgvector as a semantic retrieval layer.

It does not use pgvector as the source of truth.

Authoritative records remain in normalized domain tables.

The semantic layer stores:

- vector representation;
- searchable text;
- source identity;
- source version;
- embedding model metadata;
- retrieval filters.

---

## 3. What Should Be Embedded

Recommended semantic sources:

- character memories;
- story scenes;
- story summaries;
- dialogue summaries;
- world events;
- location descriptions;
- character profiles;
- relationship summaries;
- unresolved story hooks;
- world return summaries;
- generated lore;
- item descriptions when narratively meaningful.

Not every row in the database should be embedded.

---

## 4. What Should Not Be Embedded

Do not embed by default:

- raw audit logs;
- passwords or credentials;
- private chain-of-thought;
- low-value operational logs;
- duplicated transient data;
- large binary media;
- purely numeric counters;
- system configuration without semantic value;
- sensitive child data not needed for retrieval.

---

## 5. Embedding Profile

### Table: `embedding_profiles`

Recommended fields:

```text
id UUID PK
code TEXT NOT NULL UNIQUE
name TEXT NOT NULL
provider TEXT NOT NULL
model_name TEXT NOT NULL
model_version TEXT NULL
vector_dimension INTEGER NOT NULL
distance_metric TEXT NOT NULL
normalization_strategy TEXT NULL
chunking_strategy TEXT NOT NULL
max_input_tokens INTEGER NULL
status TEXT NOT NULL
is_default BOOLEAN NOT NULL DEFAULT false
configuration_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Canonical distance metrics:

```text
cosine
inner_product
euclidean
```

Default recommendation:

```text
cosine
```

---

## 6. Semantic Source Registry

### Table: `semantic_sources`

Recommended fields:

```text
id UUID PK
source_type TEXT NOT NULL
source_id UUID NOT NULL
source_version INTEGER NOT NULL
world_id UUID NULL
child_profile_id UUID NULL
character_id UUID NULL
story_session_id UUID NULL
visibility_scope TEXT NOT NULL
language_code TEXT NOT NULL
content_hash TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
UNIQUE (source_type, source_id, source_version)
```

### Purpose

This table registers what domain object a semantic record came from.

---

## 7. Semantic Document

### Table: `semantic_documents`

Recommended fields:

```text
id UUID PK
semantic_source_id UUID NOT NULL
document_type TEXT NOT NULL
title TEXT NULL
content_text TEXT NOT NULL
summary_text TEXT NULL
metadata_jsonb JSONB NULL
token_count INTEGER NULL
content_hash TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Examples:

```text
memory
story_scene
story_summary
world_event
dialogue_summary
character_profile
location_description
```

---

## 8. Chunking Model

Long semantic documents are split into chunks.

### Table: `semantic_chunks`

Recommended fields:

```text
id UUID PK
semantic_document_id UUID NOT NULL
chunk_index INTEGER NOT NULL
content_text TEXT NOT NULL
token_count INTEGER NULL
start_offset INTEGER NULL
end_offset INTEGER NULL
section_key TEXT NULL
context_prefix TEXT NULL
content_hash TEXT NOT NULL
metadata_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
UNIQUE (semantic_document_id, chunk_index)
```

### Rule

Chunks must remain traceable to the original semantic document.

---

## 9. Embedding Record

### Table: `embeddings`

Recommended fields:

```text
id UUID PK
semantic_chunk_id UUID NOT NULL
embedding_profile_id UUID NOT NULL
embedding VECTOR(<dimension>) NOT NULL
source_content_hash TEXT NOT NULL
embedding_model_version TEXT NULL
status TEXT NOT NULL
generated_at TIMESTAMPTZ NOT NULL
error_code TEXT NULL
error_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
UNIQUE (semantic_chunk_id, embedding_profile_id)
```

The actual vector dimension must match the embedding profile.

---

## 10. Vector Dimension Strategy

Different models may produce different dimensions.

Recommended approach:

- one active production dimension per embedding table;
- separate physical table or partition when dimension changes incompatibly;
- do not mix incompatible vector dimensions in one column.

Possible physical tables:

```text
embeddings_1536
embeddings_3072
embeddings_768
```

or a controlled migration to a new canonical table.

---

## 11. Source Versioning

Every embedding is tied to:

```text
source_version
content_hash
embedding_profile
```

If source content changes:

- increment source version;
- create new semantic document/chunks;
- create new embeddings;
- mark old semantic source version inactive or superseded.

Do not silently overwrite old embeddings without traceability.

---

## 12. Embedding Statuses

Canonical values:

```text
pending
processing
ready
failed
superseded
archived
```

Only `ready` embeddings are eligible for normal retrieval.

---

## 13. Memory Embedding Model

Character memories are one of the highest-value semantic sources.

Recommended source filters:

```text
character_id
world_id
memory_type
importance
occurred_world_time
visibility_scope
active
```

The semantic content should include:

- concise memory statement;
- involved characters;
- location;
- event context;
- emotional meaning;
- unresolved consequence.

It should not include raw hidden model reasoning.

---

## 14. Story Embeddings

Recommended story sources:

- published scene text;
- chapter summaries;
- branch summaries;
- prior session summaries;
- unresolved narrative hooks;
- important choices.

Do not embed every transient generation draft.

Only validated or committed content should enter the semantic index.

---

## 15. World Event Embeddings

World event semantic text may include:

- event title;
- event summary;
- location;
- participants;
- outcome;
- unresolved impact;
- visibility scope.

This supports queries such as:

```text
What happened recently near the forest?
Which events involve the fox?
What unresolved danger exists in this region?
```

---

## 16. Dialogue Embeddings

Raw dialogue should not always be embedded line by line.

Preferred:

- summarize meaningful exchange;
- extract promises, secrets, conflicts and requests;
- embed the summary;
- optionally retain selected verbatim lines when narratively important.

This reduces noise and retrieval cost.

---

## 17. Character Profile Embeddings

Character semantic profile may include:

- identity;
- traits;
- goals;
- relationships;
- fears;
- preferences;
- current narrative role;
- recent important changes.

Frequently changing numeric vectors should not be dumped raw into text.

Use a controlled textual summary.

---

## 18. Retrieval Request Model

### Table: `semantic_retrieval_requests`

Recommended fields:

```text
id UUID PK
request_type TEXT NOT NULL
query_text TEXT NOT NULL
query_hash TEXT NOT NULL
embedding_profile_id UUID NOT NULL
world_id UUID NULL
child_profile_id UUID NULL
character_id UUID NULL
story_session_id UUID NULL
filters_jsonb JSONB NULL
top_k INTEGER NOT NULL
similarity_threshold NUMERIC NULL
token_budget INTEGER NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
completed_at TIMESTAMPTZ NULL
duration_ms INTEGER NULL
```

This table is optional for MVP but useful for observability and tuning.

---

## 19. Retrieval Result Model

### Table: `semantic_retrieval_results`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PK
retrieval_request_id UUID NOT NULL
semantic_chunk_id UUID NOT NULL
rank INTEGER NOT NULL
similarity_score NUMERIC NOT NULL
relevance_score NUMERIC NULL
selected_for_context BOOLEAN NOT NULL
selection_reason_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
UNIQUE (retrieval_request_id, rank)
```

---

## 20. Retrieval Pipeline

Recommended pipeline:

```text
1. Build query text
2. Create query embedding
3. Apply mandatory relational filters
4. Run vector similarity search
5. Re-rank using business relevance
6. Apply token budget
7. Return context package
```

---

## 21. Mandatory Relational Filters

Vector similarity alone is not enough.

Recommended filters:

- same world;
- allowed visibility scope;
- relevant child profile;
- relevant character;
- active status;
- source type;
- time range;
- story session;
- region/location;
- memory importance;
- parental content rules.

### Rule

Authorization filtering must happen before or during vector search, not only after retrieval.

---

## 22. Combined Relevance Score

Suggested formula:

```text
final_relevance =
  semantic_similarity
+ importance_weight
+ recency_weight
+ relationship_weight
+ location_weight
+ active_goal_weight
+ unresolved_hook_weight
- redundancy_penalty
```

Weights are configurable.

The final score is not stored as permanent truth.

---

## 23. Similarity Threshold

Top-K alone may return irrelevant results.

Use both:

```text
top_k
similarity_threshold
```

If fewer than K results exceed the threshold, return fewer results.

Do not fill context with weak matches.

---

## 24. Token Budget

Retrieval must obey the context token budget.

Recommended sequence:

1. sort by final relevance;
2. remove duplicates;
3. prefer diversity across source types;
4. include essential pinned context;
5. stop when token budget is reached.

---

## 25. Diversity and Redundancy Control

Avoid returning five near-identical memories.

Possible strategy:

- one result per memory cluster;
- maximum per source type;
- maximum per character;
- maximum per event chain;
- semantic similarity deduplication.

This improves narrative variety.

---

## 26. Pinned Context

Some context is mandatory regardless of vector score.

Examples:

- current story state;
- current child choice;
- active safety rules;
- current location;
- active story version;
- required inventory facts.

Pinned context is added separately from semantic retrieval.

---

## 27. Context Package

### Table: `context_packages`

Recommended fields:

```text
id UUID PK
context_type TEXT NOT NULL
world_id UUID NULL
child_profile_id UUID NULL
story_session_id UUID NULL
character_id UUID NULL
retrieval_request_id UUID NULL
token_budget INTEGER NOT NULL
actual_token_count INTEGER NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
expires_at TIMESTAMPTZ NULL
metadata_jsonb JSONB NULL
```

### Table: `context_package_items`

```text
id UUID PK
context_package_id UUID NOT NULL
source_type TEXT NOT NULL
source_id UUID NOT NULL
semantic_chunk_id UUID NULL
item_order INTEGER NOT NULL
selection_type TEXT NOT NULL
content_text TEXT NOT NULL
token_count INTEGER NULL
relevance_score NUMERIC NULL
created_at TIMESTAMPTZ NOT NULL
```

---

## 28. Context Selection Types

Canonical values:

```text
pinned
semantic
recent
rule_based
manual
fallback
```

This helps explain why a piece of context was included.

---

## 29. Embedding Generation Workflow

Recommended asynchronous workflow:

```text
domain source changed
-> domain event
-> outbox message
-> embedding worker
-> semantic document/chunks
-> embedding record
-> ready
```

No external embedding API call occurs inside the originating transaction.

---

## 30. Idempotency

Embedding generation must be idempotent.

Recommended key:

```text
semantic_chunk_id + embedding_profile_id + content_hash
```

If the same content is requested again with the same profile:

- reuse existing ready embedding;
- do not regenerate unnecessarily.

---

## 31. Re-Embedding

Re-embedding is required when:

- model changes;
- model version changes;
- vector dimension changes;
- chunking strategy changes;
- source text changes;
- normalization strategy changes;
- quality policy changes.

Re-embedding creates new rows or a new physical vector store.

Old embeddings remain available until cutover.

---

## 32. Model Migration

Recommended migration strategy:

1. create new embedding profile;
2. generate embeddings in parallel;
3. evaluate retrieval quality;
4. switch default profile;
5. monitor;
6. archive old profile after safe period.

Avoid in-place destructive migration.

---

## 33. Dual-Profile Retrieval

During migration, the system may query both old and new profiles.

Results may be:

- compared;
- logged;
- evaluated offline;
- used for canary traffic.

Do not merge scores from incompatible models without normalization.

---

## 34. Index Strategy

Recommended pgvector index depends on scale.

### Small Dataset

Use exact search initially.

### Larger Dataset

Use one of:

```text
HNSW
IVFFlat
```

Default preference for general retrieval quality:

```text
HNSW
```

Index choice will be finalized in the dedicated index strategy step.

---

## 35. Example Query Pattern

```sql
SELECT
    e.id,
    sc.content_text,
    1 - (e.embedding <=> :query_vector) AS similarity
FROM embeddings e
JOIN semantic_chunks sc
  ON sc.id = e.semantic_chunk_id
JOIN semantic_documents sd
  ON sd.id = sc.semantic_document_id
JOIN semantic_sources ss
  ON ss.id = sd.semantic_source_id
WHERE
    e.status = 'ready'
    AND ss.world_id = :world_id
    AND ss.visibility_scope IN (:allowed_scopes)
ORDER BY e.embedding <=> :query_vector
LIMIT :top_k;
```

---

## 36. Security and Isolation

Semantic retrieval must preserve ownership and visibility boundaries.

Never rely on semantic similarity to enforce access.

Required filters may include:

```text
world_id
child_profile_id
visibility_scope
owner path
content policy
```

Cross-child semantic leakage is prohibited.

---

## 37. Language Strategy

Semantic documents include:

```text
language_code
```

Possible approaches:

- multilingual embedding model;
- language-specific profiles;
- translated semantic summaries.

Default recommendation:

Use a multilingual embedding model unless evaluation shows unacceptable quality.

---

## 38. Freshness

Some semantic records become stale quickly.

Recommended fields:

```text
source_version
content_hash
status
updated_at
```

Retrieval must ignore superseded semantic sources.

For current-state summaries, stale embeddings should be replaced promptly.

---

## 39. Memory Decay and Retrieval

Memory decay affects business relevance, not vector similarity.

Recommended:

```text
semantic similarity
x
memory accessibility factor
```

Accessibility may include:

- importance;
- recency;
- reinforcement;
- emotional intensity;
- active goal relevance.

The vector itself should not be modified because importance decayed.

---

## 40. Retrieval Explainability

Store compact selection reasons such as:

```json
{
  "high_similarity": true,
  "same_character": true,
  "recent": false,
  "important_memory": true
}
```

Do not store hidden chain-of-thought.

---

## 41. Caching

Query embedding and retrieval result caching may use Redis.

Possible cache key:

```text
query_hash
embedding_profile
filter_hash
source_version_watermark
```

Cache must be invalidated when relevant semantic sources change.

Redis is not authoritative.

---

## 42. Failure Handling

Embedding generation failures must not block core story transactions.

Recommended behavior:

- mark embedding failed;
- retry asynchronously;
- fall back to relational/rule-based context;
- alert only when failure rate or age exceeds threshold.

---

## 43. Observability

Required metrics:

```text
embedding pending count
embedding failure count
average generation latency
retrieval latency
zero-result rate
low-similarity result rate
context token utilization
duplicate result rate
model profile usage
re-embedding progress
```

Quality metrics should include human-evaluated retrieval samples.

---

## 44. Retention

Recommended:

- keep active embeddings;
- keep previous profile during migration;
- archive superseded semantic documents;
- remove obsolete failed attempts after retention period;
- preserve semantic source lineage.

Retention is finalized in the archive and retention step.

---

## 45. MVP Scope

Required:

- `embedding_profiles`
- `semantic_sources`
- `semantic_documents`
- `semantic_chunks`
- `embeddings`
- memory embeddings
- story summary embeddings
- world event embeddings
- relational filters
- top-K and threshold search
- asynchronous generation
- idempotency

Recommended later:

- retrieval request logging;
- retrieval result logging;
- context packages;
- dual-profile evaluation;
- advanced re-ranking;
- automated quality benchmarks.

---

## 46. Critical Constraints

1. pgvector is not authoritative storage.
2. Every embedding has a traceable domain source.
3. Source version and content hash are mandatory.
4. Only ready embeddings are retrieved.
5. Authorization filters are applied before or during search.
6. Vector similarity is combined with business relevance.
7. Top-K does not override similarity threshold.
8. Token budget limits context size.
9. Pinned context is separate from semantic retrieval.
10. Embedding generation is asynchronous and idempotent.
11. Model migrations are non-destructive.
12. Incompatible vector dimensions are not mixed.
13. Stale and superseded embeddings are excluded.
14. Memory decay changes retrieval weight, not the vector.
15. Hidden chain-of-thought is never stored.
16. Cross-child semantic leakage is prohibited.
17. Core story flow continues if embedding generation fails.
18. Redis caching is optional and non-authoritative.

---

## 47. Example Memory Retrieval Scenario

The child meets the fox near the old bridge.

### Query Context

```text
character = fox
location = old bridge
current goal = find safe path
```

### Retrieval Candidates

```text
Memory A:
The child gave the fox a berry.
Similarity: 0.83
Importance: high

Memory B:
The fox heard a storm near the bridge.
Similarity: 0.88
Importance: medium

Memory C:
The fox saw a bird in another region.
Similarity: 0.76
Importance: low
```

### Final Selection

```text
Memory B
Memory A
```

Memory C is excluded because:

- low business relevance;
- wrong location context;
- limited token budget.

---

## 48. Decisions Finalized

1. LUMI uses pgvector as a semantic retrieval layer.
2. Domain tables remain authoritative.
3. Semantic source, document, chunk and embedding are separate records.
4. Embeddings are tied to source version and content hash.
5. Memory, story, event and character summaries are primary semantic sources.
6. Raw low-value or sensitive data is not embedded by default.
7. Retrieval always combines vector search with relational filters.
8. Business relevance may re-rank semantic similarity.
9. Context is constrained by threshold, diversity and token budget.
10. Pinned context is not dependent on vector search.
11. Embedding generation is asynchronous through outbox.
12. Re-embedding uses new profiles and safe cutover.
13. Dimension changes require separate physical handling.
14. Semantic failures do not block core story flow.
15. Retrieval observability and quality evaluation are required.

---

## 49. Next Artifact

**PostgreSQL Index Strategy v1**

The next document will define:

- primary and foreign key indexes;
- partial indexes;
- composite indexes;
- JSONB indexes;
- pgvector indexes;
- uniqueness indexes;
- write/read trade-offs;
- partition-aware indexing;
- slow-query review;
- index lifecycle.
