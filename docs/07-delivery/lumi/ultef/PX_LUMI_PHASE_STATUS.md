# PX-LUMI Verification Phase Status

Status: **IN PROGRESS**  
Started: 2026-08-09

Generic ULTEF L0-L9 production-readiness work is closed. This phase verifies the Project LUMI-specific extension gates from `PX_LUMI_GATE_CATALOG.md` without duplicating evidence that already exists.

## Current evidence map

| Gate | Current assessment | Evidence / next action |
| --- | --- | --- |
| PX-LUMI-01 Universe Continuity | Strong existing evidence | L6 Golden, scene-session persistence, long-horizon and commit/reload gates |
| PX-LUMI-02 Character Continuity | Partial / embedded | L6 Golden covers stable character participation; dedicated mutation/reload evidence still needs review |
| PX-LUMI-03 Memory Coherence | Strong existing evidence | Household-scoped hearsay belief + materialized rumor propagation |
| PX-LUMI-04 Emotional Consistency | **BLOCKED — production wiring** | Bounded persistence and utility consumption exist, but event→emotion-delta derivation and persisted-emotion→decision-context production wiring are missing. See `PX_LUMI_04_EMOTIONAL_CONSISTENCY_BLOCKER.md`. |
| PX-LUMI-05 Story Consequence | Strong existing evidence | Choice/world divergence, generated scene/session, outcome commit |
| PX-LUMI-06 Child / Household Isolation | Strong existing evidence | Isolation matrix, concurrency, IDOR and L6 evidence |
| PX-LUMI-07 World Time Progression | **EXECUTED PASS** | `PX-LUMI-07-WORLD-TIME-001`; ULTEF PX-LUMI #3; artifact digest `sha256:f4623b0a493a1c14211301c692bdfa63d0aae03a15383b11abbc622616c6fd80` |
| PX-LUMI-08 NPC Background Life | Strong / needs closure review | Rumor propagation, opportunity→hook, materialized propagation |
| PX-LUMI-09 Story Outcome & World State Commit | Strong existing evidence | `PX-LUMI-09-001/002`, recovery, reload and idempotency gates |
| PX-LUMI-10 Age Appropriateness | Partial | Hook-scene constraints plus L8 quality/model evidence; dedicated closure review required |

## PX-LUMI-07 closure

`PX-LUMI-07-WORLD-TIME-001` executes production `WorldClock`, `computeAbsencePolicy` and `BudgetPlanner` code and emits runtime narrative evidence.

Validated behavior:

1. world time advances and never moves backward;
2. a recent/relevant NPC enters the simulation relevance budget;
3. a stale low-relevance NPC is ignored;
4. nine-day inactivity enters limited mode and disables autonomous NPC decisions;
5. ten-day inactivity enters frozen mode with zero simulation budget and zero NPC allocations.

Validation evidence:

- Workflow: `ULTEF PX-LUMI #3`
- Result: **PASS**
- Head: `811ed02451d48ebb3522b95fd18083f413426d34`
- Evidence artifact: `ultef-px-lumi-evidence`
- Artifact digest: `sha256:f4623b0a493a1c14211301c692bdfa63d0aae03a15383b11abbc622616c6fd80`
- Provider cost: `0`

The first run exposed a test-harness error where an already phase-reduced policy budget was passed into `BudgetPlanner`, causing the phase reduction to be applied twice. Production behavior was correct; the harness was corrected to pass the base simulation budget and verify that planner output matches the policy budget.

## PX-LUMI-04 blocker finding

Repository inspection established three separate facts:

1. `@lumi/profiles` validates emotion values to the canonical `0..1` range, persists a supplied vector transactionally and emits `CHARACTER_EMOTION_UPDATED`.
2. `@lumi/npc-intelligence` carries an emotion vector in `DecisionContextBuilder`, and `UtilityEvaluator` uses `joy`, `trust`, `fear`, `anger` and `sadness` to calculate `emotionalComfort`.
3. The production links between those components are incomplete: no event-to-directional-emotion-delta evaluator was found, and `@lumi/context` currently exports only `InMemoryEmotionalStateAdapter` rather than a persisted profile-backed adapter.

Therefore `PX-LUMI-04` is correctly **BLOCKED**, not PASS and not a component-level FAIL. Passing a hand-built vector directly between these components would only test a synthetic handoff and would violate the PX-LUMI runtime-evidence rule.

Proposed eventual closure scenario: `PX-LUMI-04-EMOTION-DECISION-001`.

## Next verification target

While PX-LUMI-04 remains an implementation blocker, verification work should continue on gates that may already have sufficient runtime evidence. The next review target is `PX-LUMI-08 NPC Background Life`, followed by `PX-LUMI-02 Character Continuity` and `PX-LUMI-10 Age Appropriateness`.

## Closure rule

A PX gate is not marked closed merely because related unit tests exist. Stateful gates require a meaningful runtime timeline/state-delta evidence artifact as defined by the PX-LUMI catalog.
