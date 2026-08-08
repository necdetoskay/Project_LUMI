# ULTEF-LUMI Sprint 00 — Discovery & Foundation

Status: IN PROGRESS
Date: 2026-08-08
Roadmap: `docs/07-delivery/lumi/ultef/ULTEF_LUMI_ROADMAP.md`

## Objective

Establish a truthful ULTEF baseline for Project LUMI before adding broad new test suites. Reuse and classify existing verification first; identify gaps second; implement runner/gate foundations only after the inventory is evidence-backed.

## Definition of Done

Sprint 00 is complete when:

1. Existing repository test commands, test files, integration tests, fixtures, scripts and CI workflows are inventoried.
2. Existing verification is mapped to L0-L9 and relevant PX-LUMI gates without double-counting.
3. A coverage matrix records `COVERED`, `PARTIAL`, `MISSING`, or `UNKNOWN` with evidence/references.
4. ULTEF naming and manifest conventions are documented.
5. Gate result semantics (`PASS/WARN/FAIL/BLOCKED`) are documented.
6. Evidence schema/retention/redaction rules are documented.
7. A runner design supports level selection and machine-readable reports.
8. CI cadence and prerequisite/blocking behavior are documented.
9. The first L6 Golden Headless journey is specified at scenario level.
10. No existing test suite is needlessly duplicated merely to obtain an ULTEF label.
11. Human-readable **Execution Narrative** evidence is defined so each meaningful scenario explains what was created, what happened, what changed, what was expected, what actually occurred, and why the result is PASS/WARN/FAIL/BLOCKED.

## Tasks

### S00-T01 — Repository test inventory

- Enumerate workspace packages/apps/services/tooling.
- Locate `*.test.*`, `*.spec.*`, integration/e2e conventions and test configs.
- Record package test commands and runners.
- Locate fixtures, fakes, seeds, test DB helpers and provider mocks.
- Locate GitHub Actions/workflow test execution.
- Record guarded tests that can silently skip because infrastructure is absent.

Deliverable: `TEST_INVENTORY.md`.

### S00-T02 — L0-L9 coverage matrix

Classify existing tests by their actual behavior, not filename. A unit test may satisfy L0, L1 or L3 depending on what it proves.

Deliverable: `COVERAGE_MATRIX.md`.

### S00-T03 — PX-LUMI catalog refinement

For PX-LUMI-01..10 define purpose, prerequisites, minimum assertions, evidence and owning ULTEF level(s).

Deliverable: `PX_LUMI_GATE_CATALOG.md`.

### S00-T04 — Naming & manifest standard

Define stable IDs such as:

```text
L1-WORLD-001
L3-DECISION-001
L4-STORY-WORLD-001
L6-GOLDEN-001
PX-LUMI-09-001
```

Define a manifest that can reference existing tests without forcing file moves.

Deliverable: `ULTEF_CONVENTIONS.md`.

### S00-T05 — Evidence contract

Define `summary.json`, human-readable summary, failures and per-scenario evidence metadata. Include seed, commit SHA, environment, model/provider identity where relevant, timing and redaction requirements.

For meaningful domain/integration/E2E scenarios, evidence must also include an **Execution Narrative**:

- Given: actual synthetic profile/world/character/NPC initial state;
- When: semantic execution timeline (story created, encounter, rumor, choice, engine reaction, commit, reload, etc.);
- Then: expected vs actual assertions;
- explicit before/after state deltas;
- safe decision reason codes/scores where useful;
- final plain-language explanation of why the result passed or failed.

A raw `PASS`/`FAIL` line is not sufficient evidence for L6 or continuity/state-changing PX-LUMI scenarios.

Deliverable: `EVIDENCE_CONTRACT.md`.

### S00-T06 — Runner design / minimum skeleton

Target commands:

```text
pnpm ultef
pnpm ultef:L0
pnpm ultef:L1
pnpm ultef:L3
pnpm ultef:L6
pnpm ultef:L0-L4
pnpm ultef:full
```

The runner must distinguish failed assertions from blocked prerequisites and must not turn skipped/never-executed mandatory verification into PASS. It must be able to emit both machine-readable scenario data and human-readable Execution Narrative files.

Deliverable: runner design and, if repository discovery confirms the approach, minimum non-disruptive skeleton.

### S00-T07 — CI integration design

Define fast/PR/main/nightly/model-change/release profiles, artifact upload, failure policy and handling of infrastructure/provider secrets.

Deliverable: `CI_GATE_PLAN.md`.

### S00-T08 — Golden Headless E2E specification

Specify `L6-GOLDEN-001` from household/profile bootstrap through story outcome commit, persistence reload and later-session continuity. Identify current implementation gaps that block execution. The specification must define the human-readable execution timeline and state deltas expected in the resulting evidence.

Deliverable: `L6_GOLDEN_001.md`.

### S00-T09 — Sprint closeout evidence

Run applicable existing checks plus any new ULTEF foundation checks. Record exactly what executed and what remains blocked/missing.

Deliverable: `S00_VALIDATION_EVIDENCE.md`.

## Initial observations already verified

- Root `package.json` exposes `test: turbo run test`.
- `turbo.json` defines a `test` task depending on package builds and declares `coverage/**` output.
- The monorepo workspace spans `apps/*`, `services/*`, `packages/*`, and `tooling/*`.
- Recent Sprint 34 repository evidence reports 171 unit tests in `@lumi/npc-intelligence`, 152 unit tests in `@lumi/web`, and a guarded integration test, with root format/lint/typecheck/test/build checks green at that closeout.

These observations mean the first job is accurate discovery and classification, not replacing the current test infrastructure.

## Risks

- GitHub code search may not expose every test path; inventory must use repository/package evidence and must mark uncertainty rather than infer coverage.
- Guarded integration tests can create false confidence if skipped; ULTEF evidence must expose execution/skip/block status.
- AI quality gates can become flaky or expensive; real-provider verification belongs primarily in L8 and should not contaminate deterministic lower levels.
- Browser E2E must not become the only proof of engine correctness.
- Human-readable evidence must summarize actual runtime facts and must never invent narrative details that did not occur during execution.

## Exit decision

After Sprint 00, implementation proceeds in measured order: close critical L0-L2 gaps, then L3/L4, then PX-LUMI and L6. L5/L7/L8/L9 are added according to risk and cost rather than raw test-count goals.
