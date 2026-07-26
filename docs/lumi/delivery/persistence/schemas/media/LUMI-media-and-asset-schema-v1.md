
# Project LUMI — Media & Asset Schema v1

## Status
Accepted

## Purpose

Defines persistent storage for all generated and imported media assets used by LUMI.

Supported assets:

- illustrations
- thumbnails
- character portraits
- maps
- icons
- narration audio
- ambience
- sound effects

## Aggregate Root

MediaAsset

Supporting entities:

- AssetVariant
- AssetGeneration
- AssetReference

## media_assets

Fields:

- id
- world_id
- asset_type
- mime_type
- storage_provider
- storage_key
- checksum
- width
- height
- duration
- lifecycle_status
- created_at
- version

## Asset Types

- image
- audio
- video
- icon
- thumbnail
- document

## Asset Variants

Stores resized and optimized versions.

Examples:

- original
- thumbnail
- mobile
- low_bandwidth
- print

## Asset Generation

Stores AI generation metadata:

- model_provider
- model_name
- prompt_version
- prompt_hash
- seed
- generation_cost
- created_at

Prompts are versioned for reproducibility.

## Asset References

Assets are linked to:

- story scenes
- characters
- items
- locations
- world events

The asset itself never embeds business data.

## Storage

Binary files remain in object storage.

Database stores only references.

## Cache

Recommended cache levels:

- memory
- CDN
- object storage

## Lifecycle

draft
→ active
→ archived

Broken references are prohibited.

## Security

- Ownership scoped by child/world.
- Generated media must pass safety validation.
- Internal prompts are never exposed to children.

## Indexes

- (world_id, asset_type)
- (storage_key)
- (lifecycle_status)

## Repository

- createAsset
- createVariant
- attachAsset
- archiveAsset

## Domain Events

- AssetGenerated
- AssetAttached
- AssetArchived

## Acceptance Criteria

- Binary data is stored outside PostgreSQL.
- Assets support multiple variants.
- Prompt metadata is versioned.
- References are reusable.
- Asset lifecycle is auditable.

## Decisions Finalized

1. PostgreSQL stores metadata only.
2. Object storage stores binaries.
3. Variants are first-class entities.
4. AI generation metadata is retained.
5. Assets are reusable across domains.

## Next Artifact

**Semantic Memory & Embedding Schema v1**
