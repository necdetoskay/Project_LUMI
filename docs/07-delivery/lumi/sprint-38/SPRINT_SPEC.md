# Sprint 38 — Story Template Authoring & Versioning

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Turn the existing `StoryDefinition` / immutable `StoryVersion` primitives into a production authoring and revision workflow that can be consumed by the later UI without introducing a second story/template state model.

## Existing foundation

- `StoryDefinition` already owns household scope, lifecycle and the current published version pointer.
- `StoryVersion` already owns draft/frozen/published/retired lifecycle and published-version immutability.
- `saveSceneGraph` already validates graph structure, hashes content and freezes a draft.
- `publishStoryVersion` already promotes a frozen version and points the definition at it.

Sprint 38 composes and hardens these primitives rather than replacing them.

## Tasks

### S38-T01 — Tenant-scoped authoring service

Add a package-level authoring service that:

- lists all versions for a story definition;
- verifies the definition belongs to the requested household;
- creates the next revision number automatically;
- can clone a selected/current published graph into the new revision when no replacement graph is supplied;
- accepts an explicitly authored replacement graph when supplied;
- freezes the resulting revision through the canonical graph validator/hash path.

### S38-T02 — Single-active-published-version semantics

Publishing vN+1 must retire the previously active published version in the same transaction before the definition pointer moves. Published or retired versions remain immutable; corrections require a new revision.

### S38-T03 — Web authoring API

Expose parent-authenticated, household-scoped endpoints for:

- listing template/version history;
- creating the next revision;
- publishing a frozen revision.

No visual authoring UI is in scope for this sprint.

### S38-T04 — Failure and replay safety

- foreign-household definitions fail closed;
- source versions must belong to the same definition;
- invalid graphs do not create a publishable revision;
- duplicate version numbers are prevented by canonical next-version calculation plus DB uniqueness;
- publishing an already-current version is replay-safe;
- publishing a new revision retires the previous active version.

### S38-T05 — ULTEF DB-backed production scenario

Stable scenario: `PX-LUMI-S38-TEMPLATE-VERSIONING-PROD-001`.

Required evidence:

1. create/publish v1 baseline;
2. create v2 by cloning the canonical v1 graph;
3. verify v2 receives an independent scene/transition identity set and matching authored content;
4. publish v2 and verify v1 becomes retired while v2 becomes the definition current version;
5. verify published v2 cannot be mutated directly;
6. create v3 with explicitly replaced authored graph and publish it;
7. verify foreign-household authoring is rejected;
8. CI / Security / Integration / PX / S37 / S36 regressions remain green.

## Out of scope

- Visual authoring/editor UI.
- Collaborative editing.
- Prompt-template administration UI.
- Choice-point visual editing; this sprint establishes the versioning boundary used by later authoring surfaces.

## Exit criteria

- [ ] Tenant-scoped authoring service exists.
- [ ] Next-version numbering is canonical and automatic.
- [ ] Existing graph can be cloned into a new frozen revision.
- [ ] Replacement graph can be authored into a new frozen revision.
- [ ] Publishing a revision retires the prior active published version atomically.
- [ ] Parent-authenticated web endpoints exist.
- [ ] `PX-LUMI-S38-TEMPLATE-VERSIONING-PROD-001` is PASS.
- [ ] CI / Security / Integration / PX / S37 / S36 regressions are green.
- [ ] Closeout evidence is committed and status becomes COMPLETE.
