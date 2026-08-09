# L4-SCENE-SESSION-001 — Generated Scene to Session Progression

Status: BLOCKED BY PRODUCT IMPLEMENTATION GAP
Date: 2026-08-08
Level: L4
Project gates: PX-LUMI-01, PX-LUMI-05

## Intended verification

Prove the production chain:

```text
accepted StoryHook
→ StorySceneGenerationService
→ validated GeneratedScene
→ advanceSession / story progression
→ persisted scene/session state
→ reader-visible story state
```

The evidence should ultimately answer, using runtime facts:

- which hook entered the pipeline;
- which scene was generated;
- which character/NPC appeared;
- which narrative/moment was produced;
- which session step/version changed;
- which scene row/state was persisted;
- what the reader receives after reloading the session.

## Current repository finding

The story generation pipeline exists and returns a validated `GeneratedScene`, but Sprint 32 explicitly left generated-scene → `advanceSession` / reader wiring as follow-up backlog. Therefore ULTEF cannot truthfully claim this production boundary is covered yet.

## ULTEF result policy

Until production wiring exists:

```text
L4-SCENE-SESSION-001 = BLOCKED
blockedBy = PRODUCT_GAP: generated-scene-session-wiring
```

A fake adapter must not be inserted merely to turn this scenario green. Lower-level story generation remains verified separately by `L4-HOOK-SCENE-001`.

## Required production implementation before unblocking

1. Composition service/route resolves accepted hook and generates scene.
2. Generated scene is translated into the input expected by the real session progression API.
3. `advanceSession` (or its canonical successor) persists the scene/session transition.
4. Reader/query path can reload the newly persisted scene.
5. Duplicate/retry behavior is defined so the same generated scene cannot advance twice unintentionally.
6. Transaction/failure behavior is defined for generation-success + persistence-failure.

## Future execution narrative

When implemented, the report should resemble:

```text
SETUP
Child: Deniz
Character: Arin
World: Gunes Vadisi
Active session: <runtime-id>
Hook source: Mira
Hook type: rumor

WHAT HAPPENED
01. Mira's accepted rumor hook was loaded.
02. StorySceneGenerationService produced scene <runtime-scene-id>.
03. Scene narrative contained the bridge-light rumor context.
04. Session progression accepted the generated scene.
05. Session step/version changed <before> -> <after>.
06. Scene was persisted with <runtime-id>.
07. Reader reloaded the active session.
08. Reader returned the persisted scene and narrative.

STATE DELTA
session.version: <before> -> <after>
session.currentSceneId: <old> -> <new>
storyScenes.count: N -> N+1

RESULT: PASS
```

All names, IDs and values must come from runtime evidence.

## Relationship to L6

`L6-GOLDEN-001` must remain blocked from claiming a complete story journey while this production boundary is missing. Once this scenario passes with real persistence/reload evidence, it becomes a prerequisite for the Golden Headless journey.
