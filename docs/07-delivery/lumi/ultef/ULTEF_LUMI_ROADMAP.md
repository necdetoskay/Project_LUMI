# Project LUMI — ULTEF Test Strategy & Roadmap

Status: Canonical implementation roadmap
Date: 2026-08-08

## 1. Purpose

Project LUMI adopts ULTEF as its primary verification framework. A feature is not considered complete merely because its implementation exists: the relevant ULTEF gates must execute, pass, and produce reviewable execution evidence.

Core rule:

> Implemented is not equivalent to verified. Completion requires relevant ULTEF gates to PASS with evidence.

ULTEF remains generic. LUMI-specific behavioral verification is expressed through `PX-LUMI-*` project-extension gates.

## 2. ULTEF levels in LUMI

| Level | Responsibility | LUMI examples |
|---|---|---|
| L0 | Contract | schemas, API contracts, DTO/Zod validation, event/outcome formats |
| L1 | Domain | universe, character, NPC, memory, emotion/vector, inventory, story invariants |
| L2 | Infrastructure | PostgreSQL, Redis, migrations, persistence, transactions, rollback |
| L3 | Component / Agent | Decision, Emotion, Utility, Memory, NPC, World Simulation, Story engines |
| L4 | Integration | engine-to-engine chains, outbox/applicator flows, state propagation |
| L5 | Quality | narrative coherence, age appropriateness, consistency, repetition, safety |
| L6 | Golden Headless E2E | complete LUMI journeys without browser/UI dependency |
| L7 | Adversarial / Regression | malformed input, duplicate events, concurrency, old bug protection |
| L8 | Real Provider / Model Eval | model quality, latency, cost, compliance and failure rate |
| L9 | UI E2E | browser-visible parent/child/story flows |

## 3. Gate result model

Every ULTEF gate reports one of:

- `PASS` — required assertions and evidence are satisfied.
- `WARN` — execution succeeded but a non-blocking threshold or observation needs attention.
- `FAIL` — verification executed and a required assertion failed.
- `BLOCKED` — verification could not execute because a prerequisite, environment, provider or earlier mandatory gate is unavailable.

A `BLOCKED` result must never be silently represented as `PASS`.

## 4. Evidence model

Target artifact structure:

```text
artifacts/ultef/
  latest/
    summary.json
    summary.md
    failures.json
    evidence/
```

Evidence should identify at minimum:

- run ID and timestamp;
- git commit/ref;
- ULTEF level/gate;
- test/scenario identifier;
- result;
- duration;
- deterministic seed when applicable;
- provider/model when applicable;
- relevant input/output fingerprints;
- failure reason and reproduction information.

Secrets, child PII, raw credentials and unsafe provider payloads must not be written to evidence.

## 5. LUMI project-extension gates

Initial catalog:

- `PX-LUMI-01` Universe Continuity
- `PX-LUMI-02` Character Continuity
- `PX-LUMI-03` Memory Coherence
- `PX-LUMI-04` Emotional Consistency
- `PX-LUMI-05` Story Consequence
- `PX-LUMI-06` Child / Household Isolation
- `PX-LUMI-07` World Time Progression
- `PX-LUMI-08` NPC Background Life
- `PX-LUMI-09` Story Outcome & World State Commit
- `PX-LUMI-10` Age Appropriateness

The catalog is additive. New project-specific gates must not redefine generic L0-L9 semantics.

## 6. Golden headless journey

L6 is the central behavioral confidence layer for LUMI. The first canonical journey should cover:

```text
Create parent/household
→ create child profile
→ create universe/world
→ create character
→ start story session
→ generate scene
→ make choice
→ process NPC/world reaction
→ advance story
→ finish story
→ commit outcomes
→ reload persisted universe
→ start a later story/session
→ verify continuity from previous events
```

The journey must verify state, not merely HTTP success codes.

## 7. Story outcome verification

`PX-LUMI-09` compares world state before and after a story:

```text
World Snapshot A
→ story choices/events/NPC decisions
→ outcome manifest / commit pipeline
→ World Snapshot B
→ expected delta vs actual delta
```

Verification includes NPC state, relationships, inventory, quests, memories, world events, indirect effects, idempotency and persistence after reload.

## 8. Quality evaluation

L5 combines, where appropriate:

1. deterministic assertions;
2. heuristics/metrics;
3. LLM-as-judge evaluation.

Judge output is evidence, not unquestionable truth. Judge configuration, rubric and model identity must be versioned and recorded.

Initial quality dimensions include narrative coherence, character consistency, age appropriateness, repetition, meaningful choices, memory use, world consistency, emotional consistency, safety and educational suitability.

## 9. Real-model evaluation

L8 must be separable from deterministic CI. A common golden dataset should allow candidate models/providers to be compared on:

- quality;
- consistency;
- latency;
- token usage;
- estimated/actual cost;
- structured-output compliance;
- failure/retry rate.

A provider/model change must be evaluated through L5/L8 before being treated as production-safe.

## 10. Regression policy

Every material production or integration bug should, where feasible, become a permanent regression scenario:

```text
bug → reproduce → regression test → fix → permanent ULTEF protection
```

L7 also owns adversarial cases such as malformed model output, timeout/provider failure, duplicate/out-of-order events, invalid references, concurrency and offline-time boundary behavior.

## 11. CI cadence target

Initial target policy:

| Trigger | Gates |
|---|---|
| local/commit | L0-L3 |
| pull request | L0-L4 + relevant PX-LUMI |
| main merge | L0-L7 where environment permits |
| nightly | broader/full suite including expensive scenarios |
| model/provider change | L5 + L8 mandatory |
| release candidate | full applicable ULTEF suite including L9 |

The exact cadence will be finalized after Sprint 00 measures runtime, dependencies and flakiness.

## 12. Implementation phases

### Phase 0 — Discovery & Foundation
Inventory existing tests/scripts, map them to L0-L9, establish naming/manifest/evidence/gate standards, design the runner and CI integration.

### Phase 1 — L0-L2
Build contract, domain and infrastructure confidence first.

### Phase 2 — L3
Verify engines/components independently with deterministic fakes/mocks where possible.

### Phase 3 — L4
Verify cross-engine and cross-package integration chains.

### Phase 4 — PX-LUMI
Implement LUMI-specific continuity, state and child-safety gates.

### Phase 5 — L5
Introduce quality evaluation and versioned rubrics.

### Phase 6 — L6
Build canonical Golden Headless E2E journeys.

### Phase 7 — L7
Build adversarial and permanent regression suites.

### Phase 8 — L8
Add real-provider/model benchmark and cost/latency evaluation.

### Phase 9 — L9
Add browser E2E without moving domain correctness into UI tests.

### Phase 10 — CI enforcement
Progressively make ULTEF gates merge/release requirements after stability is demonstrated.

## 13. Architectural principles

- Prefer deterministic verification below L8.
- Do not use UI E2E as a substitute for domain/integration verification.
- Do not require a paid provider for routine L0-L4 execution.
- Separate test failure from environment/provider blockage.
- Preserve reproducibility through seeds and versioned fixtures.
- Prefer state-delta assertions over superficial status-code assertions.
- Keep ULTEF generic and project extensions namespaced.
- Evidence is a first-class output of verification.
- A test that never executed cannot make a gate green.

## 14. Current repository baseline (initial discovery)

At the start of Sprint 00, the repository already has a root `pnpm test` routed through Turbo, and recent delivery evidence reports substantial package-level unit and guarded integration coverage. Recent Sprint 34 evidence reports 171 `@lumi/npc-intelligence` unit tests and 152 `@lumi/web` unit tests, plus a guarded opportunity-inbox integration test. Therefore ULTEF adoption is a classification/orchestration/evidence project first, not a claim that LUMI currently has no tests.

The first discovery pass must determine which existing tests satisfy L0-L4/PX semantics before creating duplicates.
