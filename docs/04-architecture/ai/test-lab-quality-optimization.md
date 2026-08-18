# LUMI Test Lab — Stateful Quality & Prompt Optimization Architecture

Status: planned
Date: 2026-08-18

## Purpose

LUMI Test Lab is the developer/admin quality-control center for all generative AI work. It is not a second generation implementation and must never drift from production behavior.

Primary goals:
- run real LUMI generation tasks with selectable OpenRouter models;
- inspect and edit prompt drafts without mutating production prompts;
- compare many candidate outputs per phase;
- select exactly one candidate as the active sandbox continuation;
- preserve full stateful continuity across onboarding, world, NPC and multi-story generation;
- inspect prompt/context/model/token/cost/latency/state provenance;
- evaluate outputs with one or more strong judge models;
- improve prompts from evaluation weaknesses, retest, compare and explicitly promote successful revisions;
- keep experiments sandboxed by default, with explicit reviewed promotion to production/canonical data.

## Non-negotiable invariants

1. **Production pipeline only** — Test Lab calls the same Prompt Registry, Context Assembly, generation services, validation, state transition logic and LLM gateway used by the real application. Test-only duplicate generation logic is forbidden.
2. **Sandbox by default** — a test generation cannot mutate canonical production world/character/story/NPC/inventory/relationship state unless an explicit promote operation is reviewed and confirmed.
3. **Generate many, select one** — every phase may contain unlimited candidate runs, but only one selected result per active branch/phase may become the parent of the next phase.
4. **Candidate states never merge** — alternative candidates keep isolated resulting states. State from unselected candidates must never leak into the active branch.
5. **Selection is not promotion** — selecting a result advances only the sandbox canonical branch. Production promotion is a separate reviewed action.
6. **History is immutable** — run outputs, prompt snapshots, evaluation results and state snapshots are append-only historical evidence. New experiments create new records/revisions.
7. **Downstream history is preserved** — changing an earlier selection creates/switches branch lineage; old downstream runs are not deleted.
8. **Prompt changes are revisions** — an active prompt is never edited in-place. Test edits create draft revisions/snapshots. Activation/promotion is explicit.
9. **Evaluation cannot auto-select canonical state** — judge models may rank/recommend; a human action selects the result used by the next phase.
10. **Optimization cannot auto-promote** — Prompt Optimizer produces a draft patch/revision. It must be retested and explicitly promoted.
11. **Reproducibility/provenance first** — every run records enough immutable references/snapshots to explain model, prompt, context policy/package, parameters, parent state, token/cost and output.
12. **Privacy boundaries remain active** — Test Lab must not bypass Context Assembly child-data minimization or expose secrets/internal identifiers in provider payloads or ordinary UI.

## System boundary

```text
Test Lab UI
  -> Experiment Orchestrator
       -> Prompt Registry (active/draft revision)
       -> Context Assembly Engine (real policy/source/retrieval path)
       -> Production Generation Service
       -> LLM Gateway / OpenRouter
       -> Schema + Safety + Domain Validation
       -> Candidate Output
       -> Candidate State Transition
       -> Immutable Test Run + State Snapshot + Diff

Candidate set
  -> Evaluation Engine
       -> Judge Model(s)
       -> rubric scores + findings + ranking + recommendation

Selected candidate
  -> Sandbox Canonical Branch
  -> Next phase uses selected resulting state only

Evaluation weaknesses
  -> Prompt Optimizer
       -> minimal/balanced/full draft patch
       -> new prompt draft revision
       -> rerun same scenario/dataset
       -> before/after regression report
       -> explicit prompt promotion only
```

## Reuse of existing systems

Test Lab extends rather than duplicates:
- #199 Prompt Registry & Onboarding AI Management
- #203 Context Assembly Engine
- generation trace / token / cost ledger
- canonical Character Creation / Genesis pipeline
- story generation and state commit services
- NPC/world/inventory/relationship state owners
- OpenRouter/provider gateway

## Core domain concepts

### TestScenario
A reusable test family, e.g. Character Onboarding, Story Generation, NPC Generation.

### TestPhase
One ordered generation/evaluation boundary inside a scenario. A phase declares:
- generation task / prompt key;
- required parent state capabilities;
- allowed parameters;
- output schema;
- state transition contract;
- evaluation rubric.

### TestSession
A long-lived sandbox experiment with a stable initial profile/context and branch history. A session may span onboarding through many stories.

### TestBranch
A lineage of selected results. Exactly one branch is active/canonical inside a session at a time, but historical branches remain inspectable.

### TestRun
One generation attempt with immutable provenance:
- session/branch/phase;
- parent state snapshot;
- model profile and exact OpenRouter slug;
- model pricing snapshot;
- prompt key/revision + rendered prompt snapshot/fingerprint;
- context policy/version + context package fingerprint/provenance;
- generation parameters;
- output/schema result;
- usage/cost/latency;
- resulting candidate state snapshot + state diff.

### TestSelection
Explicit mapping from `session + branch + phase` to one selected candidate run/result. Enforce at DB/service/UI layers that only one active selection exists for that branch/phase.

### StateSnapshot / StateDiff
Sandbox state includes only canonical domain projections required by production services, including as applicable:
- character/foundation;
- universe/world/region/location;
- NPCs and relationships;
- inventory/items;
- story/session/unresolved threads;
- memories/retrieval-relevant references;
- saga/world events and other production-owned state.

A candidate resulting state is calculated from its parent state plus validated production state transitions. A full snapshot and a normalized diff are retained.

### ModelProfile
User enters the exact OpenRouter model slug. The system resolves current model metadata/pricing when available and snapshots it for the run. Manual price override may be supported, but fetched and overridden values must be distinguishable.

### EvaluationRubric / EvaluationRun
Rubrics are versioned and test-type specific. Story examples:
- creativity;
- engagement;
- curiosity;
- age suitability;
- emotional resonance;
- character fidelity;
- world consistency;
- story continuity;
- pacing;
- originality;
- ending quality;
- future-story potential;
- narrative/state consistency.

Evaluation supports:
- absolute criterion scoring;
- blind candidate ranking/pairwise comparison;
- concrete short evidence/findings rather than hidden reasoning;
- one or multiple judge models;
- consensus aggregation;
- human scores/notes stored separately;
- story-level and multi-story arc-level evaluation.

Candidate identities presented to judges should be anonymized where practical to reduce model-name bias.

### PromptOptimizationRun
Consumes:
- selected weak criteria;
- evaluator scores/findings;
- current prompt revision;
- successful criteria to preserve;
- optionally a dataset of multiple runs rather than one example;
- previous optimization outcomes/regressions.

Produces:
- proposed prompt patch/draft revision;
- target criteria;
- change explanation;
- expected effect;
- regression risks;
- prompt-token delta.

Strategies:
- Minimal Patch (default)
- Balanced Rewrite
- Full Optimization

Optimization must prefer the smallest effective change and preserve already strong criteria.

## Stateful story rule

Story tests are chronological state transitions, not independent text generations.

```text
Selected State N
  -> generate Story Phase N+1 candidate A -> candidate State A
  -> generate Story Phase N+1 candidate B -> candidate State B
  -> generate Story Phase N+1 candidate C -> candidate State C
  -> choose exactly one
  -> selected resulting state becomes State N+1
  -> next story uses only State N+1
```

A session may contain many consecutive stories. Story length is a generation parameter and should support product presets plus custom target bounds where the production contract permits it.

If an earlier selected story/world/onboarding result is changed, previous downstream results remain in their old branch and a new continuation begins from the newly selected state.

## Prompt workflow

For each phase Test Lab exposes:
- current active production prompt/version;
- editable draft copy;
- allowed template variables;
- prompt template;
- compiled/rendered prompt preview;
- final provider request preview subject to privacy/authorization;
- output schema and generation config;
- revision history;
- active vs draft comparison;
- explicit draft save and explicit production activation/rollback.

Every TestRun snapshots the exact effective prompt even when the registry version later changes.

## Evaluation workflow

```text
Candidate runs
  -> blind evaluation context
  -> criterion scores
  -> concrete findings
  -> absolute scores + ranking
  -> optional multi-judge consensus
  -> AI recommendation
  -> human selection remains authoritative
```

Judges must receive enough production context to evaluate LUMI-specific quality: child age band/preferences as allowed, selected canonical sandbox state, previous story summaries/state, character/world/NPC facts, requested story length and LUMI quality goals.

## Prompt optimization loop

```text
Generate
 -> Evaluate
 -> Diagnose weak criteria
 -> Select criteria to improve
 -> Optimize prompt to draft revision
 -> Rerun same test/dataset
 -> Re-evaluate
 -> Compare before/after
 -> detect regressions and cost/token changes
 -> Accept/reject
 -> optional explicit production prompt promotion
```

Single-result optimization is allowed for exploration, but dataset-based optimization should be the recommended path for production decisions to reduce overfitting.

## Quality/cost comparison

The UI and persisted benchmark summaries should make it possible to answer:
- best quality model;
- best value model;
- cheapest model;
- quality gain versus cost increase;
- prompt revision improvements/regressions;
- judge agreement with human evaluation;
- long-horizon continuity/state consistency trends.

Store both catalog-estimated pricing and actual provider-reported usage/cost when available.

## Sandbox promotion

Promotion is explicit and preview-first.

Before promotion show a normalized diff of entities/state that will be created/updated/deleted. Promotion must use canonical production domain services/transactions rather than copying arbitrary sandbox JSON into production tables.

Prompt promotion and world/content promotion are separate operations.

## Initial UI information architecture

Settings/Admin -> Test Lab

Left:
- scenario groups;
- phases/steps;
- locked/runnable/selected/stale status;
- active branch lineage.

Main workspace tabs:
- Configure
- Prompt
- Context
- Results
- Evaluation
- State / Diff
- History / Branches

Results expose:
- model;
- output preview;
- token/cost/latency;
- schema/validation status;
- human + judge score summary;
- Compare;
- `Use for next phase`.

## Delivery sequence

### Phase 0 — architecture/inventory
- map real generation services, state commit boundaries, Prompt Registry and Context Assembly contracts;
- define which canonical state projections Test Lab may snapshot;
- define promotion boundaries; no parallel domain state model.

### Phase 1 — core experiment contracts + persistence
- TestScenario/TestPhase/TestSession/TestBranch/TestRun/TestSelection;
- immutable provenance;
- candidate state snapshots/diffs;
- one-selected-result invariant;
- branch preservation semantics.

### Phase 2 — model registry + usage/cost
- OpenRouter slug entry;
- automatic model metadata/pricing resolution;
- pricing snapshot/manual override provenance;
- actual usage/cost capture.

### Phase 3 — production pipeline adapter + onboarding scenario
- no duplicate generation logic;
- first Character Onboarding phases use real Prompt Registry + Context Assembly + generation services;
- multiple candidates, compare, select one, continue statefully.

### Phase 4 — Prompt Workspace
- inspect active prompt;
- draft revisions;
- template/compiled/final request inspection;
- history/compare;
- safe activation/rollback integration with #199.

### Phase 5 — Stateful Story Lab
- story length controls;
- sequential multi-story sessions;
- candidate state isolation;
- exactly-one selected story state per phase;
- branch from earlier selections;
- long-horizon state/context inspection.

### Phase 6 — Evaluation Engine
- rubric registry/versioning;
- blind absolute + ranking evaluation;
- multi-judge support/consensus;
- human scoring;
- state/narrative consistency checks;
- arc-level evaluation.

### Phase 7 — Prompt Optimizer
- criterion-targeted improvement;
- minimal patch default;
- draft-only writes;
- dataset optimization;
- before/after regression and cost report;
- explicit prompt promotion.

### Phase 8 — Sandbox promote + governance
- content/state promotion preview;
- canonical service-backed promotion transaction;
- authorization/audit;
- prompt promotion and content promotion separated.

### Phase 9 — UX/observability/benchmark reports
- full Settings Test Lab UX;
- branch timeline;
- model/prompt/judge benchmark summaries;
- exportable evidence;
- privacy/security review.

### Phase 10 — stabilization
- unit/domain invariants;
- integration tests;
- deterministic sandbox tests;
- opt-in live paid tests;
- long-horizon story regression;
- security/privacy;
- migrations/docs;
- lint/typecheck/build/CI.

## First implementation slice

Do not begin with the full UI.

First implementation should deliver:
1. Phase 0 repository audit;
2. Phase 1 contracts/persistence/invariants;
3. a thin service-level proof with two candidate results in one phase, exactly one selection, resulting-state continuation, and branch preservation when the selection changes.

Only after this invariant is proven should Prompt Workspace and live onboarding integration be layered on top.
