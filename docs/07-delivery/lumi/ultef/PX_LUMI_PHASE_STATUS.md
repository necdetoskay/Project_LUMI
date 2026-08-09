# PX-LUMI Verification Phase Status

Status: **IN PROGRESS — 2 production blockers remain**  
Started: 2026-08-09

Generic ULTEF L0-L9 production-readiness work is closed. This phase verifies the Project LUMI-specific extension gates from `PX_LUMI_GATE_CATALOG.md` without duplicating evidence that already exists.

## Current evidence map

| Gate | Current assessment | Evidence / next action |
| --- | --- | --- |
| PX-LUMI-01 Universe Continuity | Strong existing evidence | L6 Golden, scene-session persistence, long-horizon and commit/reload gates; formal closure review remains |
| PX-LUMI-02 Character Continuity | **BLOCKED — production character-context wiring** | Character persistence primitives exist, but mutated character state is not loaded by the production story-continuity adapter. See `PX_LUMI_02_CHARACTER_CONTINUITY_BLOCKER.md`. |
| PX-LUMI-03 Memory Coherence | Strong existing evidence | Household-scoped hearsay belief + materialized rumor + later-story continuity; formal closure review remains |
| PX-LUMI-04 Emotional Consistency | **BLOCKED — production emotion wiring** | Bounded persistence and utility consumption exist, but event→emotion-delta derivation and persisted-emotion→decision-context production wiring are missing. See `PX_LUMI_04_EMOTIONAL_CONSISTENCY_BLOCKER.md`. |
| PX-LUMI-05 Story Consequence | Strong existing evidence | Choice/world divergence, generated scene/session, outcome commit; formal closure review remains |
| PX-LUMI-06 Child / Household Isolation | Strong existing evidence | Isolation matrix, concurrency, IDOR and L6 evidence; formal closure review remains |
| PX-LUMI-07 World Time Progression | **EXECUTED PASS** | `PX-LUMI-07-WORLD-TIME-001`; refreshed in ULTEF PX-LUMI #12 |
| PX-LUMI-08 NPC Background Life | **EXECUTED PASS** | L3 autonomous rumor semantics + L4 opportunity→hook trace + DB-backed materialized rumor/idempotency |
| PX-LUMI-09 Story Outcome & World State Commit | Strong existing evidence | `PX-LUMI-09-001/002`, recovery, reload and idempotency gates; formal closure review remains |
| PX-LUMI-10 Age Appropriateness | **EXECUTED PASS** | Fresh L4 age-aware generation evidence + closed L8 human-reviewed/live-provider evidence |

## PX-LUMI-07 closure

`PX-LUMI-07-WORLD-TIME-001` executes production `WorldClock`, `computeAbsencePolicy` and `BudgetPlanner` code and emits runtime narrative evidence.

Validated behavior:

1. world time advances and never moves backward;
2. a recent/relevant NPC enters the simulation relevance budget;
3. a stale low-relevance NPC is ignored;
4. nine-day inactivity enters limited mode and disables autonomous NPC decisions;
5. ten-day inactivity enters frozen mode with zero simulation budget and zero NPC allocations.

Latest validation evidence:

- Workflow: `ULTEF PX-LUMI #12`
- Result: **PASS**
- Head: `4e2be6ddfed44c47f558c4eaf15aa3db65860563`
- Evidence artifact: `ultef-px-lumi-evidence`
- Artifact digest: `sha256:8575a41402aa7bc24ce10a051bf118e8d32b9a04325c5bdef3f59fc3f9b97c0b`
- Provider cost: `0`

The first PX-07 run exposed a test-harness error where an already phase-reduced policy budget was passed into `BudgetPlanner`, causing the phase reduction to be applied twice. Production behavior was correct; the harness was corrected to pass the base simulation budget and verify that planner output matches the policy budget.

## PX-LUMI-08 closure

PX-LUMI-08 is closed from complementary runtime evidence rather than a duplicated monolithic test.

### Autonomous rumor behavior

`L3-NPC-001` runs the production `RumorPropagationEngine` and proves:

- an autonomous same-household NPC rumor propagation is derived from the supplied NPC/world context;
- a foreign-household NPC is excluded;
- first-hop confidence deterministically decays from `1.0` to `0.8`;
- provenance records source and recipient.

Latest provider-free execution: `ULTEF PX-LUMI #12` — **PASS**.

### Opportunity → StoryHook trace

`L4-OPPORTUNITY-HOOK-001` executes the real web composition route and proves that an accepted NPC rumor opportunity is traceably carried through household/child/character/world/session resolution into `StoryHook` creation. Package adapters are controlled test doubles, so this scenario intentionally does not claim DB persistence.

Latest provider-free execution: `ULTEF PX-LUMI #12` — **PASS**.

### Materialization and idempotency

`PX-LUMI-09-002` executes against disposable PostgreSQL and proves that a pending `npc_rumor_spread` outbox intent becomes a persisted hearsay belief, preserves claim/confidence/provenance, survives reload, marks the outbox applied, and is not reprocessed on a second propagation pass.

This scenario is part of the blocking ULTEF DB integration profile, which remains green on the PX branch validation rounds.

Together these scenarios satisfy PX-LUMI-08's autonomous action, rumor semantics, traceability and required idempotency assertions without pretending that a test-double route proves persistence.

## PX-LUMI-10 closure

PX-LUMI-10 is closed by combining fresh deterministic generation-context evidence with the already-closed L8 real-provider/human-calibrated evidence.

### Fresh L4 evidence

`L4-HOOK-SCENE-001` proves that:

- synthetic child age band `6-8` is present in the generation settings and prompt;
- the configured content boundary is carried into generation;
- the generated scene is explicitly child-safe and passes the production output schema validation.

Latest execution:

- Workflow: `ULTEF PX-LUMI #12`
- Result: **PASS**
- Head: `4e2be6ddfed44c47f558c4eaf15aa3db65860563`
- Artifact: `ultef-px-lumi-evidence`
- Digest: `sha256:8575a41402aa7bc24ce10a051bf118e8d32b9a04325c5bdef3f59fc3f9b97c0b`

### L8 semantic/live-provider evidence

Canonical L8 closure already proves:

- age-appropriateness is part of the deterministic scenario pack;
- prohibited/adversarial child-safety cases are safely redirected;
- the human-reviewed semantic reference set is complete `18/18` across age appropriateness, personality/emotion consistency and choice influence;
- age-appropriateness human-grounded calibration MAE is `0.583`;
- semantic stability passed `3/3` repeated calibrations;
- three provider-family candidates were evaluated with repeated real story generations;
- provider/model changes are controlled by the champion/challenger re-evaluation policy;
- ordinary PR CI remains provider-cost-free.

Therefore no new paid provider call is required to close PX-LUMI-10 while the evaluated model policy remains unchanged.

## PX-LUMI-02 blocker finding

The Golden Journey proves stable Arin identity across sessions and `@lumi/profiles` provides durable character mutation primitives. `StorySceneGenerationService` also accepts `characterId` through its continuity input. However, the production `NpcBeliefStoryContinuityContextAdapter` currently uses only household/world-scoped NPC beliefs and does not load character trait, inventory, relationship or other mutated character-domain state.

PX-LUMI-02 therefore cannot honestly prove `persisted character mutation → later production story context` today. See `PX_LUMI_02_CHARACTER_CONTINUITY_BLOCKER.md`.

Proposed eventual closure scenario: `PX-LUMI-02-CHARACTER-RELOAD-STORY-001`.

## PX-LUMI-04 blocker finding

Repository inspection established three separate facts:

1. `@lumi/profiles` validates emotion values to the canonical `0..1` range, persists a supplied vector transactionally and emits `CHARACTER_EMOTION_UPDATED`.
2. `@lumi/npc-intelligence` carries an emotion vector in `DecisionContextBuilder`, and `UtilityEvaluator` uses `joy`, `trust`, `fear`, `anger` and `sadness` to calculate `emotionalComfort`.
3. The production links between those components are incomplete: no event-to-directional-emotion-delta evaluator was found, and `@lumi/context` currently exports only `InMemoryEmotionalStateAdapter` rather than a persisted profile-backed adapter.

Therefore PX-LUMI-04 is correctly **BLOCKED**, not PASS and not a component-level FAIL. Passing a hand-built vector directly between these components would only test a synthetic handoff and would violate the PX-LUMI runtime-evidence rule.

Proposed eventual closure scenario: `PX-LUMI-04-EMOTION-DECISION-001`.

## Next verification target

The remaining non-blocked gates now need formal evidence-closure review rather than new tests by default:

1. PX-LUMI-01 Universe Continuity;
2. PX-LUMI-03 Memory Coherence;
3. PX-LUMI-05 Story Consequence;
4. PX-LUMI-06 Child / Household Isolation;
5. PX-LUMI-09 Story Outcome & World State Commit.

New tests should only be added where this review finds a genuine missing runtime assertion.

## Closure rule

A PX gate is not marked closed merely because related unit tests exist. Stateful gates require a meaningful runtime timeline/state-delta evidence artifact as defined by the PX-LUMI catalog.
