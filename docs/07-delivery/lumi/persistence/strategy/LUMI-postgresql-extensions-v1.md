
# Project LUMI — PostgreSQL Extensions v1

- Status: Accepted
- Phase: Persistence Implementation

## Purpose
Defines the official PostgreSQL extensions used by LUMI, installation order, governance and usage rules.

## Approved Extensions

### pgcrypto
Purpose:
- UUID generation
- Cryptographic helpers

Status:
Mandatory

---

### pgvector
Purpose:
- Embedding storage
- Semantic similarity search

Status:
Mandatory

Rules:
- Embedding dimension is fixed per model profile.
- Relational filters are applied before vector search.
- HNSW indexes are introduced only after performance validation.

---

### pg_trgm

Purpose:
- Fast fuzzy text search
- Similarity matching

Status:
Optional

Use cases:
- Character search
- Location search
- Administrative tools

---

## Installation Order

1. pgcrypto
2. pgvector
3. pg_trgm (optional)

All extensions are installed through reviewed SQL migrations.

## Migration Policy

- Install extensions before schema creation.
- Extension migrations are immutable.
- Production installation requires compatibility verification.

## Compatibility Rules

The application must validate:

- PostgreSQL version
- Installed extension versions
- Required features available

Startup fails if mandatory extensions are unavailable.

## Usage Guidelines

pgcrypto:
- UUID generation only.

pgvector:
- Semantic retrieval only.
- Never becomes the source of truth.

pg_trgm:
- User-facing fuzzy search.
- Never replaces exact indexed lookups.

## Security

- Only migration role may install extensions.
- Runtime role cannot create or remove extensions.

## Monitoring

Track:
- Extension availability
- Vector index health
- Query latency
- Extension version drift

## Acceptance Checklist

- Extensions installed
- Startup validation implemented
- Migration verified
- Runtime permissions verified
- Monitoring enabled

## Decisions Finalized

1. pgcrypto is mandatory.
2. pgvector is mandatory.
3. pg_trgm is optional.
4. Extensions are installed via migrations.
5. Runtime cannot manage extensions.
6. Vector search complements—not replaces—relational querying.

## Next Artifact

**Shared Database Types v1**

Will define:
- UUID conventions
- timestamps
- version columns
- shared enums
- JSONB types
- vector types
- reusable database primitives
