# Sprint 48 — Canonical NPC Snapshot & Worker Production Wiring

Status: IN PROGRESS

## Goal
Replace the worker's `EmptyNpcSourceAdapter` with a real, scope-safe PostgreSQL-backed NPC snapshot source and connect explicitly decision-ready snapshots to the S47 memory-aware decision seam without fabricating runtime state.

## Production boundary

`canonical NPC snapshot -> worker NpcSourcePort -> bounded simulation -> optional decision-ready payload -> S47 MemoryAwareDecisionService -> unique worker decision ledger`

Simulation-only snapshots remain valid. Autonomous decision execution is opt-in: a snapshot must contain an explicit, structured decision payload before the worker may invoke the decision engine.

## Invariants

1. NPC snapshots are stored under exact household + world + child profile + NPC scope.
2. Simulation snapshot reads cannot cross household/world boundaries.
3. Decision snapshot reads additionally require exact child-profile scope.
4. Snapshot reads are bounded and deterministically ordered.
5. Snapshot state is explicit structured data; no LLM reconstruction or synthetic NPC creation is allowed.
6. Missing or malformed decision payload means no autonomous decision is executed.
7. Decision candidates, context, utility policy, seed and decision key are supplied explicitly by canonical state; the worker must not invent them.
8. S47 remains the single memory-aware decision authority. Memory may nudge existing candidates but may not create actions or bypass safety.
9. Before reading decision memory, the worker checks the scoped decision ledger. An already-committed decision key is a replay and must short-circuit without a second decision computation.
10. Decision evidence is unique under household + world + child profile + NPC + decision key.
11. Existing simulation idempotency/effect boundaries remain unchanged.
12. DB-backed ULTEF evidence is required before merge.

## Implementation slices

- canonical `npc_intelligence.npc_snapshots` persistence;
- typed PostgreSQL snapshot repository with idempotent upsert and bounded scoped listing;
- repository-backed worker `NpcSourcePort`, replacing `EmptyNpcSourceAdapter`;
- optional decision-ready snapshot payload containing explicit candidates, decision context, utility policy, seed and decision key;
- exact-profile decision-ready snapshot retrieval;
- S47 `MemoryAwareDecisionService` production wiring;
- replay-safe `npc_intelligence.worker_npc_decisions` ledger;
- worker orchestration after successful background simulation;
- dedicated DB-backed S48 ULTEF proving scope isolation, snapshot replay safety, memory-aware selection and decision replay short-circuit;
- CI, Integration, Security, S44-S47 and PX regressions before closeout.

## Non-goals

- synthesizing NPCs when no snapshot exists;
- synthesizing traits, emotions, goals, candidates or utility weights in the worker;
- redesigning S47 decision scoring;
- free-form LLM autonomous actions;
- applying selected autonomous actions to world state in this sprint;
- UI work;
- changing the simulation effect commit model.
