# Sprint 55 — Generic Asset Management Core

Status: IN PROGRESS
Validation: final-head verification rerun after S53 workflow/test maintenance
Date: 2026-08-10
Parent roadmap: `docs/07-delivery/lumi/SAAS_PORTABILITY_ASSET_PLATFORM_ROADMAP.md`
Tracking issue: #91

## Goal

Generalize Sprint 53 character-visual asset management into a provider-neutral asset core that can represent and manage visuals for characters, NPCs, locations, items, and story scenes without discarding the existing character visual canon/history behavior.

## Product boundary

Sprint 55 is an asset-management sprint, not the generalized image-generation sprint. Binary generation provider/model policy, explicit budget accounting, batch/grid generation, and provider capability routing remain Sprint 56.

## Canonical model

A managed asset is identified by:

- household scope;
- subject type: `character | npc | location | item | story_scene`;
- subject id;
- asset kind;
- binary `storageRef` owned by the portable object-storage boundary;
- database metadata/state including MIME/dimensions/provider/model/provenance;
- lifecycle state: `candidate | canonical | rejected | archived`.

Binary bytes never live in PostgreSQL. PostgreSQL stores metadata, lifecycle, provenance, ownership scope, and canon pointers only.

## Compatibility strategy

Sprint 53 character visual tables remain supported during Sprint 55. Migration `0054_generic_asset_management.sql`:

1. backfills existing S53 character visual assets into the generic model;
2. reuses legacy asset UUIDs so canon references remain stable;
3. records an import lifecycle event;
4. installs transitional one-way sync triggers so new S53 candidate/canon changes remain visible in the generic model.

Sprint 56 may move generation directly to the generic boundary and retire the transitional bridge after migration evidence proves parity.

## Tasks

### S55-T01 — Generic asset schema

- Add `profile.managed_assets`.
- Add `profile.managed_asset_canons`.
- Add append-only `profile.managed_asset_lifecycle_events`.
- Enforce supported subject/origin/lifecycle values.
- Keep storage references provider-neutral.

### S55-T02 — S53 migration and compatibility

- Backfill character visual assets/canons.
- Preserve storage references, provenance, lifecycle and canon versions.
- Keep migration replay-safe.
- Mirror post-S55 S53 writes into the generic model until Sprint 56.

### S55-T03 — Generic lifecycle service

- Require an injected subject-authorization port on all user-facing operations.
- List assets by household + subject.
- Register metadata for an already-stored binary object.
- Select/replace canon with version increments.
- Reject/archive non-active assets.
- Preserve append-only lifecycle history.

### S55-T04 — Asset Management surface

- Reframe `/app/assets` as a generic Asset Management library rather than a character-only page.
- Preserve the existing character generation workflow during the transition.
- Expose the five canonical subject kinds in the UI information architecture.
- Do not fabricate NPC/location/item/story-scene assets where no canonical data exists.

### S55-T05 — Verification

Dedicated `ULTEF S55 Generic Asset Management` must prove:

- generic lifecycle and canon replacement;
- lifecycle history ordering;
- active-canon reject/archive protection;
- authorization denial;
- S53 candidate synchronization into generic assets;
- S53 canon synchronization into generic canon;
- profile migration replay/idempotency.

Normal CI, Security, Integration, S53 visual gates and the active PX regression matrix must remain green.

## Invariants

1. A subject cannot read or mutate another household's assets.
2. Asset subject type is explicit and bounded.
3. Object bytes are not stored in PostgreSQL.
4. Selecting a new canon archives the previous canon asset rather than deleting history.
5. Rejecting or archiving the active canon is forbidden.
6. Lifecycle history is append-only.
7. Provider names/models are provenance metadata, not domain routing logic.
8. Existing character visual assets remain usable and keep their UUID/storage references.
9. No Sprint 55 operation silently generates or invents visual content.

## Exit criteria

Sprint 55 is COMPLETE when:

- generic schema and service are merged;
- S53 history/canon preservation is proven;
- generic Asset Management UI framing is merged;
- dedicated S55 ULTEF passes on final head;
- standard CI/build/security/regression gates are green;
- Issue #91 Sprint 55 checklist is updated.
