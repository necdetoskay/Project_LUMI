# Sprint 49 — NPC Action Outbox & World Effect Production

Status: IN PROGRESS

## Goal

Turn an already-selected, S48-persisted NPC decision into an explicit, replay-safe world effect without inferring mutations from candidate text or kind.

## Production chain

`decision-ready snapshot → S47 MemoryAwareDecisionService → S48 decision ledger → explicit selected-candidate effect intent → durable outbox → worker dispatcher → scoped world applicator → idempotent world state transition`

## Safety invariants

1. No world mutation is inferred from `CandidateAction.kind`, description, memory text or LLM output.
2. Only an explicit structured effect authored for the selected candidate may leave the decision boundary.
3. Initial supported effect is bounded `move_character` with an explicit `targetLocationId`.
4. Household, world, profile, NPC and character scope must remain explicit throughout the chain.
5. Decision replay must not recompute memory-aware selection.
6. If decision persistence succeeded but effect enqueue failed, replay must recover the missing enqueue rather than silently losing the effect.
7. At-least-once outbox delivery must not produce duplicate world movement.
8. Cross-household/world target locations fail closed.
9. A decision without an explicit effect remains evidence-only.

## Acceptance evidence

Dedicated DB-backed ULTEF scenario must prove:

- exact-profile decision selects the expected candidate;
- only the selected candidate's explicit effect is enqueued;
- no-effect candidate produces no outbox mutation;
- replay does not perform a second canonical memory read;
- failed/missing enqueue is recoverable from persisted decision evidence;
- outbox replay does not duplicate movement;
- cross-world/cross-household movement is rejected;
- CI, Integration, Security, S44-S48 and PX regressions remain green.
