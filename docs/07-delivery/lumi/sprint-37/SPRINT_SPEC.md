# Sprint 37 — Generated Hook Scene → Story Reader Production Wiring

Status: COMPLETE
Date: 2026-08-09

## Goal

Close the next production gap left by Sprint 32: accepted/generated StoryHook content must reach the active story session and Story Reader through the real `advanceSession` path, using a real web adapter for `StorySceneLlmSettingsPort`.

The completed S32 pipeline already provides deterministic hook briefs, prompt construction, validated LLM scene generation and bounded retry. This sprint composes that pipeline into production without bypassing canonical session/state semantics.

## Principles

- Story generation remains package-safe: `@lumi/story` does not import `@lumi/profiles`.
- Web owns the real `StorySceneLlmSettingsPort` adapter and resolves the existing `story_turn_generation` task/provider/key/content-boundary/age/locale configuration.
- Generated hook scenes enter the same canonical session progression boundary used by Story Reader; no parallel shadow session state is introduced.
- Missing/disabled LLM configuration fails explicitly and does not corrupt or partially advance a session.
- Hook consumption and session advancement must be replay-safe and tenant-scoped.

## Tasks

### S37-T01 — Real web LLM-settings adapter

Implement `StorySceneLlmSettingsPort` in web composition using the existing profiles LLM settings/task/provider infrastructure and secret decryption contract. Enforce household/child scope and return the exact settings expected by `StorySceneGenerationService`.

### S37-T02 — Generated hook scene → advanceSession composition

Add a production composition service/route boundary that takes an accepted hook associated with the active story session, invokes `StorySceneGenerationService`, and feeds the resulting scene into canonical `advanceSession` / session persistence semantics rather than returning detached prose.

### S37-T03 — Story Reader wiring

Ensure the Story Reader fetch/advance path exposes the newly committed generated scene using the existing reader response model. No separate UI redesign is in scope.

### S37-T04 — Failure and replay semantics

- LLM/settings failure must leave canonical session position unchanged.
- Repeating the same accepted hook/session operation must not create duplicate committed scenes or double-advance.
- Cross-household hook/session/child combinations must fail closed.
- A successfully committed hook scene must be visible on subsequent reader/session fetch.

### S37-T05 — ULTEF DB-backed production scenario

Stable scenario: `PX-LUMI-S37-HOOK-READER-PROD-001`.

Required evidence:

1. accepted StoryHook → real settings adapter → generated scene;
2. generated scene → canonical `advanceSession` persistence;
3. subsequent Story Reader/session fetch returns the generated scene;
4. replay creates no duplicate scene and does not double-advance;
5. LLM/settings failure leaves session unchanged;
6. tenant isolation rejects a foreign hook/child/session;
7. CI, Security, Integration, PX and S36 regression remain green.

## Out of scope

- Template authoring/versioning UI.
- Broader Story Reader visual redesign.
- New LLM provider configuration concepts; reuse the existing profiles settings system.
- New story state machine semantics unless a production gap is proven by the wiring work.

## Exit criteria

- [x] Real web `StorySceneLlmSettingsPort` adapter exists and is production wired.
- [x] Generated hook scenes enter canonical `advanceSession` semantics.
- [x] Story Reader returns the committed generated scene.
- [x] Replay and tenant isolation are DB-backed tested.
- [x] Failure before commit leaves session state unchanged.
- [x] `PX-LUMI-S37-HOOK-READER-PROD-001` is PASS.
- [x] CI / Security / Integration / PX / S36 regressions are green.
- [x] Sprint closeout evidence is recorded and status becomes COMPLETE.

## Closeout evidence

See `S37_STATUS.md`. Implementation evidence head `a2de3b02e236a1e0becf9e5c2925c8da4799e27c` passed S37 #8, Integration #467, Security #651, CI #707 (including Build Artifact), PX-LUMI #105, PX-02 #82, PX-04 #71, PX-05 #64, S36 #28 and S35 #38.

## Follow-up

After S37, proceed to template authoring/versioning and then the planned UI work unless the production wiring audit reveals a higher-priority blocker.
