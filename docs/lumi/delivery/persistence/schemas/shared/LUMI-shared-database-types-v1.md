
# Project LUMI — Shared Database Types v1

- Status: Accepted
- Phase: Persistence Implementation

## Purpose
Defines reusable database primitives shared by every schema module.

## UUID Standard

- Primary keys use UUIDv7 when available.
- UUID columns are named `id`.
- Foreign keys use `<entity>_id`.

## Timestamp Columns

Every aggregate table includes:

- created_at
- updated_at

Optional:

- deleted_at
- archived_at
- processed_at
- expires_at

All timestamps use UTC.

## Version Columns

Mutable aggregates include:

- version

Rules:

- Starts at 1
- Incremented on successful updates
- Used for optimistic concurrency

## Audit Columns

Common optional fields:

- created_by
- updated_by
- correlation_id
- causation_id

## Boolean Conventions

Use explicit names:

- is_active
- is_deleted
- is_archived
- is_system

Avoid ambiguous flags.

## JSONB Rules

Allowed for:

- AI metadata
- model responses
- dynamic configuration
- semantic metadata
- external payloads

Not for:

- frequently filtered business fields
- foreign keys
- core relationships

Every JSONB document includes:

- schema_version

## Vector Type

Embedding columns use:

- vector(<dimension>)

Rules:

- Dimension fixed per embedding profile
- Source text never overwritten
- Embeddings regenerated when profile changes

## Shared Enums

Examples:

- lifecycle_status
- processing_status
- generation_status
- archive_status

Enums describe database state only.

## Naming Rules

- snake_case
- plural table names
- singular column names
- lowercase identifiers

## Nullability

Required business fields:

- NOT NULL

Optional lifecycle fields may allow NULL.

## Default Values

Typical defaults:

- timestamps
- version=1
- boolean=false where appropriate

Business defaults must be explicit.

## Reusable Column Groups

Shared helpers:

- id
- timestamps
- version
- archive
- audit
- ownership

## Acceptance Checklist

- Shared primitives implemented
- Naming consistent
- UTC timestamps enforced
- Version column reusable
- JSONB conventions documented
- Vector type standardized

## Decisions Finalized

1. UUID is the standard identifier.
2. UTC timestamps everywhere.
3. Version column for mutable aggregates.
4. JSONB requires schema_version.
5. Vector dimensions belong to embedding profiles.
6. Shared column helpers are reused across schemas.

## Next Artifact

**Child Profile Schema v1**

Will define:

- child profile tables
- parent relationship
- interests
- preferences
- safety settings
- profile lifecycle
