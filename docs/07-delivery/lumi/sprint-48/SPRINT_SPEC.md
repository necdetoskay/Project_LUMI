# Sprint 48 — Canonical NPC Snapshot & Worker Production Wiring

Status: IN PROGRESS

## Goal
Replace the worker's `EmptyNpcSourceAdapter` with a real, scope-safe PostgreSQL-backed NPC snapshot source so background simulation can operate on canonical NPC state without fabricating runtime identities.

## Production boundary

`canonical npc snapshot -> worker NpcSourcePort -> bounded simulation planning -> existing effect/idempotency boundary`

S47 memory-aware decision remains the canonical decision seam when autonomous decisions are requested. S48 first closes the missing snapshot/source boundary required before that seam can be safely invoked by the worker.

## Invariants

1. NPC snapshots are stored under exact household + world + child profile + NPC scope.
2. Worker reads cannot cross household/world boundaries.
3. Snapshot reads are bounded and deterministically ordered.
4. Snapshot state is explicit structured data; no LLM reconstruction or synthetic NPC creation is allowed.
5. Replays read the same persisted snapshot state until an explicit snapshot update occurs.
6. Existing simulation idempotency/effect boundaries remain unchanged.
7. DB-backed ULTEF evidence is required before merge.

## First implementation slice

- add canonical NPC snapshot persistence to `npc_intelligence`;
- add a typed PostgreSQL repository for upsert + bounded scoped listing;
- implement a worker `NpcSourcePort` adapter backed by that repository;
- replace `EmptyNpcSourceAdapter` in production worker wiring;
- add unit tests and a dedicated DB-backed S48 ULTEF scenario;
- run CI, Integration, Security, S44-S47 and PX regressions before closeout.

## Non-goals

- synthesizing NPCs when no snapshot exists;
- redesigning S47 decision scoring;
- free-form LLM autonomous actions;
- UI work;
- changing the simulation effect commit model.
