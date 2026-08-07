# Sprint 32 — Accepted Hook → Story Generation (LLM rendering)

**Sprint ID:** LUMI-S32
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 27 (Story Hooks), Sprint 12 (AI generation pipeline `@lumi/ai`), profiles LLM settings infra (origin-generator pattern)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `AGENTS.md` (S31 closeout backlog: *accepted hook → story generation (LLM rendering) integration*)

## Goal

Turn an **accepted StoryHook's content** into **LLM-rendered narrative**.
Today a hook only steers scene *selection* (`selectNextSceneForHook`, S27-T06);
its payload (claim, itemId, factId, conditionId …) never reaches prose. This
sprint adds a **story generation pipeline**: a deterministic hook→scene brief,
a prompt builder, and a `StorySceneGenerationService` that calls the
production LLM path (task+provider settings, `callOpenRouter`, retry,
`LlmConfigError`) and returns a validated, generated scene. The service is
composed by web later; `@lumi/story` stays free of `@lumi/profiles` by using a
port for LLM settings.

This is the generation *pipeline* layer (the largest, most independent item).
Wiring into `advanceSession` / the reader is a separate follow-up.

## Principle

- **Deterministic input, non-deterministic prose**: the hook→brief mapping and
  prompt are fully deterministic (same hook → same prompt variables); only the
  LLM call produces varied narrative. No canonical state is written by this
  sprint.
- **Package-safe**: `@lumi/story` implements the pipeline via a
  `StorySceneLlmSettingsPort` (injected by web). Story never imports
  `@lumi/profiles` or calls OpenRouter directly.
- **Follows the origin-generator contract**: config resolution (task missing /
  disabled, provider disabled, key missing → `LlmConfigError`), decrypted key,
  `callOpenRouter`, JSON parse + validate, bounded retry. Reuses profiles'
  `story_turn_generation` task type already in `LLM_TASK_TYPES`.
- **Child-safe**: the prompt includes the household content boundary and
  age-band from the port; output is validated against a scene schema before it
  is ever used.

## Reused Foundation

- `@lumi/story` `StoryHookState` / `HookType` / `StoryHook` (S27) — input.
- `@lumi/story` `mapHookToScene` / `selectNextSceneForHook` (S27-T06) — scene
  type resolution reused by the brief.
- `@lumi/profiles` `LLM_TASK_TYPES` (`story_turn_generation`), `LlmConfigError`,
  `callOpenRouter`, `parseAndValidateLlmOutput`, task/provider settings repos,
  `decryptApiKey` — the production LLM contract (S12 origin-generator).
- `@lumi/ai` `story_scene` task schema concept (output shape reference) —
  this sprint does not require wiring `@lumi/ai`; the pipeline mirrors its
  schema for compatibility.

## In Scope

- **`HookSceneBrief`** (`@lumi/story` domain): deterministic mapping of a
  `StoryHookState` → typed brief (`sceneType`, `hookType`, `claim`, `itemId`,
  `factId`, `conditionId`, `targetNpcId`, `sourceNpcId`, `payloadSummary`).
- **`buildStoryScenePrompt`** (`@lumi/story` application): turns the brief +
  household boundary + age band + locale + nonce into a Turkish prompt with an
  explicit JSON output schema (scene id, setting, characters, narrative ≤4000,
  moment, nextPrompt).
- **`StorySceneLlmSettingsPort`** (`@lumi/story` application): the injected
  boundary returning `{ apiKey, modelId, temperature, maxOutputTokens,
  contentBoundary, ageBand, locale, enabled }` or throwing `LlmConfigError`.
- **`StorySceneGenerationService.generateSceneFromHook`** (`@lumi/story`
  application): brief → prompt → settings port → `callOpenRouter` (JSON mode,
  seeded nonce) → parse + validate → `GeneratedScene` (or `LlmGenerationError`
  with bounded retry).
- **Tests**: domain brief tests, prompt builder tests, service tests with a
  fake settings port + mocked `callOpenRouter` (valid, invalid output, retry,
  config errors), integration-style e2e of the mapper→prompt→service chain.

## Out of Scope

- Wiring into `advanceSession` / the reader (accepted hook → generated scene →
  displayed prose) — follow-up sprint.
- Production accept-opportunity route / outbox propagator loop (S31 backlog).
- Persisting generated scenes to `story_scenes` (the service returns a value;
  persistence is the wiring follow-up).
- Prompt registry seeding in `@lumi/prompts` (pipeline builds prompts inline
  via the builder, mirroring origin-generator).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S32-T01 | `HookSceneBrief` domain + `buildHookSceneBrief` | `@lumi/story` domain | unit: brief mapping per hook type |
| S32-T02 | `buildStoryScenePrompt` + scene output schema validation | `@lumi/story` application | unit: prompt builder + validator |
| S32-T03 | `StorySceneLlmSettingsPort` + `StorySceneGenerationService` (port-driven, `callOpenRouter`, retry, config errors) | `@lumi/story` application | unit: service (fake port + mocked client) |
| S32-T04 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-32/` | scenario matrix green |

## Requirements

- Every `HookType` (rumor, gift, warning, invitation, quest_seed,
  social_visit, information_share) maps to a typed brief with the right payload
  extraction; unknown payload fields degrade to safe defaults (no crash).
- The prompt is deterministic for a given (hook, boundary, age, locale, nonce);
  includes the content boundary and age band; mandates JSON output with the
  scene schema.
- The service resolves settings through the port; missing/disabled task,
  disabled provider, missing key → `LlmConfigError` with the origin-generator
  codes.
- The service calls the LLM once, parses + validates the JSON, and on invalid
  output retries with a fresh nonce (bounded, default 2 attempts); still
  invalid → `LlmGenerationError`.
- `@lumi/story` gains no dependency on `@lumi/profiles`; the port keeps the
  boundary.

## Acceptance Criteria

- [ ] `buildHookSceneBrief` maps all hook types deterministically (unit tested).
- [ ] `buildStoryScenePrompt` embeds boundary + age band + JSON schema; is
  deterministic (unit tested).
- [ ] `StorySceneGenerationService.generateSceneFromHook` returns a validated
  `GeneratedScene` for a fake port + mocked LLM.
- [ ] Config errors map to `LlmConfigError` codes; invalid output retries then
  fails with `LlmGenerationError`.
- [ ] `@lumi/story` has no `@lumi/profiles` dependency.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Port vs. real settings: web composition (follow-up) must implement the port
  with profiles repos. This sprint ships the port + a test double; the real
  adapter is a one-file follow-up when wiring lands.
- Retry semantics: keep bounded (max 2) and nonce-based to avoid duplicate
  production cost; mirror origin-generator exactly.
- Schema drift: the scene output schema should match `@lumi/ai`'s
  `storySceneSchema` so the future wiring is drop-in.
- Token budget: `narrative ≤ 4000` matches `story_scenes.narrative_text`
  `varchar(8000)`; validated in the output validator.

## Validation

- `pnpm --filter @lumi/story lint | typecheck | test`
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- `pnpm format:check` green.