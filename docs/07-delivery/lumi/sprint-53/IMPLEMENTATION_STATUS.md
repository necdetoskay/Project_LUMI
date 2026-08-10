# Sprint 53 — Implementation Status

Status: IN PROGRESS
Date: 2026-08-10
Branch: `s53/character-visual-canon`

## Objective

Implement the first production visual pipeline for LUMI: existing character data -> reproducible visual brief -> provider generation job -> managed candidate assets -> explicit character visual canon selection.

## Current state

- Sprint 52 playable persistent demo is merged to `main`.
- The canonical demo character Lina exists independently of media generation.
- Story media truthfully remains `not_generated`.
- Sprint 53 intentionally starts from domain/application contracts and persistence before visual polish.

## Workboard

- [x] T01 Sprint 53 canonical visual-canon specification
- [x] T02 Provider-independent persistence schema for generation jobs, assets and character canon
- [x] T03 Migration for character visual persistence
- [x] T04 Deterministic/versioned character visual brief + fingerprint
- [x] T05 Unit coverage for brief determinism and identity-relevant change
- [ ] T06 Repository/application services for generation jobs and candidate lifecycle
- [ ] T07 Image-generation port + deterministic fake adapter
- [ ] T08 Canon selection/replacement service and isolation tests
- [ ] T09 Minimal parent/admin Asset Management workflow
- [ ] T10 Configured real provider adapter behind explicit budget/live-generation boundary
- [ ] T11 Dedicated S53 ULTEF + final regression matrix

## Implemented foundation

### Persistence

`profile.character_visual_generation_jobs` stores one logical generation request with idempotency, versioned visual brief, provider/model metadata, requested candidate count, usage/cost metadata and explicit failure state.

`profile.character_visual_assets` stores durable managed candidates independently of provider URLs. It includes lifecycle state, generation provenance, candidate index and composite/grid lineage through `source_composite_asset_id` plus `crop_metadata`.

`profile.character_visual_canons` stores the character-level canon pointer and visual identity contract separately from the generated assets. Selection is therefore explicit and generation does not silently replace canon.

### Reproducible brief

`CHARACTER_VISUAL_BRIEF_VERSION = lumi-character-visual-v1` builds a provider-independent brief from already-existing canonical character data. Stable object-key ordering plus SHA-256 produces an auditable fingerprint so unchanged canonical data yields the same brief identity.

## Guardrails

- no generation side effect during character creation;
- no provider URL as the only persisted asset identity;
- no silent canonical-image replacement;
- no live-provider dependency in required CI;
- no cross-household asset visibility;
- no claim that grid generation is production-ready until crop/split provenance is tested;
- no image-generation spend without explicit configured provider/model and budget boundary.

## Next implementation slice

Build the application/repository service boundary for `request generation -> idempotent job -> fake provider -> multiple persisted candidates -> explicit canon selection`. This will become the first dedicated S53 ULTEF application/DB gate before any real provider spend is enabled.
