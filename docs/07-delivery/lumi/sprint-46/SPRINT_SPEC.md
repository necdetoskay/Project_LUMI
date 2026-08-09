# Sprint 46 — Memory-to-Story Production Wiring

## Goal

Make canonical continuity and memory from S44–S45 actually participate in the live hook → LLM → persisted scene → Story Reader production path, with tenant-safe character resolution, explicit usage evidence and replay-safe reinforcement.

## Production gap

`StorySceneGenerationService` already accepted a `StoryContinuityContextPort`, and the web runtime already had `NpcBeliefStoryContinuityContextAdapter`, but `generateHookReaderTurn()` did not inject that adapter. Therefore the live generated-hook Story Reader path could generate scenes without the canonical character/world/NPC/memory continuity foundation built in S44–S45.

A second gap existed after continuity injection: retrieval alone could not safely justify memory reinforcement. Production needed explicit bounded evidence of which supplied continuity keys materially influenced the generated scene, persisted evidence for audit/recovery, and a replay-safe scene→memory usage ledger.

## Production outcomes

1. Live hook scene generation resolves bounded continuity through the production web adapter.
2. The active child character is resolved server-side from household + child profile scope; the client cannot inject a character id.
3. Canonical character memories, relevant NPC memories/beliefs and durable choice/world facts can reach the scene prompt through the existing prompt-safe continuity projection.
4. Missing character state degrades safely: NPC/world continuity can still be used without inventing a character identity.
5. Replay of an already persisted generated scene does not perform another continuity read or LLM call.
6. Generated output may report `usedContinuityKeys`, but every reported key must be a strict subset of the bounded continuity keys actually supplied in that prompt.
7. Validated usage evidence is persisted into canonical generated-scene metadata for audit and retry recovery.
8. Only canonical-memory usage keys are eligible for lifecycle reinforcement; profile/trait/inventory/world/belief facts are not treated as memory reinforcement commands.
9. Memory reinforcement occurs only after canonical scene persistence/advance succeeds.
10. `(household, world, scene, memory)` usage is unique, so replay cannot reinforce the same memory twice.
11. Cross-household/profile/world/owner reinforcement is rejected transactionally and leaves no usage residue.
12. If scene persistence succeeds but usage application fails, the hook remains unconsumed; retry can recover from persisted scene metadata without a second LLM call.

## Safety rule

**Retrieval is not usage.** Do not reinforce every memory placed in the prompt. Automatic reinforcement requires explicit validated usage evidence, successful canonical scene persistence and an in-scope canonical memory key.

## Acceptance tests

- M2S-PROD-CONTINUITY-INJECTED
- M2S-SERVER-CHARACTER-SCOPE
- M2S-MEMORY-PROMPT-VISIBLE
- M2S-NPC-WORLD-CONTINUITY
- M2S-MISSING-CHARACTER-SAFE
- M2S-REPLAY-NO-SECOND-LLM
- M2S-USAGE-STRICT-SUBSET
- M2S-USAGE-METADATA-PERSISTED
- M2S-MEMORY-ONLY-REINFORCEMENT
- M2S-SCENE-MEMORY-IDEMPOTENCY
- M2S-FAILURE-NO-MEMORY-MUTATION
- M2S-TENANT-PROFILE-ISOLATION
- M2S-RETRY-RECOVERS-USAGE

## ULTEF target

DB-backed L9 evidence must prove the scene→memory usage boundary on disposable PostgreSQL: first valid scene usage reinforces once, replay of the same scene-memory pair is a duplicate rather than another mutation, cross-profile usage is rejected, the original reinforcement timestamp remains stable on replay, and rejected usage leaves no ledger residue. Production regression coverage additionally verifies live hook-reader continuity injection and existing hook replay behavior.

## Non-goals

- Vector/embedding memory retrieval.
- Reinforcing all retrieved memories.
- LLM-authored arbitrary memory ids without subset validation.
- Cross-child memory sharing.
