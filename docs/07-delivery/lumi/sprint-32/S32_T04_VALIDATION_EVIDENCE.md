# Sprint 32 — T04: Backlog Validation Evidence

**Source plan:** `AGENTS.md` S31 closeout backlog (*accepted hook → story generation (LLM rendering) integration*)
**Status:** Story Generation Pipeline delivered
**Branch:** `codex/sprint-32-story-generation-pipeline` → PR (target `main`)

## Summary

Sprint 32 delivered the **story generation pipeline** that turns an accepted
StoryHook's content into LLM-rendered narrative. Before this sprint, a hook
only steered scene *selection* (`selectNextSceneForHook`, S27-T06); its payload
(claim / itemId / factId / conditionId …) never reached prose. Now there is a
deterministic hook→scene brief, a prompt builder, and a
`StorySceneGenerationService` that resolves LLM settings through an injected
port (package-safe), calls the provider, and returns a validated `GeneratedScene`
with bounded retry. This is the generation layer; wiring into `advanceSession` /
the reader is the documented follow-up.

## Deliverables (T01–T03)

- **T01** `HookSceneBrief` + `buildHookSceneBrief` (`@lumi/story` domain) —
  typed, deterministic payload normalization for every `HookType`; unknown
  fields fold into a bounded summary; pure + never throws. 7 unit tests.
- **T02** `buildStoryScenePrompt` + `parseAndValidateSceneOutput` +
  `SCENE_NARRATIVE_MAX` (`@lumi/story` application) — deterministic Turkish
  prompt (boundary + age band + locale + JSON schema), schema validation with
  bounded narrative (4000 cap). 8 unit tests.
- **T03** `StorySceneLlmSettingsPort` (injected boundary; story never imports
  `@lumi/profiles`) + `LlmConfigError` / `LlmGenerationError` +
  `StorySceneGenerationService.generateSceneFromHook` — port-driven, JSON-mode
  call, parse + validate, bounded retry with fresh nonce. 5 unit tests with a
  fake port + mocked caller.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Accepted hook content reaches story prose | Hook → brief → prompt → LLM → validated scene | brief + prompt + service tests |
| Deterministic input, varied prose | deterministic prompt per (hook, boundary, age, locale, nonce); nonce differs per attempt | prompt determinism test + retry-nonce test |
| Package-safe (story does not import profiles) | `StorySceneLlmSettingsPort` injected; no `@lumi/profiles` dep added | code review + service config-error test |
| Production LLM contract (origin-generator) | `LlmConfigError` codes; retry; JSON parse+validate | config-error + retry tests |
| Child-safe output | prompt embeds content boundary + age band; schema validates narrative length | prompt tests + output cap test |

## Coverage Summary

- `@lumi/story` unit: **135 tests green** (115 prior + 20 new: brief 7,
  prompt/output 8, service 5).
- `format:check | lint | typecheck | test | build | check-mojibake` green.
- **Partial:** 0 · **Future-backlog:** wiring generated scenes into
  `advanceSession` / reader; real settings port adapter in web (one-file);
  production accept-opportunity route / outbox propagator loop; quest rewards.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| `buildHookSceneBrief` maps all hook types deterministically | ✅ T01 |
| Prompt embeds boundary + age band + JSON schema, deterministic | ✅ T02 |
| Service returns validated scene for fake port + mocked LLM | ✅ T03 |
| Config errors → `LlmConfigError`; invalid output retries then fails | ✅ T03 |
| `@lumi/story` has no `@lumi/profiles` dependency | ✅ port boundary |
| All source green | `format:check \| lint \| typecheck \| test \| build` |