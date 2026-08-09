# Sprint 45 — Memory Lifecycle & Long-Horizon Continuity

## Goal

Turn the Sprint 44 canonical memory foundation into a lifecycle-aware long-horizon memory system that remains bounded, deterministic and continuity-safe across many story sessions.

## Production outcomes

1. `durable` memories never decay merely because time passed.
2. `decaying` memories lose retrieval weight deterministically over time.
3. Reinforcement resets the decay clock without rewriting historical creation time.
4. Explicit expiry always excludes a memory from retrieval.
5. `superseded` and `archived` memories remain historical evidence but never re-enter active retrieval.
6. Retrieval remains household/world/profile/owner scoped and hard bounded.
7. Long-horizon ranking remains deterministic after many sessions and many lifecycle transitions.
8. Prompt projection continues to expose only child-safe memory summaries.

## Canonical lifecycle policy

- Durable: effective salience equals stored salience.
- Decaying: effective salience uses exponential half-life decay.
- Default half-life: 7 days.
- Decay anchor: `lastReinforcedAt ?? createdAt`.
- Reinforcement never increases salience above 1.0.
- Expiry is authoritative and evaluated before ranking.
- Superseded/archived rows are never active candidates.

## Acceptance tests

- MEM-DURABLE-NO-DECAY
- MEM-DECAY-HALF-LIFE
- MEM-REINFORCEMENT-RESET
- MEM-EXPIRED-EXCLUDED
- MEM-SUPERSEDED-EXCLUDED
- MEM-LONG-HORIZON-BOUNDED
- MEM-LONG-HORIZON-DETERMINISTIC
- MEM-TENANT-PROFILE-OWNER-ISOLATION
- MEM-PROMPT-SAFE-PROJECTION

## ULTEF target

Add a DB-backed L9 scenario that creates memories across many simulated sessions/days, reinforces selected memories, expires and supersedes others, then proves deterministic bounded retrieval and isolation.

## Non-goals

- Semantic embedding/vector retrieval.
- LLM-based memory summarization or consolidation.
- Cross-child memory sharing.
- Autonomous deletion of historical rows.
