# PX-LUMI Verification Phase Status

Status: **AUDIT COMPLETE — 7 PASS / 3 PRODUCTION BLOCKERS**  
Started: 2026-08-09

Generic ULTEF L0-L9 production-readiness work is closed. This phase verifies the Project LUMI-specific extension gates from `PX_LUMI_GATE_CATALOG.md` without duplicating evidence that already exists.

## Current evidence map

| Gate | Current assessment | Evidence / next action |
| --- | --- | --- |
| PX-LUMI-01 Universe Continuity | **EXECUTED PASS** | L6 Golden + world-scoped continuity + long-horizon/reload evidence |
| PX-LUMI-02 Character Continuity | **BLOCKED — production character-context wiring** | Mutated persisted character state is not loaded by the production story-continuity adapter. See `PX_LUMI_02_CHARACTER_CONTINUITY_BLOCKER.md`. |
| PX-LUMI-03 Memory Coherence | **EXECUTED PASS** | New DB-backed direct-observation/hearsay/non-fabrication gate + existing materialized/later-story memory evidence |
| PX-LUMI-04 Emotional Consistency | **BLOCKED — production emotion wiring** | Event→emotion-delta derivation and persisted-emotion→decision-context wiring are missing. See `PX_LUMI_04_EMOTIONAL_CONSISTENCY_BLOCKER.md`. |
| PX-LUMI-05 Story Consequence | **BLOCKED — production choice→world handoff** | Choice consequence and world commit are independently proven, but no production handoff connects them. See `PX_LUMI_05_STORY_CONSEQUENCE_BLOCKER.md`. |
| PX-LUMI-06 Child / Household Isolation | **EXECUTED PASS** | Household denial/unchanged-state evidence + belief isolation + concurrent session/commit/idempotency isolation |
| PX-LUMI-07 World Time Progression | **EXECUTED PASS** | `PX-LUMI-07-WORLD-TIME-001` runtime evidence |
| PX-LUMI-08 NPC Background Life | **EXECUTED PASS** | Autonomous rumor semantics + opportunity→hook trace + DB-backed materialized rumor/idempotency |
| PX-LUMI-09 Story Outcome & World State Commit | **EXECUTED PASS** | Transactional/idempotent commit + materialized indirect effects + recovery/reload evidence |
| PX-LUMI-10 Age Appropriateness | **EXECUTED PASS** | Fresh L4 age-aware generation + closed L8 human-reviewed/live-provider evidence |

## PX-LUMI-03 closure

`PX-LUMI-03-MEMORY-COHERENCE-001` closes the final explicit memory-coherence evidence gap with real PostgreSQL and the production story-continuity adapter.

The scenario persisted two distinct Bora beliefs in the same household/world:

- a `direct_observation` with confidence `0.95`;
- a `hearsay` belief with confidence `0.80` and provenance `Mira`.

It then proved after reload that:

1. direct observation remains source-distinct as `direct_observation`;
2. hearsay retains provenance-bearing source semantics (`hearsay:Mira`);
3. both persisted facts reach the later story-generation context;
4. a deliberately absent memory is not returned by the adapter;
5. the absent memory is not fabricated into the generated prose.

Validation evidence:

- Workflow: `ULTEF Integration #379`
- Step: `Run PX-LUMI-03 memory coherence`
- Result: **PASS**
- Head: `70254ccfa61ae733a4eba1fdbb3b4db103cbbe95`
- Evidence artifact: `ultef-db-integration-evidence`
- Artifact digest: `sha256:dd590468cd7e3c2672729a432bc9cfef60be7bb54d42ad4dee1bd207a5a8cc2b`
- Provider cost: `0` (deterministic provider double)

Together with existing rumor propagation, materialized hearsay and later-story continuity evidence, PX-LUMI-03 is closed.

## PX-LUMI-01 / 06 / 09 closure review

The formal evidence mapping is recorded in `PX_LUMI_EVIDENCE_CLOSURE_REVIEW.md`.

- **PX-LUMI-01** is closed by Golden world/session continuity, world-scoped later-context isolation and long-horizon world progression.
- **PX-LUMI-06** is closed by foreign-household denial with unchanged protected state, persisted belief isolation, story-session IDOR regression and DB-backed concurrent tenant isolation.
- **PX-LUMI-09** is closed by valid manifest application, transactional/idempotent world commit, materialized indirect effects, reload, retry/crash recovery and later continuity.

No duplicate gate-only test was added where these runtime narratives already satisfy the catalog.

## PX-LUMI-07 closure

`PX-LUMI-07-WORLD-TIME-001` executes production `WorldClock`, `computeAbsencePolicy` and `BudgetPlanner` code.

It proves forward-only time, relevance filtering, nine-day limited mode and ten-day zero-budget freeze behavior.

Latest consolidated PX evidence:

- Workflow: `ULTEF PX-LUMI #12`
- Result: **PASS**
- Head: `4e2be6ddfed44c47f558c4eaf15aa3db65860563`
- Evidence artifact: `ultef-px-lumi-evidence`
- Artifact digest: `sha256:8575a41402aa7bc24ce10a051bf118e8d32b9a04325c5bdef3f59fc3f9b97c0b`
- Provider cost: `0`

The first PX-07 run exposed a test-harness error where an already reduced policy budget was passed into `BudgetPlanner`; production behavior was correct and the harness was fixed to use the base simulation budget.

## PX-LUMI-08 closure

PX-LUMI-08 is closed from complementary runtime evidence rather than a duplicated monolithic test:

- `L3-NPC-001` — autonomous same-household rumor propagation, deterministic confidence decay and foreign-household exclusion;
- `L4-OPPORTUNITY-HOOK-001` — accepted NPC opportunity trace through production web composition into `StoryHook`;
- `PX-LUMI-09-002` — DB-backed materialization into persisted hearsay state with provenance, reload and duplicate-free second pass.

The first two were refreshed in `ULTEF PX-LUMI #12`; the materialized propagation remains part of the blocking DB integration profile.

## PX-LUMI-10 closure

Fresh `L4-HOOK-SCENE-001` evidence proves the synthetic `6-8` age band and content boundary enter generation and produce a schema-valid child-safe scene.

Canonical L8 closure additionally proves:

- age appropriateness is a deterministic hard/quality concern;
- adversarial child-safety cases are redirected;
- human review is complete `18/18` across the calibration set;
- age-appropriateness calibration MAE is `0.583`;
- semantic stability passed `3/3` repeats;
- three real provider families were repeatedly evaluated;
- champion/challenger policy requires model-change re-evaluation;
- normal PR verification stays provider-cost-free.

No additional paid provider call was required because the evaluated production model policy has not changed.

## Production blockers discovered by PX-LUMI

### PX-LUMI-02 — Character Continuity

Stable character identity and durable character mutation primitives exist, and story generation accepts `characterId`. However, the production `NpcBeliefStoryContinuityContextAdapter` currently loads NPC beliefs only; it does not load persisted character traits, inventory, relationships or other mutated character state into a later story prompt.

Required future closure scenario: `PX-LUMI-02-CHARACTER-RELOAD-STORY-001`.

### PX-LUMI-04 — Emotional Consistency

Bounded emotion persistence and emotion-aware utility evaluation exist. Missing production links are:

- event → directional bounded emotion delta;
- persisted profile emotion → production decision/context input.

Required future closure scenario: `PX-LUMI-04-EMOTION-DECISION-001`.

### PX-LUMI-05 — Story Consequence

`commitChoice()` validates and persists a real selected option/consequence; world commit is separately durable and idempotent. But no production orchestration was found that derives the canonical outcome/world commit from the persisted choice consequence. Current choice-world divergence evidence builds the outcome manifest inside the test, which cannot prove the missing causal boundary.

Required future closure scenario: `PX-LUMI-05-CHOICE-CONSEQUENCE-CONTINUITY-001`.

## Phase decision

ULTEF has completed the PX-LUMI verification audit without hiding implementation gaps behind mocks.

- **7 gates are evidence-closed / PASS.**
- **3 gates are BLOCKED by missing production composition boundaries.**
- There are no remaining unexplained test-only gaps in the current PX catalog.

The three blocked gates should be resolved through explicit implementation work, then their named closure scenarios should be added and this PX phase can be fully closed.
