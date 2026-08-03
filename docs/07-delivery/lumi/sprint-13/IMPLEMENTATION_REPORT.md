# Sprint 13 Implementation Report

**Sprint ID:** LUMI-S13
**Sprint Title:** NPC Intelligence Foundation
**Release Date:** 2026-08-03
**Branch:** `agent/sprint-13-npc-intelligence-foundation`
**Pull Request:** (pending — requires explicit merge approval)
**Status:** Implemented / Ready for review

---

## 1. Task Summary

| Task ID | Deliverable | Status |
| --- | --- | --- |
| S13-T01 | Perception/belief model | Complete |
| S13-T02 | Goal/need evaluator | Complete |
| S13-T03 | Decision context/vector | Complete |
| S13-T04 | Candidate/utility selector | Complete |
| S13-T05 | Decision trace/events | Complete |
| S13-T06 | Behavior fixtures/docs | Complete |

---

## 2. Files Changed

### New `packages/npc-intelligence`

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `eslint.config.mjs`
- `migrations/0001_npc_intelligence_schema.sql`
- `scripts/npc-migrate.mjs`
- `src/index.ts`

#### `src/domain`

- `errors.ts` — `NpcIntelligenceError` base + `InformationAccessError`, `CrossFamilyAccessError`, `InvalidWeightPolicyError`, `SelectionFailedError`.
- `validation.ts` — `clamp01`, `assertFiniteNumber`, `assertConfidence`, `assertNonEmptyString`.
- `hash.ts` — sha256 `hashString`, `hashJson`, and key-order-independent `hashStable`.
- `seeded-rng.ts` — deterministic seeded PRNG (hash-seeded splitmix).
- `perception.ts` — fact categories, sensitivity, reach, `RawWorldFact`, `PerceivedFact`, `PerceptionWindow`, `PerceptionBuildInput`, `DIRECTLY_OBSERVABLE_REACHES`.
- `belief.ts` — belief sources/statuses, `Belief`, `isActiveBelief`, `validateBelief`.
- `needs.ts` — `NeedPressure`, `NeedConditionEffects`, `CONDITION_EFFECTS`, `NeedEvaluationInput/Result`.
- `goals.ts` — `GoalEvaluation`, `GoalEvaluationInput/Result`.
- `decision-context.ts` — `RelationshipContext`, `DecisionContextVector`, `DecisionContextBuildInput`.
- `candidate.ts` — `CandidateAction`, `CandidateSafety`.
- `utility.ts` — `UtilityWeights`, `UtilityWeightPolicy`, `UtilityComponents`, `UtilityScore`, `validateWeightPolicy`, `computeUtilityScore`.
- `decision-trace.ts` — `TraceStep`, `Elimination`, `DecisionTrace`, `NpcDecisionEvent`, `SAFE_STEP_KEYS`, `computeTraceHash`, `sanitizeTrace`.
- `index.ts`

#### `src/ports`

- `character-source.port.ts` (`NpcCharacterSnapshot`, `NpcCharacterSourcePort`)
- `world-source.port.ts` (`NpcPerceptionInput`, `NpcWorldSourcePort`)
- `belief-source.port.ts` (`NpcBeliefSourcePort`)
- `safety-source.port.ts` (`NpcSafetySnapshot`, `NpcSafetySourcePort`)
- `decision-store.port.ts` (`NpcDecisionStorePort`)
- `index.ts`

#### `src/application`

- `perception.service.ts` — `PerceptionService` (observation vs belief reach, cross-family guard).
- `belief.service.ts` — `BeliefService` (active-belief filtering, validation, scope guards).
- `need-evaluator.service.ts` — `NeedEvaluator` (need-state + condition pressure, urgency, dominant need).
- `goal-evaluator.service.ts` — `GoalEvaluator` + `toNeedPressureLookup`.
- `decision-context-builder.service.ts` — `DecisionContextBuilder` (deterministic `contentHash`).
- `candidate-templates.ts` — 10 static `CANDIDATE_TEMPLATES` + `computePersonalityFit`.
- `candidate-generator.service.ts` — `CandidateGenerator` (perception-gated generation).
- `safety-components.ts` — `SAFETY_COMPONENT` mapping.
- `utility-evaluator.service.ts` — `UtilityEvaluator` (weighted component scoring).
- `decision-selector.service.ts` — `DecisionSelector` (elimination + seeded tie-break).
- `index.ts`

#### `src/db`

- `client/index.ts` — postgres-js drizzle `createDatabase/getDatabase/getNpcDb`.
- `schema/npc-intelligence/*` — `schemas.ts`, `common.ts`, `decision-traces.ts`, `decision-events.ts`, `relations.ts`, `index.ts`.
- `repositories/interfaces/npc-decision.repository.ts` — `NpcDecisionRepository`.
- `repositories/drizzle/drizzle-npc-decision.repository.ts` — `DrizzleNpcDecisionRepository` (idempotent insert, household/npc filtering).
- `repositories/index.ts`, `index.ts`.

#### `tests`

- `tests/application/*` — perception (7), need-evaluator (6), goal-evaluator (4), decision-context-builder (5), candidate-generator (6), utility-evaluator (5), decision-selector (6), decision-pipeline regression (4).
- `tests/fixtures/decision.fixtures.ts` — reusable trace/candidate/score/event builders.
- `tests/integration/decision-store.integration.test.ts` — env-guarded DB round-trip, isolation, idempotency.

### New `docs/`

- `docs/07-delivery/lumi/sprint-13/IMPLEMENTATION_REPORT.md` (this file).

### Modified

- `pnpm-lock.yaml` — workspace package registration.
- `docs/07-delivery/lumi/sprint-13/SPRINT_SPEC.md` — status column update (below).

---

## 3. Perception and Belief Model (S13-T01)

- `PerceptionService.buildWindow` enforces three rules:
  1. raw facts/beliefs from another household throw `CrossFamilyAccessError`;
  2. `personal`-sensitivity facts never enter an NPC decision window;
  3. directly observable reaches pass with their own confidence; distant facts require an active belief and are capped at `min(fact.confidence, belief.confidence)`.
- `BeliefService` filters to active beliefs (status + expiry) and guards npc/household scope before returning records.
- `RawWorldFact.confidence` was added to the domain model so distant-fact confidence can be combined with belief confidence.

Evidence: `tests/application/perception.service.test.ts` (cross-family, belief-cap, personal-filter, expiry).

---

## 4. Need and Goal Evaluation (S13-T02)

- `NeedEvaluator` blends `need_state` pressure (current value + decay) with `condition` pressure from the `CONDITION_EFFECTS` table (e.g. `injured` raises safety/rest and time sensitivity).
- Urgency = `current + decay * timeSensitivity`; the dominant need is the highest-urgency pressure with a deterministic name tie-break; aggregate urgency is the mean of the top three pressures.
- `GoalEvaluator` gives pull only to active goals: `priority * 0.5 + needPressure * 0.4 + timeSensitivity * 0.1`, with priority-then-id tie-break for the leading goal.
- Table-driven unit tests cover dominance, condition lifting (an injured NPC prioritizes safety), and goal pull computation.

Evidence: `tests/application/need-evaluator.service.test.ts`, `tests/application/goal-evaluator.service.test.ts`.

---

## 5. Decision Context Vector (S13-T03)

- `DecisionContextBuilder` assembles traits, emotions, influence, relationships, need pressures, goals, time sensitivity and urgency into a single vector.
- `contentHash` is computed with `hashStable` (key-sorted sha256), so the same state always yields the same hash regardless of object key order.
- Nested inputs are cloned so later mutation cannot corrupt an emitted vector.

Evidence: `tests/application/decision-context-builder.service.test.ts` (hash determinism, difference on state change, clamping, clone isolation).

---

## 6. Candidate Generation, Utility and Selection (S13-T04)

- `CandidateGenerator` instantiates candidates from a static template catalog only when the NPC perceives the required fact category or a nearby character; the same input + seed is deterministic.
- `UtilityEvaluator` scores each candidate as a weighted sum (`computeUtilityScore`) over need satisfaction, emotional comfort, safety, goal alignment, relationship impact, social approval, curiosity, personality fit, time sensitivity, and cost penalties; the policy is versioned and validated.
- `DecisionSelector` eliminates `blocked` candidates first, then eliminates low-personality-fit candidates unless a strong matching need pressure (`>= 0.6`) justifies them; the winner is the top utility score with seeded-RNG tie-break.

Evidence: `tests/application/candidate-generator.service.test.ts`, `utility-evaluator.service.test.ts`, `decision-selector.service.test.ts`.

---

## 7. Decision Trace and Events (S13-T05)

- `migrations/0001_npc_intelligence_schema.sql` creates the `npc_intelligence` schema, `decision_traces` and `decision_events` with check constraints (`chk_npc_trace_seed/hash/reason`, `chk_npc_event_type/version`), indexes, and an idempotent migration ledger. Forward-only.
- `DrizzleNpcDecisionRepository` implements `saveTrace`, `listTraces(householdId, npcId, limit)`, `saveEvent` with `onConflictDoNothing` idempotency; traces are isolated by household/npc at query time.
- `sanitizeTrace` strips step data to the `SAFE_STEP_KEYS` safelist and clears `requiredFactIds` so private child data can never leak through an externally exposed trace.

Evidence: `tests/integration/decision-store.integration.test.ts` (env-guarded, requires `NPC_TEST_ENABLE_DESTRUCTIVE=true`; round-trip, JSON fidelity, cross-household isolation, event idempotency).

---

## 8. Behavior Fixtures and Docs (S13-T06)

- `tests/fixtures/decision.fixtures.ts` provides reusable builders for candidates, trace steps, scores, traces, events, and the default weight policy.
- `tests/application/decision-pipeline.regression.test.ts` wires perception → need → goal → context → candidate → utility → selection end-to-end and asserts determinism, selection, time-sensitivity, and perception gating.

Evidence: `tests/application/decision-pipeline.regression.test.ts` (4 tests).

---

## 9. Verification Commands and Results

```powershell
pnpm --filter @lumi/npc-intelligence test        # 8 files, 43 tests PASS
pnpm --filter @lumi/npc-intelligence typecheck   # PASS
pnpm --filter @lumi/npc-intelligence lint        # PASS
# optional, with local PostgreSQL:
$env:NPC_TEST_ENABLE_DESTRUCTIVE="true"
$env:DATABASE_URL="postgresql://lumi:lumi_local_only@localhost:15432/lumi"
pnpm --filter @lumi/npc-intelligence test:int    # 1 file, 4 tests PASS
```

---

## 10. Acceptance Criteria Traceability

| Acceptance Criterion | Source Location | Test | Result |
| --- | --- | --- | --- |
| Aynı state/policy deterministic candidate ve seçim üretir | `candidate-generator` + `decision-selector` (seeded) | `candidate-generator.service.test.ts`, `decision-pipeline.regression.test.ts` | PASS |
| Uzak/alakasız bilgi karar context'ine giremez | `PerceptionService` (reach + belief gate) | `perception.service.test.ts` | PASS |
| Yaralı NPC'nin ihtiyaç/zaman önceliği uygun biçimde artar | `CONDITION_EFFECTS` + `NeedEvaluator` | `need-evaluator.service.test.ts` | PASS |
| Personality boundary dışındaki eylem elenir veya güçlü kanıt gerektirir | `DecisionSelector` (boundary + strong need) | `decision-selector.service.test.ts` | PASS |
| Decision trace secret/özel veri sızdırmadan açıklanabilir | `sanitizeTrace` safelist | `decision-trace.ts` (safelist) | PASS |
| Cross-family NPC/belief erişimi engellenir | `PerceptionService`/`BeliefService` guards + repo filtering | `perception.service.test.ts`, `decision-store.integration.test.ts` | PASS |

---

## 11. Known Risks and Out-of-Scope Items

- Migration is authored and applied during the integration test run, but production deployment requires running `pnpm --filter @lumi/npc-intelligence npc:migrate` against the target database.
- The character/world/belief source ports (`NpcCharacterSourcePort`, `NpcWorldSourcePort`, `NpcBeliefSourcePort`) are defined but have no concrete adapters yet; Sprint 13 provides the domain/application/decision logic and the decision trace store. Wiring real character/world data into the pipeline is a follow-up.
- No UI was changed; no LLM-controlled utility scoring or state mutation is present (out of scope by design).

---

## 12. Rollback / Rollforward Plan

- The new `@lumi/npc-intelligence` package has no runtime consumers yet; it can be removed by deleting the package and the `pnpm-lock.yaml` registration without affecting `@lumi/story`, `@lumi/profiles`, `@lumi/ai`, or `@lumi/web`.
- Migration is forward-only; rollback requires restoring from a pre-migration backup.
- Weight policy is versioned, so a future policy change is rollback-safe by pointing at an older policy version; past decision traces are never mutated.
