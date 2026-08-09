# PX-LUMI-02 Character Continuity — Production Context Blocker

Status: **BLOCKED**  
Date: 2026-08-09

## Gate requirement

`PX-LUMI-02` requires runtime evidence that:

1. character identity remains stable;
2. state changes are bounded and explainable;
3. inventory/relationship/trait mutations persist after reload;
4. later scenes receive the correct updated character context.

The required narrative must show character identity, pre-state, action/mutation timeline, and post-reload state.

## What exists today

### Stable identity/session participation

The L6 Golden Journey uses the same child, world and character identity across the initial and later story session. This is strong continuity evidence, but the current Golden assertions focus on child/world continuity and persisted NPC belief continuity rather than a mutated character-domain state.

### Character-domain mutation and persistence primitives

`@lumi/profiles` exposes character-domain services for traits, emotions, needs, goals, influence and relationships, with transactional persistence and optimistic versioning. Inventory also has its own persisted service boundary.

These primitives can support the first three PX-LUMI-02 assertions with a dedicated DB-backed scenario.

### Story generation accepts character scope

`StorySceneGenerationService.generateSceneFromHook()` accepts an optional `characterId` and passes it to the injected `StoryContinuityContextPort`.

## Missing production link

The current production `NpcBeliefStoryContinuityContextAdapter` ignores `characterId` and builds continuity context only from household/world-scoped NPC beliefs. It does not load the active character's traits, inventory, relationships, emotions, goals or other character-domain state.

Therefore a test can prove that character mutations persist, and another test can prove that a later story is generated, but the repository cannot currently prove the required causal boundary:

`persisted character mutation -> production continuity context -> later scene prompt/output`

Passing a hand-built character summary directly to a fake continuity port would not satisfy the PX gate.

## Why the gate is BLOCKED

The missing behavior is a production composition boundary, not a unit-test gap. Marking PX-LUMI-02 PASS from the current L6 Golden journey would overclaim what the later scene actually consumes.

## Required implementation before PASS

A minimal closure path should add a bounded profile-backed character continuity adapter (or extend the current continuity composition) that:

1. loads the active character by `householdId` + `childProfileId` + `characterId`;
2. exposes only prompt-safe, relevant character state;
3. includes durable trait/relationship/inventory changes needed by the next scene;
4. remains household/child scoped;
5. is consumed by `StorySceneGenerationService` through the existing continuity port without direct ORM coupling.

## Closure scenario target

Proposed stable ID:

`PX-LUMI-02-CHARACTER-RELOAD-STORY-001`

The future scenario should mutate a bounded character dimension or inventory/relationship state, reload it from PostgreSQL, start/generate a later scene, and prove that the exact persisted mutation appears in the production continuity context and influences the generated scene.
