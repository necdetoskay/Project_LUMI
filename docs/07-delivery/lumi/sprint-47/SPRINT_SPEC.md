# Sprint 47 — Memory-Aware NPC Decision Production

Status: IN PROGRESS

## Goal

Connect the proven canonical continuity/memory pipeline to deterministic NPC decision and autonomous-behavior selection without letting retrieved memories directly mutate world state.

## Production boundary

`bounded canonical memory -> decision context -> deterministic candidate scoring -> selected NPC intent -> explicit decision evidence -> existing world/outcome commit boundary`

## Safety invariants

1. Retrieval is context, not authority: a memory may influence utility but cannot directly write world state.
2. Every decision is scoped by household + world + child profile + NPC identity.
3. Candidate actions are supplied by the caller/domain; memory content cannot invent an executable action outside that bounded set.
4. Decision scoring is deterministic for the same state, candidate set and effective memory context.
5. Memory influence is bounded and explainable; base goals/needs/routine constraints remain visible in the score breakdown.
6. Replay of an already committed autonomous decision must not produce a second state transition.
7. Cross-profile/cross-world memories must never enter the NPC decision context.

## First implementation slice

- inspect current NPC/world decision surfaces and choose the narrowest production seam;
- introduce a typed memory-aware decision context and deterministic scorer;
- preserve a structured score/evidence breakdown;
- add unit tests for no-memory, relevant-memory, conflicting-memory and deterministic tie-break cases;
- wire the scorer only after a safe existing commit seam is identified;
- add DB-backed ULTEF evidence before production merge.

## Non-goals

- free-form LLM autonomous actions;
- allowing memories to execute mutations;
- unbounded background simulation;
- redesigning S44-S46 memory storage/lifecycle;
- UI work.
