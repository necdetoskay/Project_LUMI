# Sprint 44 — Memory Production Model

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Move LUMI memory from continuity-adjacent evidence into a production memory model that can persist, retrieve, rank and safely project story-relevant memories across sessions without leaking raw internal state into child-facing experiences.

## Product direction

Memory is not a transcript archive. It is selective, contextual evidence about what characters experienced, learned, felt, promised, discovered or changed. The production model must preserve continuity while avoiding uncontrolled accumulation and false recall.

The system must answer:

1. What should be remembered from an outcome?
2. Who owns or can know that memory?
3. How strong/relevant is it now?
4. How is it retrieved for a future story/session?
5. How do we prove that stale, cross-tenant or fabricated memories are not surfaced?

## Existing contracts to preserve

- story outcome/world-state commit semantics
- household/profile/character isolation
- existing continuity-context generation paths
- PX-LUMI-03 memory coherence regression
- deterministic/idempotent outcome application
- no duplicate effects on retries/replays

## Scope

- Inventory existing memory-like persistence, continuity and outcome evidence before changing schema.
- Define a canonical memory record with owner/scope, source evidence, event/story/session linkage, salience, confidence, lifecycle and provenance.
- Add production write path from committed outcomes only; rejected/rolled-back outcomes must never create canonical memories.
- Add deterministic idempotency for memory writes.
- Add scoped retrieval for household/profile/character/session context.
- Add relevance/salience ranking with explicit limits to prevent unbounded prompt/context growth.
- Add lifecycle rules for durable, decaying, superseded and archived memories without silently rewriting history.
- Add tenant isolation and authorization boundaries for all memory reads/writes.
- Define safe projection into story generation context; raw internal scoring/provenance must not leak into child-facing text.
- Extend ULTEF with memory write/retrieval/isolation/idempotency/rollback/long-horizon journeys.

## Non-goals

- Full relationship production evidence belongs to S45.
- NPC autonomous memory-driven behavior belongs to S46 after S44 memory contracts are stable.
- Final combined 100+ session living-universe journey belongs to S58, though S44 must add its own memory-focused L9 journey now.
- UI memory browser is not required in S44.

## Acceptance criteria

1. Canonical memory is created only from successfully committed evidence.
2. Retry/replay cannot duplicate the same canonical memory effect.
3. Rolled-back/rejected outcomes create no memory residue.
4. Household/profile/character scope is enforced on every memory read/write.
5. Retrieval returns bounded, relevant memories rather than an unbounded transcript dump.
6. Superseded/conflicting memories preserve provenance and deterministic resolution behavior.
7. Long-horizon retrieval remains stable across repeated sessions.
8. Existing PX-LUMI-03 memory coherence remains green.
9. Memory context can feed generation without leaking raw IDs/scores/internal terminology to child-facing output.
10. Dedicated S44 ULTEF, Integration, Security, CI and relevant PX regressions are green before COMPLETE.

## Planned ULTEF mapping

- MEM-WRITE-COMMIT-001
- MEM-ROLLBACK-NO-RESIDUE-001
- MEM-IDEMPOTENCY-001
- MEM-TENANT-ISOLATION-001
- MEM-OWNER-SCOPE-001
- MEM-RETRIEVAL-RELEVANCE-001
- MEM-RETRIEVAL-BOUND-001
- MEM-SUPERSESSION-001
- MEM-PROVENANCE-001
- MEM-CONTEXT-NO-TECH-LEAK-001
- L9-MEMORY-JOURNEY
- S44-MEMORY-PRODUCTION-CONTRACT-001

## Completion policy

Discovery/gap analysis -> canonical contract/schema -> production write path -> retrieval/ranking -> lifecycle/supersession -> unit/integration -> DB-backed ULTEF -> adversarial isolation/rollback/idempotency -> L9 memory journey -> CI/Security/Integration/PX green -> closeout evidence -> COMPLETE.
