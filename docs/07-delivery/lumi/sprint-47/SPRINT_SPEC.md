# Sprint 47 — NPC Decision Continuity Production Integration

Status: PLANNED

## Goal

Connect the proven S44–S46 canonical continuity stack to NPC decision/autonomous-behavior production paths without turning retrieved memory into an uncontrolled decision override.

## Core invariant

Memory is decision evidence, not a command. NPC actions must remain bounded by current world state, traits/goals, allowed actions and deterministic policy constraints.

## Scope

1. Inventory the current NPC decision, intent, routine and autonomous-action production paths.
2. Define a bounded `NpcDecisionContinuityContext` projection from canonical memories.
3. Preserve household/world/profile/NPC scope isolation on every decision read.
4. Add explicit decision evidence so only memories actually used by the evaluator can affect reinforcement/audit.
5. Ensure replay/idempotency: replayed autonomous decisions must not create extra decisions, memory reads with side effects, or duplicate reinforcement.
6. Persist decision-to-memory evidence only after the decision/action commit succeeds.
7. Add deterministic unit tests and DB-backed ULTEF L9 coverage for memory-driven decision divergence, cross-profile isolation and replay safety.

## Non-goals

- No new UI.
- No unbounded memory retrieval.
- No LLM-only autonomous action authority.
- No broad redesign of the S44–S46 memory lifecycle.
- No automatic reinforcement merely because a memory was retrieved.

## Acceptance criteria

- A relevant canonical NPC memory can measurably change an otherwise identical bounded decision evaluation.
- Irrelevant, expired, archived or superseded memories cannot affect the decision.
- Cross-household/world/profile/NPC memory cannot enter the decision context.
- Decision evidence is an explicit subset of the supplied bounded continuity evidence.
- Failed/rolled-back decisions leave no decision-memory usage residue.
- Replay is idempotent and does not double-reinforce memory.
- Existing story continuity, memory production/lifecycle and PX regression gates remain green.
- Dedicated S47 DB-backed ULTEF gate passes on the final head.
