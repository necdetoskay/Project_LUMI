# PX-LUMI-02 Character Continuity — Closure Record

Status: **EXECUTED PASS — BLOCKER CLOSED**  
Date: 2026-08-09

## Gate requirement

`PX-LUMI-02` requires runtime evidence that:

1. character identity remains stable;
2. state changes are bounded and explainable;
3. durable character mutations persist after reload;
4. later scenes receive the correct updated character context.

The required narrative must show character identity, pre-state, mutation timeline, post-reload state, and causal use by later story generation.

## Production implementation

The production continuity composition now includes a bounded profile-backed character read model.

`getCharacterContinuitySnapshot()`:

- scopes lookup by `householdId` + `childProfileId` + `characterId`;
- loads the persisted character record;
- exposes bounded trait, relationship and inventory state only;
- keeps ORM records and arbitrary metadata out of the story prompt boundary;
- returns no character context when scope does not match.

`NpcBeliefStoryContinuityContextAdapter` now composes this character snapshot with the existing household/world-scoped NPC belief continuity and supplies the result through the existing `StoryContinuityContextPort` used by `StorySceneGenerationService`.

Malformed optional character identifiers are rejected from the character lookup path and safely fall back to the existing NPC/world continuity behavior. This preserves legacy callers while valid UUID character IDs use the new production character-continuity path.

## Closure scenario

Stable ID:

`PX-LUMI-02-CHARACTER-RELOAD-STORY-001`

The DB-backed closure scenario:

1. creates a synthetic household, child profile and character in disposable PostgreSQL;
2. persists an initial `courage=0.40` trait with character version `1`;
3. applies a bounded persisted mutation to `courage=0.82` and character version `2`;
4. reloads the character state directly from PostgreSQL;
5. generates a later scene through the production `NpcBeliefStoryContinuityContextAdapter` and `StorySceneGenerationService`;
6. proves the generated prompt contains the same character identity, persisted version `2`, and `courage=0.82`;
7. proves the later generated narrative changes in response to the persisted mutation;
8. writes ULTEF evidence through the standard scenario artifact lifecycle.

This closes the previously missing causal boundary:

`persisted character mutation -> production continuity context -> later scene prompt/output`

## Validation evidence

- Workflow: `ULTEF PX-02 Character Continuity #8`
- Result: **PASS**
- Head: `37588e8eafe0e23773b29dea0166009cb7b45d40`
- Scenario: `PX-LUMI-02-CHARACTER-RELOAD-STORY-001`
- Evidence artifact: `ultef-px02-character-continuity-evidence`
- Artifact digest: `sha256:8aea7a641e5536cb241cd6ea9dcbe2450a8628f7602350327e6ce229b88922c1`
- Provider cost: `0` (deterministic provider double)

Regression evidence on the same head:

- `ULTEF PX-LUMI #31`: **PASS**
- `ULTEF Integration #393`: **PASS**
- legacy `L5-CONTEXT-DIVERGENCE-001`: **PASS** after malformed optional character-ID fallback hardening
- `Security Scan #572`: **PASS**
- CI validate chain: format, lint, typecheck, tests, load gate and production build all **PASS**

## Gate decision

**PX-LUMI-02 is evidence-closed / EXECUTED PASS.**

The previous production character-context blocker is resolved. Future changes to the character continuity read model, prompt composition, character scoping, or story-generation continuity port must keep `PX-LUMI-02-CHARACTER-RELOAD-STORY-001` green.
