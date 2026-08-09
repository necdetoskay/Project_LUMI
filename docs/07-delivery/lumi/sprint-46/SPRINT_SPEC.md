# Sprint 46 — Memory-to-Story Production Wiring

## Goal

Make canonical continuity and memory from S44–S45 actually participate in the live hook → LLM → persisted scene → Story Reader production path, with tenant-safe character resolution and testable evidence.

## Production gap

`StorySceneGenerationService` already accepts a `StoryContinuityContextPort`, and the web runtime has `NpcBeliefStoryContinuityContextAdapter`, but `generateHookReaderTurn()` does not currently inject that adapter. Therefore the live generated-hook Story Reader path can generate scenes without the canonical character/world/NPC/memory continuity foundation built in S44–S45.

## Production outcomes

1. Live hook scene generation always resolves bounded continuity through the production web adapter.
2. The active child character is resolved server-side from household + child profile scope; the client cannot inject a character id.
3. Canonical character memories, relevant NPC memories/beliefs and durable choice/world facts can reach the scene prompt through the existing prompt-safe continuity projection.
4. Missing character state degrades safely: NPC/world continuity can still be used without inventing a character identity.
5. Replay of an already persisted generated scene does not perform another continuity read or LLM call.
6. Failure before successful generation/persistence does not mutate memory lifecycle state.
7. Memory reinforcement-by-usage is not inferred merely from retrieval. A later S46 slice may add explicit usage evidence only if the generated output can prove which allowed continuity keys were actually used.

## Safety rule

Retrieval is not usage. Do not reinforce every memory that was merely placed in the prompt. Any automatic reinforcement must be backed by explicit validated usage evidence and successful canonical scene persistence.

## Acceptance tests

- M2S-PROD-CONTINUITY-INJECTED
- M2S-SERVER-CHARACTER-SCOPE
- M2S-MEMORY-PROMPT-VISIBLE
- M2S-NPC-WORLD-CONTINUITY
- M2S-MISSING-CHARACTER-SAFE
- M2S-REPLAY-NO-SECOND-LLM
- M2S-FAILURE-NO-MEMORY-MUTATION
- M2S-TENANT-PROFILE-ISOLATION

## ULTEF target

DB-backed L9 scenario: seed household/profile/character/world plus canonical character/NPC memory, create a real story hook, run the production hook-reader generation path with a fake zero-cost provider, prove the prompt contains only in-scope continuity, persist/advance the scene, replay without a second provider call, and prove another profile/household memory never enters the prompt.

## Non-goals

- Vector/embedding memory retrieval.
- Reinforcing all retrieved memories.
- LLM-authored arbitrary memory ids without subset validation.
- Cross-child memory sharing.
