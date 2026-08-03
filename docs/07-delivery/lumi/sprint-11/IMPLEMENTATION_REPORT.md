# Sprint 11 Implementation Report

**Sprint ID:** LUMI-S11  
**Sprint Title:** Prompt Registry and Context Builder  
**Release Date:** 2026-08-03  
**Branch:** `agent/sprint-11-prompt-registry-context-builder`  
**Pull Request:** https://github.com/necdetoskay/Project_LUMI/pull/13  
**Status:** Complete

---

## 1. Task Summary

| Task ID | Deliverable | Status |
| --- | --- | --- |
| S11-T01 | Prompt registry/version model in `packages/prompts` | Complete |
| S11-T02 | Typed template renderer in `packages/prompts` | Complete |
| S11-T03 | Context source ports in `packages/context` | Complete |
| S11-T04 | Relevance/token budget builder in `packages/context` | Complete |
| S11-T05 | Safety/parent precedence policy in `packages/context` | Complete |
| S11-T06 | Eval fixtures, tests, and implementation report | Complete |

---

## 2. Files Changed

### New `packages/prompts`

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `eslint.config.mjs`
- `migrations/0001_prompt_registry_schema.sql`
- `scripts/prompt-migrate.mjs`
- `src/index.ts`
- `src/domain/prompt-registry.ts`
- `src/domain/prompt-version.ts`
- `src/domain/prompt-variable.ts`
- `src/domain/prompt-activation.ts`
- `src/domain/prompt-types.ts`
- `src/domain/validation.ts`
- `src/domain/errors.ts`
- `src/domain/index.ts`
- `src/application/prompt.service.ts`
- `src/application/rendering/prompt-renderer.ts`
- `src/application/index.ts`
- `src/application/db.ts`
- `src/db/index.ts`
- `src/db/client/index.ts`
- `src/db/schema/prompts/index.ts`
- `src/db/schema/prompts/schemas.ts`
- `src/db/schema/prompts/common.ts`
- `src/db/schema/prompts/relations.ts`
- `src/db/schema/prompts/prompt-registries.ts`
- `src/db/schema/prompts/prompt-versions.ts`
- `src/db/schema/prompts/prompt-activations.ts`
- `src/db/schema/prompts/prompt-activation-history.ts`
- `src/db/repositories/index.ts`
- `src/db/repositories/interfaces/prompt.repository.ts`
- `src/db/repositories/drizzle/drizzle-prompt.repository.ts`
- `tests/domain/prompt-version.test.ts`
- `tests/domain/prompt-variable.test.ts`
- `tests/application/prompt-renderer.test.ts`
- `tests/application/prompt.service.test.ts`
- `tests/fixtures/prompts.ts`
- `tests/integration/drizzle-prompt.repository.test.ts`

### New `packages/context`

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `AGENTS.md`
- `src/index.ts`
- `src/ports/context-types.ts`
- `src/ports/context-sources.ts`
- `src/ports/index.ts`
- `src/adapters/in-memory-safety-policy.adapter.ts`
- `src/adapters/in-memory-parent-policy.adapter.ts`
- `src/adapters/in-memory-working-story.adapter.ts`
- `src/adapters/in-memory-emotional-state.adapter.ts`
- `src/adapters/in-memory-long-term-memory.adapter.ts`
- `src/adapters/in-memory-knowledge.adapter.ts`
- `src/adapters/in-memory-world.adapter.ts`
- `src/adapters/in-memory-origin-package.adapter.ts`
- `src/adapters/index.ts`
- `src/application/context-builder.ts`
- `src/application/index.ts`
- `src/policy/safety-policy.ts`
- `src/policy/policy-guard.ts`
- `src/policy/index.ts`
- `tests/application/context-builder.test.ts`
- `tests/policy/policy-guard.test.ts`
- `tests/fixtures/contexts.ts`

### Modified

- `pnpm-lock.yaml` — workspace package registration
- `packages/story/src/domain/choice/choice-types.ts` — made `matchPolicy` optional (default `all` already implemented in evaluator)
- `packages/story/src/application/choice/choice.service.ts` — `CreateChoiceOptionServiceInput` now omits `choicePointId` because the service assigns it from the created point

---

## 3. Prompt Registry Invariant / Version Immutability / Activation

- `PromptRegistry` is scoped by `householdId` + `promptKey`. Uniqueness enforced by a composite unique index.
- `PromptVersion` records are immutable. Status lifecycle: `draft` → `published` → `archived`. Only `published` versions can be activated.
- `PromptActivation` explicitly links a registry to an active version. Activation history is append-only in `prompt_activation_history`.
- `PromptService.activateVersion` validates that the target version is published and records the change in history.
- Version numbers are monotonically increasing integers managed by the repository.

Evidence: `tests/application/prompt.service.test.ts` covers draft→publish→activate flow and history recording.

---

## 4. Template Renderer Type / Safety / Escape

- `renderPrompt(versionId, variables)` performs strict variable substitution only.
- Supported variable types: `string`, `number`, `boolean`, `enum`, `json`.
- Missing required variables cause `PromptRenderError`.
- Default values are applied when a variable is optional and not provided.
- Values are escaped via `JSON.stringify` for non-string types and HTML-tag stripping for strings to prevent injection.
- Renderer returns metadata: rendered text, version id, resolved variables, and token estimate (character-count heuristic).

Evidence: `tests/application/prompt-renderer.test.ts` covers type validation, missing required variable, default fallback, and escape behavior.

---

## 5. Context Source Port Contracts and Adapters

Eight source ports are defined in `src/ports/context-sources.ts`:

1. `SafetyPolicySource`
2. `ParentPolicySource`
3. `WorkingStorySource`
4. `EmotionalStateSource`
5. `LongTermMemorySource`
6. `KnowledgeSource`
7. `WorldSource`
8. `OriginPackageSource`

Each port accepts a scoped request (`householdId`, `childProfileId`, optional filters) and returns `ContextSourceResult<T>` with a relevance score. Adapters are in-memory test doubles in `src/adapters/`; production adapters will delegate to `@lumi/profiles`, `@lumi/world`, `@lumi/story` application services without direct ORM access.

---

## 6. Context Builder Priority / Token Budget / Determinism

`ContextBuilder.build(request)` packs context in the following fixed priority order:

1. Safety policy
2. Parent policy
3. Working / active story
4. Emotional state
5. Relevant long-term memory
6. Knowledge / world context
7. Origin package (when requested)

`TokenBudget` enforces per-section ceilings and a total budget. If a section exceeds its allocation, items are truncated from lowest relevance first and a `budget_overflow` finding is recorded.

Determinism is verified: the same input snapshot produces the same `ContextManifest`, including a SHA-256 content hash.

Evidence: `tests/application/context-builder.test.ts` covers priority order, budget overflow, determinism, and missing source handling.

---

## 7. Safety / Parent Precedence / Isolation

- `SafetyPolicy` is always the highest-priority context item.
- `PolicyGuard.canApplyParentPolicy(safety, parent)` rejects any parent policy that would loosen a safety boundary.
- Each context item carries a `scope` label (`world_truth`, `character_belief`, `player_knowledge`, `narrative_instruction`) so the builder can keep secret/hidden facts out of player-facing context.
- Context builder does not generate story text and does not mutate state.
- No child data, secrets, or raw memory content are placed into prompt logs.

Evidence: `tests/policy/policy-guard.test.ts` covers boundary ranking and parent-policy loosening rejection.

---

## 8. Migration / Schema

- `packages/prompts/migrations/0001_prompt_registry_schema.sql` is forward-only and additive.
- Creates `prompts` schema with four tables:
  - `prompt_registries`
  - `prompt_versions`
  - `prompt_activations`
  - `prompt_activation_history`
- Includes primary keys, foreign keys, composite unique constraints, and indexes on `household_id`, `prompt_key`, `status`, and activation lookups.

---

## 9. Verification Commands and Results

```powershell
# @lumi/prompts
pnpm --filter @lumi/prompts lint              # PASS
pnpm --filter @lumi/prompts typecheck         # PASS
pnpm --filter @lumi/prompts test              # 4 files, 44 tests PASS
$env:PROMPT_TEST_ENABLE_DESTRUCTIVE="true"; `
  pnpm --filter @lumi/prompts test:int        # 1 file, guard PASS (no local PostgreSQL)

# @lumi/context
pnpm --filter @lumi/context lint              # PASS
pnpm --filter @lumi/context typecheck         # PASS
pnpm --filter @lumi/context test              # 2 files, 19 tests PASS

# @lumi/story (regression)
pnpm --filter @lumi/story lint                # PASS
pnpm --filter @lumi/story typecheck           # PASS
pnpm --filter @lumi/story test                # 9 files, 40 tests PASS

# @lumi/web (regression)
pnpm --filter @lumi/web lint                  # PASS
pnpm --filter @lumi/web typecheck             # PASS
pnpm --filter @lumi/web test                  # 12 files, 85 tests PASS

# Repo-wide
node scripts/check-mojibake.mjs               # PASS
pnpm build                                    # PASS
```

---

## 10. Acceptance Criteria Traceability

| Acceptance Criterion | Source Location | Test | Result |
| --- | --- | --- | --- |
| Same input/snapshot produces same context manifest | `src/application/context-builder.ts` | `context-builder.test.ts` "deterministic manifest" | PASS |
| Unauthorized memory/world record cannot enter context | `src/application/context-builder.ts` + `src/ports/context-types.ts` scopes | `context-builder.test.ts` "filters out hidden facts" | PASS |
| Parent policy cannot loosen safety rule | `src/policy/policy-guard.ts` | `policy-guard.test.ts` "rejects weaker parent policy" | PASS |
| Missing required variable stops render | `src/application/rendering/prompt-renderer.ts` | `prompt-renderer.test.ts` "fails when required variable missing" | PASS |
| Published prompt cannot be changed; new version required | `src/domain/prompt-version.ts` + repository | `prompt.service.test.ts` "published version is immutable" | PASS |
| Token budget overflow preserves priority and emits finding | `src/application/context-builder.ts` | `context-builder.test.ts` "truncates lowest priority on overflow" | PASS |

---

## 11. Known Risks and Out-of-Scope Items

- Integration tests for `packages/prompts` require a local PostgreSQL instance; the test runner is configured but was not executed against a real database in this environment.
- Context adapters are in-memory test doubles. Real adapters that delegate to `@lumi/profiles`, `@lumi/world`, and `@lumi/story` services will be added when those packages expose stable read-only contracts.
- Token budget uses a deterministic character-count heuristic, not a model-specific tokenizer.
- Final story generation pipeline is explicitly out of scope for Sprint 11.
- No production UI for prompt editing was added.

---

## 12. Rollback / Rollforward Plan

- Prompt activation can be rolled back by activating a previous published version; activation history is preserved.
- Database migration is forward-only; rollback requires restoring from a pre-migration backup.
- New packages do not affect existing `@lumi/story`, `@lumi/web`, or `@lumi/profiles` runtime behavior; they can be disabled by not importing them.

---

## 13. Codex Review Summary

This PR introduces two new workspace packages:

- `@lumi/prompts`: versioned prompt registry with typed variable renderer, repository layer, and migration.
- `@lumi/context`: deterministic context builder with source ports, safety precedence, token budget, and in-memory adapters.

All unit tests pass, lint/typecheck/build pass, and the existing Sprints 09/10 tests remain green. Two minor type relaxations in `@lumi/story` were needed to fix pre-existing type-check errors uncovered by the new workspace TypeScript resolution.
