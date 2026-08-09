# L9 Production Readiness Plan

Status: ACTIVE
Scope: Project LUMI ULTEF L9 — long-horizon reliability, production-like resilience, operational safety, and release-readiness evidence

## Purpose

L8 proved that LUMI can generate and evaluate semantically acceptable stories with deterministic hard gates, human-grounded semantic judging, and controlled model selection. L9 moves from single-session/model-quality confidence to **production-readiness confidence**.

L9 asks a different question:

> Can LUMI remain correct, safe, recoverable, observable, and operationally stable across longer journeys, repeated sessions, failures, retries, provider changes, and production-like load?

L9 does not weaken any L0–L8 gate. It composes them into longer-running production-style journeys.

## L9 canonical gate families

### L9-G1 — Long-horizon continuity

Verify that important state remains correct across many sessions and story turns rather than only one short scenario.

Required coverage:

- repeated story sessions for the same child/universe,
- persisted choices remain causally visible later,
- NPC memories and relationships evolve without impossible jumps,
- inventory and durable items remain consistent,
- world facts do not silently reset or drift,
- old facts may decay only through explicit domain rules,
- cross-session context reconstruction is deterministic where required.

Initial target journey: at least 10 sequential story/session transitions with multiple state commits.

### L9-G2 — Outcome commit integrity under repeated use

Verify Story Outcome & World State Commit behavior over repeated commits.

Required coverage:

- idempotent repeated outcome submission,
- atomic commit behavior,
- rollback on partial failure,
- indirect-effect propagation,
- no duplicated items/memories/events,
- deterministic conflict handling,
- before/after world-state snapshots retained as evidence.

This gate explicitly carries forward the Story Outcome & World State Commit validation requirement.

### L9-G3 — Time progression / background-life resilience

Verify long-gap and background simulation rules.

Required coverage:

- short absence causes bounded progression,
- progression intensity decays over the configured window,
- long absence does not simulate indefinitely,
- after the configured maximum background window the universe effectively freezes until return,
- only relevant entities receive expensive simulation,
- injuries, pending events, and time-sensitive state age correctly,
- unrelated NPCs do not accumulate arbitrary changes.

### L9-G4 — Provider and model failure resilience

Verify runtime model routing without bypassing LUMI validation.

Required coverage:

- Champion unavailable -> eligible fallback route,
- provider timeout,
- provider 429/rate limit,
- provider 5xx,
- malformed/empty model output,
- structured-output contract failure,
- fallback output still passes deterministic validation,
- failed provider attempt does not create partial world-state mutation.

Current model roles are inherited from `L8_MODEL_SELECTION_POLICY.md`.

### L9-G5 — Session concurrency and isolation

Verify production-like concurrency across households/children/universes.

Required coverage:

- simultaneous sessions remain tenant/household isolated,
- two children in one household do not leak state unless explicitly shared by domain design,
- duplicate requests remain idempotent,
- single-active-session invariants remain enforced where applicable,
- concurrent world commits do not lose updates or create impossible merged state.

### L9-G6 — Recovery and restart resilience

Verify that service/process interruption does not corrupt persistent state.

Required coverage:

- restart between story generation and outcome commit,
- restart during retryable indirect propagation,
- retry after process crash,
- persisted job/retry state resumes safely,
- no duplicate mutation after recovery,
- readiness reflects unavailable dependencies correctly.

### L9-G7 — Production-like load and latency

Move beyond the existing non-blocking load smoke into an evidence-backed readiness profile.

Required measurements:

- request success rate,
- p50/p95/p99 latency where meaningful,
- 5xx count,
- timeout count,
- DB saturation indicators available to the test harness,
- queue/retry growth if background work exists,
- memory/process stability over sustained execution.

Initial L9 load gates should be conservative and evidence-driven; they must not be invented from arbitrary production SLOs before baseline measurement exists.

### L9-G8 — Observability and evidence completeness

Every L9 failure must be diagnosable from retained evidence.

Required evidence:

- correlation/run ID,
- child/household/universe identifiers anonymized or synthetic in test evidence,
- scenario and step IDs,
- before/after state fingerprints,
- retry/fallback events,
- provider/model used where applicable,
- timing metrics,
- final gate decision,
- machine-readable JSON plus concise human-readable Markdown summary.

### L9-G9 — Security and abuse regression continuity

L9 must retain Security Scan success and extend story-system abuse coverage where production flows create new attack surfaces.

Candidate coverage:

- prompt-injection attempts to bypass child-safety/world rules,
- cross-household identifier substitution,
- replay of stale outcome manifests,
- oversized payloads,
- malformed structured payloads,
- unauthorized direct state mutation paths.

### L9-G10 — Release readiness decision

L9 closes only when a release-candidate head has all required repository gates green and all blocking L9 journeys PASS.

At minimum:

- CI PASS,
- Security Scan PASS,
- ULTEF Integration PASS,
- L9 long-horizon journey PASS,
- L9 commit/recovery journey PASS,
- L9 provider-failure/fallback journey PASS,
- L9 concurrency/isolation journey PASS,
- L9 production-like load profile completed with accepted baseline thresholds,
- no paid provider benchmark embedded in ordinary PR CI.

## Initial implementation sequence

### Phase 1 — L9 manifest and evidence contract

Create machine-readable L9 scenario definitions, common evidence schema, and deterministic test fixtures.

### Phase 2 — `L9-LONG-HORIZON-001`

Build the first 10-transition synthetic universe journey that exercises:

- remembered choices,
- NPC memory/relationship evolution,
- inventory durability,
- repeated outcome commits,
- continuity reconstruction,
- world-state fingerprints.

No live LLM is required for the first deterministic version. A later live-provider variant may reuse the same journey contract.

### Phase 3 — `L9-COMMIT-RECOVERY-001`

Inject failure between commit stages and prove rollback/idempotent recovery.

### Phase 4 — `L9-PROVIDER-FAILOVER-001`

Use controlled provider stubs/fault injection first. Test timeout, 429, 5xx, malformed output, Champion failure, and fallback validation. Paid live-provider failure probes remain manual only if later needed.

### Phase 5 — `L9-CONCURRENCY-001`

Run concurrent synthetic households/children and validate isolation plus commit correctness.

### Phase 6 — `L9-LOAD-BASELINE-001`

Measure current production-like baseline before setting blocking thresholds. Convert evidence-backed limits into hard gates only after baseline data exists.

## Cost policy

L9 deterministic, concurrency, recovery, and load-regression tests should be provider-cost-free by default.

Live LLM checks are allowed only when they answer a question that deterministic/provider-stub testing cannot answer. They must be explicitly enabled, cost-controlled, evidence-retaining, and excluded from normal PR CI.

## Relationship to L8

L8 is CLOSED and remains the authority for:

- semantic judge calibration,
- human-reviewed semantic truth,
- bounded semantic scoring,
- Champion/Challenger selection policy,
- model-quality leaderboard methodology.

L9 consumes those decisions but focuses on production-like system behavior over time and under failure.

## First exit checkpoint

L9 reaches its first meaningful checkpoint when `L9-LONG-HORIZON-001` exists, runs provider-cost-free in ULTEF, retains before/after evidence for every transition, and passes on CI without weakening any lower-level gate.
