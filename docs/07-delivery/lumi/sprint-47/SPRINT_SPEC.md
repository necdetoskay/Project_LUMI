# Sprint 47 — NPC Decision Continuity

Status: IN PROGRESS

## Goal

Connect the canonical continuity/memory foundation completed in S44-S46 to NPC autonomous decision evaluation without turning retrieved memory into an implicit action or mutation.

## Production invariant

**memory retrieval != decision evidence != committed action**

A memory may influence an NPC decision only through an explicit, bounded and auditable decision-context projection. The evaluator must remain deterministic for the same inputs. No memory reinforcement, world mutation, or NPC state mutation occurs merely because a memory was retrieved or scored.

## Scope

1. Identify the existing NPC intent / autonomous-action / utility evaluation seam and wire canonical bounded continuity into that seam.
2. Introduce a bounded `NpcDecisionContinuityContext` projection containing only decision-safe fields; never pass persistence rows directly into the evaluator.
3. Preserve household + world + child-profile + NPC owner isolation.
4. Keep candidate action generation separate from scoring and separate from commit.
5. Record explicit decision evidence keys for the winning candidate so later audit can explain which continuity facts influenced the score.
6. Reject fabricated evidence keys that were not present in the bounded decision context.
7. Do not reinforce memories during evaluation. Reinforcement, if appropriate, may happen only after a successfully committed NPC action and must be idempotent.
8. Preserve deterministic replay: identical snapshot + candidates + bounded continuity context => identical winning decision and evidence.

## Initial acceptance criteria

- [ ] Existing production NPC decision seam is located and documented.
- [ ] Canonical memory is projected into a bounded NPC decision context.
- [ ] Cross-household/profile/world/NPC memory cannot enter the decision context.
- [ ] Decision scoring is deterministic and independent from persistence mutation.
- [ ] Winning decision exposes validated continuity evidence keys.
- [ ] Evaluation alone creates no memory usage/reinforcement/world-state side effects.
- [ ] Replay produces the same winner and evidence.
- [ ] DB-backed ULTEF scenario covers scope isolation, deterministic replay and zero-side-effect evaluation.
- [ ] CI, Integration, Security and relevant PX/S44-S46 regression gates are green on one final head.

## Non-goals

- Rebuilding the complete NPC simulation architecture.
- Letting an LLM directly commit NPC actions.
- Unbounded memory retrieval.
- Automatic reinforcement on retrieval or scoring.
- UI work.
