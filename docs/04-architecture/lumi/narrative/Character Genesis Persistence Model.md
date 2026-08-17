# Character Genesis Persistence Model

Status: Phase 1 contract for #241 / parent epic #240.

## Purpose

Character Genesis is a durable foundation record, not a replacement for existing character, world, NPC, relationship, inventory or opportunity authorities. This document defines what the foundation owns, what it references, and the migration shape required before materialization phases.

## Existing authority audit

### Profiles / character authority

`LumiCharacter` already owns the committed character identity and first-run handoff values including:

- `originConcept`
- `startingRegionArchetype`
- `startingLocation`
- `homeArchetype`
- `nearbyNpcSeed`
- `firstMysterySeed`
- `universeSeed`
- traits/emotions/needs/goals/influence/relationships

These values remain valid. Genesis does not duplicate the character row. `nearbyNpcSeed` and `firstMysterySeed` are generation inputs/provenance until corresponding canonical entities are materialized; prose/seed text is not itself an NPC or world event.

### World authority

World, region, current location and other world-state records remain under the existing world package. Genesis stores only `worldId` and narrative foundation facts needed to explain the character's initial situation.

### NPC authority

Canonical NPC identity remains in Profiles and NPC runtime/decision state remains in `npc-intelligence`. Genesis `SocialEcologyRole` describes a required or optional functional role. Phase 6 materializes a role into the existing NPC authorities and records the resulting ids in the bootstrap manifest.

### Relationships

Relationship records/vectors remain under their existing character/NPC authorities. Genesis can request a relationship role/intention but does not become the relationship database.

### Inventory

Inventory continues to use the existing inventory authority. Genesis may justify an initial item in a future bootstrap phase, but the item must be materialized through the canonical inventory service and referenced from the bootstrap manifest.

### World events, rumors and opportunities

These remain in their canonical world/NPC/opportunity authorities. The foundation may contain saga questions and initial world conditions; Phase 7 turns eligible conditions into canonical events/rumors/opportunities.

## New profile-owned authority

Phase 1 introduces the `CharacterFoundationRecord` contract as the durable owner of:

1. `CharacterGenesis`
2. `SagaCanon`
3. `SagaProgression`
4. optional `LivingWorldBootstrapManifest`
5. scope/version/provenance metadata

The record is uniquely scoped by:

`householdId + childProfileId + characterId + worldId`

The application persistence port is `CharacterFoundationRepository`.

## Why one aggregate boundary in v1

Genesis, Saga Canon and initial Saga Progression are committed together after Final Review. They share the same character/world scope and must not become independently cross-scoped. A single foundation aggregate gives v1:

- one optimistic version boundary
- one idempotent final-commit target
- one provenance envelope
- straightforward rollback/retry semantics

This does **not** require storing every field in one JSON blob forever. The persistence layout may normalize later without changing the domain boundary.

## Proposed migration shape

After schema audit and before Phase 5 production writes, add a profile-owned table conceptually equivalent to:

```text
profile.character_foundations
- id uuid primary key
- household_id uuid not null
- child_profile_id uuid not null
- character_id uuid not null
- world_id uuid not null
- version integer not null
- schema_version integer not null
- genesis jsonb not null
- saga_canon jsonb not null
- saga_progression jsonb not null
- bootstrap_manifest jsonb null
- created_at timestamptz not null
- updated_at timestamptz not null

unique (household_id, child_profile_id, character_id, world_id)
```

The JSON columns are recommended for v1 because the nested creative contracts will evolve during Phases 2–4. Scope, optimistic versioning and lifecycle metadata remain relational and queryable. If operational queries later require direct indexing of progression fields, those fields can be promoted without changing the aggregate contract.

## Optimistic concurrency

`CharacterFoundationRepository.save` accepts `expectedVersion`:

- `null` means create-only; fail if the scoped foundation already exists.
- integer means compare-and-swap; fail if stored version differs.

A successful mutation increments the aggregate version exactly once.

Saga progression updates must not overwrite a newer foundation version produced by another story commit.

## Bootstrap idempotency

`LivingWorldBootstrapManifest` includes:

- `foundationVersion`
- `bootstrapVersion`
- `idempotencyKey`
- status
- materialized references

The idempotency key is stable for one foundation/bootstrap version. Retrying bootstrap must reuse already materialized canonical entities when their provenance matches; it must not create duplicate NPCs, relationships or opportunities.

## Materialization references

The manifest records only references:

```text
kind
canonical authority
entity id
originating social-ecology role id (optional)
reused flag
```

Canonical entity payloads are never copied into the foundation record as competing authorities.

## Truth / knowledge boundary

`SagaCanon.deepTruth` is protected canon.

`SagaProgression.knownFacts` and `currentBeliefs` are mutable character-facing state.

Phase 1 validation rejects an exact protected deep-truth value appearing in knowledge/belief while early-reveal restrictions exist. Later reveal-safety phases will use richer policy/semantic projection; this exact-match rule is the minimum invariant, not the final leakage detector.

## Species and social topology

There is intentionally no `familyTemplateByCharacterType` field and no invariant requiring family roles. `SocialEcologyRole` is functional and a valid Genesis may contain zero social roles.

Examples:

- rooted human: caregiver, sibling, neighbour may be meaningful
- lone hatchling: zero family roles may be correct
- awakened machine: facility AI or maintenance companion may be meaningful
- memoryless traveller: rescuer plus unknown presence may be meaningful

The generator decides roles from Genesis/current situation/world fit. The persistence model only validates the resulting contract.

## Existing character compatibility

No existing character row is modified in Phase 1. Existing characters simply have no foundation record. Phase 9 will define conservative derivation/backfill with `legacy-derived` provenance.

## Rollback and failure semantics

- Final character/world commit and foundation commit must be orchestrated with explicit retry semantics in Phase 5.
- A bootstrap failure does not delete or recreate the committed character.
- Failed bootstrap state is recorded in the manifest and can resume from recorded materializations.
- Deep truth cannot be silently regenerated on a bootstrap retry.

## Phase 1 acceptance mapping

- canonical domain contracts: `packages/profiles/src/domain/character-genesis.ts`
- persistence port: `packages/profiles/src/application/character-foundation.repository.ts`
- scope/truth/version invariant tests: `packages/profiles/tests/domain/character-genesis.test.ts`
- migration plan: this document

Actual DB migration/repository adapter is deliberately deferred until the creative/Saga contracts stabilize enough for production writes, as required by #241.
