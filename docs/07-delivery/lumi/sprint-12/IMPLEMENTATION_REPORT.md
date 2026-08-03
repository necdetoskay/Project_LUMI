# Sprint 12 Implementation Report

**Sprint ID:** LUMI-S12
**Sprint Title:** Story Generation Pipeline
**Release Date:** 2026-08-03
**Branch:** `agent/sprint-12-story-generation-pipeline`
**Pull Request:** (pending — requires explicit merge approval)
**Status:** Implemented / Ready for review

---

## 1. Task Summary

| Task ID | Deliverable | Status |
| --- | --- | --- |
| S12-T01 | Generation contracts/ports | Complete |
| S12-T02 | Provider adapters/router | Complete |
| S12-T03 | Story pipeline orchestrator | Complete |
| S12-T04 | Validation/repair pipeline | Complete |
| S12-T05 | Usage/cost records | Complete |
| S12-T06 | Eval dataset/runbook | Complete |

---

## 2. Files Changed

### New `packages/ai`

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `eslint.config.mjs`
- `migrations/0001_ai_usage_schema.sql`
- `scripts/ai-migrate.mjs`
- `evals/RUNBOOK.md`
- `src/index.ts`

#### `src/domain`

- `seeded-rng.ts` — deterministic seeded PRNG (hash-seeded splitmix).
- `bootstrap-vectors.ts` — per-kind vector bootstrap, age band caps, dominant-vector resolution.
- `creative-brief.ts` — structured creative brief from vectors + safety bounds.
- `generation-types.ts` — shared generation request/response contracts.
- `origin-types.ts` — `OriginGenerationInput` / `OriginPackageProposal` / `OriginGenerationResult`.
- `validation-types.ts` — validation finding/severity/check-code types.
- `generation-errors.ts` — 7 typed errors: `ProviderUnavailableError`, `ProviderTimeoutError`, `SchemaValidationError`, `SafetyBlockedError`, `CanonViolationError`, `ContinuityViolationError`, `RepairLimitReachedError`.
- `index.ts`

#### `src/ports`

- `provider.port.ts`, `model-router.port.ts`, `prompt-composer.port.ts`, `usage.port.ts`,
  `generation-ports.ts`, `origin-generator.port.ts`, `orchestrator.port.ts`, `generation-validator.port.ts`, `index.ts`

#### `src/infrastructure`

- `model-router.ts` — sequential fallback; `fallbacksAllowed=false` preferred-only routing.
- `providers/test-provider.ts` — scripted per-request response, `failTimes`, timeout mapping.
- `providers/openrouter-provider.ts` — fetch-based, `jsonMode` -> `response_format`, timeout/abort mapping.
- `index.ts`

#### `src/application`

- `prompt-composer.ts` — `RegistryPromptComposer` with built-in origin candidate JSON brief + registry `renderActivePrompt`.
- `orchestrator.ts` — `GenerationOrchestrator` parser -> validator -> repair loop, usage recording, SHA-256 output hash, seed-derived candidate seeds.
- `index.ts`

#### `src/validation`

- `output-schemas.ts` — zod schemas: origin_batch, story_scene, story_dialogue, choice_proposal, reflection_qa.
- `pipeline-validator.ts` — schema/safety/canon/continuity orchestration.
- `safety-checker.ts`, `canon-checker.ts`, `continuity-checker.ts` (contradiction detection), `repair-policy.ts` (repair/regenerate/reject/fallback_template, `RepairLimitReachedError`), `no-op-validator.ts`.
- `index.ts`

#### `src/usage` + `src/db`

- `usage/cost-estimator.ts`, `usage/in-memory-usage-recorder.ts`, `usage/drizzle-usage-recorder.ts`, `usage/index.ts`.
- `db/client/index.ts`, `db/schema/ai/*` (common, generation-usage, schemas, index), `db/repositories/interfaces/usage.repository.ts`, `db/repositories/drizzle/drizzle-usage.repository.ts`, `db/index.ts`.

#### `src/evals`

- `evals/quality-eval.ts` — weighted quality scoring, hard safety gate, motif analyzer, generic-phrase detection.
- `evals/index.ts`

#### `tests`

- `tests/domain/*`: seeded-rng (7), bootstrap-vectors (9), creative-brief (3), origin-types (9)
- `tests/infrastructure/*`: test-provider (5), openrouter-provider (5), model-router (6)
- `tests/application/orchestrator.test.ts` (6)
- `tests/validation/*`: safety-checker (5), canon-continuity (5), pipeline-validator (6), repair-policy (7), safety-regression (3)
- `tests/evals/quality-eval.test.ts` (9), `tests/evals/fixtures/origin-batches.ts`
- `tests/integration/drizzle-usage.repository.test.ts` (env-guarded)

### New `docs/`

- `docs/03-domain-design/simulation/first-run-auto-origin-contract.md` — First-Run Auto Origin Generation contract.

### Modified

- `pnpm-lock.yaml` — workspace package registration
- `docs/07-delivery/lumi/sprint-12/SPRINT_SPEC.md` — status column + sprint status/version

---

## 3. Contracts and Ports (S12-T01)

- All external boundaries expressed as TypeScript ports (`src/ports/*`), no ORM calls in domain or application code.
- Provider port includes optional `supportsModel?` capability check; router consults it for fallback eligibility.
- `GenerationOrchestrator` depends only on ports, so all providers/validators/recorders are swappable in tests.

Evidence: `tests/application/orchestrator.test.ts` wires stub composer, scripted providers, real validators and an in-memory recorder with no concrete infrastructure.

---

## 4. Provider Adapters and Routing (S12-T02)

- `OpenRouterProvider` wraps the fetch API with JSON-mode `response_format`, timeout abort, and maps HTTP/network failures to typed `ProviderUnavailableError` / `ProviderTimeoutError`.
- `TestProvider` scripts deterministic responses per request for hermetic tests.
- `ModelRouter` tries preferred models in order; when `fallbacksAllowed=false` it returns `ProviderUnavailableError` on the first failing preferred model instead of falling back.

Evidence: `tests/infrastructure/model-router.test.ts`, `tests/infrastructure/openrouter-provider.test.ts`, `tests/infrastructure/test-provider.test.ts`.

---

## 5. Orchestrator and Repair Loop (S12-T03)

- Pipeline: compose prompt -> call provider -> parse -> validate -> bounded repair -> record usage -> return result.
- Output is hashed (SHA-256); candidate seeds are deterministic (`<universeSeed>:candidate:<n>`), so retries never produce duplicate session progression for the same seed.
- On schema failure the orchestrator may repair once with targeted repair instructions; beyond the repair budget it raises `RepairLimitReachedError` (safe failure).

Evidence: `tests/application/orchestrator.test.ts` — seed determinism and repair budget behavior.

---

## 6. Validation and Safety (S12-T04)

- Check codes: `SCHEMA-001`, `SAFETY-001`, `SAFETY-002`, `CANON-001`, `CANON-002`, `CONTINUITY-001`, `CONTINUITY-002`.
- Safety is a hard gate: unsafe provider output is rejected before approval and before any save or usage-text exposure.
- `ContinuityChecker` flags contradictions (e.g. character "disappeared"/"vanished" patterns).
- `RepairPolicy` yields `repair` | `regenerate` | `reject` | `fallback_template` decisions and a bounded repair budget.

Evidence: `tests/validation/safety-regression.test.ts` — safety hard-fail, no-story-text-in-usage, dedupe regression; plus per-checker unit tests.

---

## 7. Usage and Cost Records (S12-T05)

- PostgreSQL migration `migrations/0001_ai_usage_schema.sql` creates the `ai` schema, a ledger table and `generation_usage` with check constraints and indexes (forward-only, additive).
- `DrizzleUsageRepository` / `DrizzleUsageRecorder` persist token/cost/latency findings; `failureState` and `findings` are optional.
- **Rule:** child story text is never written to the database; only hashes, seeds, counts and failure states are stored.
- Integration test requires `AI_TEST_ENABLE_DESTRUCTIVE=true` and is skipped by default (guarded by vitest.exclude).

Evidence: `tests/integration/drizzle-usage.repository.test.ts` (guard; skipped without the env flag).

---

## 8. Eval Dataset and Runbook (S12-T06)

- `src/evals/quality-eval.ts`: weighted `calculateOriginQuality`, hard-gate `passesQualityGates`, `analyzeMotifs`, `repeatedMotifRatio`. Safety gate is 5/5 hard.
- Fixtures: `tests/evals/fixtures/origin-batches.ts` — diverse vs generic/formulaic batches for motif/generic-phrase tests.
- `evals/RUNBOOK.md` — quality gate table, model-selection rule, seed batch counts (300 pre-prod / 1000 model-selection), regression pointers.
- `docs/03-domain-design/simulation/first-run-auto-origin-contract.md` — provider-neutral Auto origin contract with inputs/outputs, refresh semantics, seeded vectors and safety bounds.

Evidence: `tests/evals/quality-eval.test.ts` (9 tests).

---

## 9. Verification Commands and Results

```powershell
pnpm --filter @lumi/ai test        # 14 files, 85 tests PASS
pnpm --filter @lumi/ai typecheck   # PASS
pnpm --filter @lumi/ai lint        # PASS
```

---

## 10. Acceptance Criteria Traceability

| Acceptance Criterion | Source Location | Test | Result |
| --- | --- | --- | --- |
| Test provider produces schema-valid static/interactive scenes | `src/infrastructure/providers/test-provider.ts` + `src/application/orchestrator.ts` | `orchestrator.test.ts` | PASS |
| Safety or canon violation blocked before reaching user | `src/validation/*` | `safety-regression.test.ts` | PASS |
| Provider timeout yields fallback/typed error | `src/infrastructure/providers/openrouter-provider.ts` | `openrouter-provider.test.ts` | PASS |
| Safe failure when repair limit exceeded | `src/validation/repair-policy.ts` | `repair-policy.test.ts` | PASS |
| Same-request retry produces no duplicate progression | `src/application/orchestrator.ts` (seed hashing) | `orchestrator.test.ts` | PASS |
| Cost/token/latency recorded without exposing child text | `src/usage/*` + `src/db/*` | `safety-regression.test.ts` | PASS |

---

## 11. Known Risks and Out-of-Scope Items

- `migrations/0001_ai_usage_schema.sql` is authored but **not yet applied** to a live database; run `pnpm --filter @lumi/ai ai:migrate` when a PostgreSQL target is available.
- Integration test for the Drizzle usage repository is env-guarded and skipped without a database.
- `packages/profiles` still owns the existing OpenRouter call for Auto origin generation; Sprint 12 adds the provider-neutral contract and orchestrator that can replace that path without breaking the UI. The actual web/API route swap is intentionally out of scope (user-approved).
- `TokenBudget` and model selection are configuration-driven; no production model defaults are wired yet.
- No UI was changed in this sprint.

---

## 12. Rollback / Rollforward Plan

- The new `@lumi/ai` package has no runtime consumers yet; it can be removed by deleting the package and the `pnpm-lock.yaml` registration without affecting `@lumi/story`, `@lumi/profiles`, or `@lumi/web`.
- Migration is forward-only; rollback requires restoring from a pre-migration backup.
- Production model defaults can be rolled back by configuration/policy, and story state advances only through session commands.
