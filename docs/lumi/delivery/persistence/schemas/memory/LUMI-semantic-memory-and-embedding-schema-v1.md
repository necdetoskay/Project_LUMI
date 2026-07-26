
# Project LUMI — Semantic Memory & Embedding Schema v1

## Status
Accepted

## Purpose

Defines the persistence model for semantic retrieval used by LUMI.

This layer stores searchable representations of stories, memories and world knowledge.
Relational data remains the authoritative source.

## Aggregate Root

SemanticDocument

Supporting entities:

- DocumentChunk
- EmbeddingVector
- EmbeddingJob
- SemanticCache

## semantic_documents

Fields:

- id
- world_id
- source_type
- source_id
- title
- language
- schema_version
- lifecycle_status
- created_at
- updated_at
- version

## Source Types

- story
- memory
- world_event
- character
- location
- item
- lore
- summary

## document_chunks

Stores normalized text fragments.

Fields:

- id
- document_id
- sequence_number
- text
- token_count
- checksum
- created_at

Chunks are immutable.

## embedding_vectors

Fields:

- id
- chunk_id
- embedding_provider
- embedding_model
- dimensions
- vector_reference
- embedding_version
- created_at

Vector storage may use PostgreSQL pgvector or an external vector database.

## Embedding Jobs

Tracks indexing operations.

Status:

- queued
- processing
- completed
- failed

Metadata:

- provider
- model
- started_at
- completed_at
- retry_count

## Semantic Cache

Stores reusable retrieval results.

Fields:

- cache_key
- request_hash
- response_hash
- expires_at
- created_at

Expired cache entries are regenerated.

## Retrieval Rules

Search flow:

1. semantic search
2. ranking
3. metadata filtering
4. context assembly
5. LLM prompt construction

Only relevant chunks are returned.

## Re-indexing

Triggered when:

- source changes
- embedding model changes
- schema version changes

Old vectors remain until replacement succeeds.

## Lifecycle

draft
→ indexed
→ archived

Archived documents are excluded from retrieval.

## Security

- Child scoped retrieval.
- Parent authorization respected.
- Embeddings never replace relational truth.
- Hidden documents are not searchable.

## Indexes

- (world_id, source_type)
- (source_id)
- (lifecycle_status)

## Repository

- createDocument
- createChunks
- createEmbedding
- rebuildEmbedding
- searchSemantic
- archiveDocument

## Domain Events

- DocumentCreated
- ChunkCreated
- EmbeddingGenerated
- EmbeddingRebuilt
- DocumentArchived

## Acceptance Criteria

- Documents are chunked.
- Embeddings are versioned.
- Re-indexing is supported.
- Cache is reusable.
- Retrieval respects ownership.

## Decisions Finalized

1. Relational database is authoritative.
2. Embeddings are secondary representations.
3. Chunks are immutable.
4. Re-indexing is version driven.
5. Semantic cache is persistent.

## Next Artifact

**Audit, Outbox & Integration Schema v1**
