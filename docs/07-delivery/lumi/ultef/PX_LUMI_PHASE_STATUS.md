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
| PX-LUMI-04 Emotional Consistency | Open | No dedicated PX runtime narrative scenario is registered yet |
| PX-LUMI-05 Story Consequence | Strong existing evidence | Choice/world divergence, generated scene/session, outcome commit |
| PX-LUMI-06 Child / Household Isolation | Strong existing evidence | Isolation matrix, concurrency, IDOR and L6 evidence |
| PX-LUMI-07 World Time Progression | Implementing | `PX-LUMI-07-WORLD-TIME-001` added in this phase |
| PX-LUMI-08 NPC Background Life | Strong / needs closure review | Rumor propagation, opportunity→hook, materialized propagation |
| PX-LUMI-09 Story Outcome & World State Commit | Strong existing evidence | `PX-LUMI-09-001/002`, recovery, reload and idempotency gates |
| PX-LUMI-10 Age Appropriateness | Partial | Hook-scene constraints plus L8 quality/model evidence; dedicated closure review required |

## First active scenario

`PX-LUMI-07-WORLD-TIME-001` executes production simulation code and must prove with runtime narrative evidence that:

1. world time never moves backward;
2. recent/relevant NPCs can enter the simulation relevance budget;
3. stale low-relevance NPCs are ignored;
4. nine-day inactivity uses limited mode and disables autonomous NPC decisions;
5. ten-day inactivity freezes background simulation with zero budget/allocations.

The scenario is deterministic and provider-free.

## Closure rule

A PX gate is not marked closed merely because related unit tests exist. Stateful gates require a meaningful runtime timeline/state-delta evidence artifact as defined by the PX-LUMI catalog.
