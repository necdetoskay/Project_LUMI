# L9 Start Plan — Production Readiness, Long-Horizon Reliability, and Operational Verification

Status: STARTED
Predecessor: L8 CLOSED

## Purpose

L9 verifies that LUMI remains safe, coherent, recoverable, observable, and operationally acceptable beyond short semantic/story-quality tests. L8 proved individual story-generation quality and model-selection evidence. L9 moves outward to sustained system behavior, production-style failure modes, longer-running world evolution, reliability, recovery, and operational gates.

## L9 primary objectives

1. Long-horizon end-to-end simulation
   - multi-session story progression,
   - repeated world-state commits,
   - NPC/background progression,
   - child-choice continuity across sessions,
   - inventory/memory/relationship persistence,
   - freeze/decay rules for long inactivity.

2. Reliability and SLO verification
   - API/service availability targets,
   - story-generation latency distribution,
   - database/queue/cache reliability where applicable,
   - timeout and retry behavior,
   - provider-error recovery,
   - fallback-model routing.

3. Recovery and fault tolerance
   - provider outage,
   - malformed model output,
   - partial transaction failure,
   - retry/idempotency under faults,
   - restart/reboot recovery,
   - stale or duplicated event handling.

4. State integrity under extended use
   - no impossible world-state transitions,
   - no duplicate rewards/items,
   - no lost outcome commits,
   - no cross-household/profile leakage,
   - relationship/memory consistency,
   - deterministic rollback/repair evidence.

5. Production observability
   - structured operational evidence,
   - trace/correlation identifiers across a story lifecycle,
   - meaningful error classification,
   - metrics for story success/failure/retry/fallback,
   - audit trail for state-changing operations.

6. Cost and model-routing resilience
   - Champion/Fallback behavior under provider failure,
   - bounded retry budget,
   - no retry storms,
   - cost evidence per representative journey,
   - routing decisions observable and attributable.

7. Adversarial and red-team expansion
   - larger child-safety pack,
   - prompt injection / instruction conflict scenarios,
   - continuity manipulation attempts,
   - world-state contradiction attempts,
   - repeated/adaptive adversarial interaction across sessions.

## First canonical L9 journey

`L9-LONG-HORIZON-001`

A synthetic household/child universe executes a production-style sequence containing multiple story sessions and state commits. The journey must prove that user choices, NPC memory, relationships, inventory, rumors/opportunity hooks, and world state remain coherent over repeated interactions and simulated elapsed time.

Initial target profile:

- one isolated household,
- one child profile,
- one persistent universe,
- at least 10 sequential story/session cycles,
- deterministic seeded setup where practical,
- multiple choice branches,
- state snapshots before/after every commit,
- at least one controlled retry/idempotency event,
- at least one controlled provider/fallback fault,
- final invariant validation across all persisted state.

The first implementation may use deterministic/provider stubs for fault injection. Real-provider soak/cost tests remain manual and explicitly cost-controlled.

## Proposed L9 gate families

### L9-G1 — Long-horizon coherence
PASS when all required world/profile/story invariants survive the complete journey.

### L9-G2 — Commit/recovery integrity
PASS when injected failures cannot create partial, duplicated, or irrecoverable world-state commits.

### L9-G3 — Provider resilience
PASS when primary-provider failure results in bounded, observable fallback behavior without bypassing deterministic validation.

### L9-G4 — Operational latency/reliability
PASS when representative production-style journeys remain inside defined SLO thresholds. Thresholds must be evidence-derived rather than invented before measurement.

### L9-G5 — Isolation/security continuity
PASS when no household/profile/user data can bleed across concurrent or sequential journeys and security regressions remain green.

### L9-G6 — Observability/audit completeness
PASS when a failed or successful story lifecycle can be reconstructed from retained structured evidence without relying on console-only logs.

### L9-G7 — Extended adversarial safety
PASS when expanded multi-turn safety scenarios cannot cause unsafe state commits or unsafe story continuation.

## Execution strategy

L9 will be built incrementally. Do not begin with a huge opaque soak test.

Phase A — deterministic long-horizon harness
- construct L9-LONG-HORIZON-001,
- reuse existing L2-L6 state/commit invariants,
- add snapshot comparison and aggregate final invariant checks.

Phase B — controlled fault injection
- provider timeout/failure,
- malformed generation,
- duplicate/retry delivery,
- commit interruption/recovery.

Phase C — observability and SLO evidence
- collect latency and success/failure distribution,
- define evidence-based thresholds,
- add machine-readable operational summary.

Phase D — live-provider production-style validation
- manual/cost-controlled only,
- Champion plus preferred fallback,
- bounded sample count,
- retain raw provider/routing evidence.

Phase E — L9 closure
- all mandatory gates green on one closure head,
- no paid provider probe in ordinary PR CI,
- explicit deferred production concerns documented.

## Immediate next work

1. inventory reusable L2-L6 helpers for long-horizon state setup, snapshots, and outcome commits;
2. define the exact invariant matrix for `L9-LONG-HORIZON-001`;
3. implement a deterministic 10-cycle journey first;
4. add one idempotency/retry fault into that journey;
5. produce JSON + Markdown evidence;
6. only then add provider/fallback fault injection.

## Non-goals for the first L9 slice

- unlimited-duration soak testing,
- real production traffic,
- automatic paid-provider tests on every PR,
- arbitrary scale/load targets without baseline measurements,
- replacing deterministic gates with LLM judging.

## L9 entry decision

L9 is STARTED after formal L8 closure. The first engineering target is `L9-LONG-HORIZON-001`, with deterministic repeatable evidence before any new paid live-provider work.
