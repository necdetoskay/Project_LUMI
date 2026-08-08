# ULTEF-LUMI Sprint 00 — Coverage Matrix

Status: INITIAL MAPPING
Date: 2026-08-08

This matrix classifies verified repository capabilities into ULTEF levels. `PARTIAL` means meaningful coverage exists but the level is not yet proven end-to-end. `UNKNOWN` means the current discovery pass has not established enough evidence. `MISSING` is reserved for a capability that has been positively checked and not found.

## Current matrix

| Level | Status | Verified repository evidence | Main gap before COVERED |
|---|---|---|---|
| L0 Contract | PARTIAL | Zod-driven validation is used in application/web paths; package unit suites exist | enumerate explicit contract/schema/event tests and map them by ID |
| L1 Domain | PARTIAL | `@lumi/world`, `@lumi/story`, `@lumi/npc-intelligence`, `@lumi/profiles`, `@lumi/simulation` all expose Vitest unit suites | classify domain invariants by aggregate/engine and identify missing invariants |
| L2 Infrastructure | PARTIAL | world/story/npc-intelligence/profiles/simulation each expose dedicated `test:int`; migration scripts exist | prove actual DB execution, transaction/rollback/reload/idempotency coverage; expose guarded skips |
| L3 Component / Agent | PARTIAL | package-level Vitest suites cover major engines/components | build engine-by-engine map and narrative evidence for behavior-oriented tests |
| L4 Integration | PARTIAL | dedicated integration configs exist across core packages; recent delivery history records guarded integration tests | map cross-package and multi-engine chains; distinguish executed vs skipped integration cases |
| L5 Quality | UNKNOWN | no dedicated quality-eval harness verified in this pass | rubric + deterministic/heuristic/judge evaluation suite |
| L6 Golden Headless E2E | UNKNOWN | no canonical full headless story journey verified yet | implement `L6-GOLDEN-001` with execution narrative and persisted state reload |
| L7 Adversarial / Regression | PARTIAL/UNKNOWN | existing unit suites likely include regression and edge cases, but no formal ULTEF adversarial catalog yet | tag/map regressions; add malformed provider output, duplicate/out-of-order, concurrency, offline boundaries |
| L8 Real Provider / Model Eval | UNKNOWN | no dedicated model benchmark harness verified yet | golden dataset + provider/model quality/cost/latency runner |
| L9 UI E2E | PARTIAL | `@lumi/web` already exposes Playwright `test:e2e` and `test:e2e:ui` | inventory actual scenarios, browser prerequisites and CI execution |

## Project extension gates

| Gate | Status | Existing likely sources | Required proof |
|---|---|---|---|
| PX-LUMI-01 Universe Continuity | PARTIAL/UNKNOWN | world + story integration | state survives story/session boundaries and reload |
| PX-LUMI-02 Character Continuity | PARTIAL/UNKNOWN | profiles + world + story | character identity/state persists and is reused correctly |
| PX-LUMI-03 Memory Coherence | UNKNOWN | story/NPC intelligence | observed/rumor/fact memory is stored, attributed and later used correctly |
| PX-LUMI-04 Emotional Consistency | UNKNOWN | future/current emotion/decision components | emotion deltas match events and influence subsequent behavior consistently |
| PX-LUMI-05 Story Consequence | PARTIAL/UNKNOWN | story outcome + world commit flows | a choice/event causes the intended durable world consequence |
| PX-LUMI-06 Child / Household Isolation | PARTIAL | profiles + web authorization tests | cross-household/child access never leaks state or opportunities |
| PX-LUMI-07 World Time Progression | PARTIAL/UNKNOWN | simulation package | elapsed-time policy, decay and freeze boundaries are deterministic |
| PX-LUMI-08 NPC Background Life | PARTIAL/UNKNOWN | npc-intelligence + simulation | autonomous/background actions occur only when eligible and create bounded effects |
| PX-LUMI-09 Story Outcome & World State Commit | PARTIAL | recent quest/outbox/applicator/world commit work | before/after snapshot delta, idempotency, reload and indirect-effect verification |
| PX-LUMI-10 Age Appropriateness | UNKNOWN | story generation constraints | deterministic constraints plus quality evaluation evidence |

## Verified test infrastructure

- `@lumi/world`: Vitest unit + dedicated integration config.
- `@lumi/story`: Vitest unit + dedicated integration config.
- `@lumi/npc-intelligence`: Vitest unit + dedicated integration config.
- `@lumi/profiles`: Vitest unit + dedicated integration config.
- `@lumi/simulation`: Vitest unit + dedicated integration config.
- `@lumi/web`: Vitest unit/load projects + Playwright E2E.

## Coverage rule

A level moves to `COVERED` only when:

1. its required scenarios are explicitly enumerated;
2. scenarios have stable ULTEF IDs;
3. mandatory scenarios actually execute;
4. execution evidence records PASS/FAIL/BLOCKED truthfully;
5. behavior-oriented scenarios include readable execution narrative where useful;
6. stateful scenarios include before/after deltas and persistence/reload checks where applicable.

Raw test count is never sufficient by itself.
