# Sprint 37 Status

Status: COMPLETE
Date: 2026-08-09
Implementation evidence head: `a2de3b02e236a1e0becf9e5c2925c8da4799e27c`

## Delivered

- Real web `StorySceneLlmSettingsPort` adapter backed by profiles provider/task/key, parent policy and child scope.
- Tenant-scoped hook lookup and consumption; callers provide only `hookId`, not trusted hook payloads.
- Accepted hook content flows through `StorySceneGenerationService`, canonical `story_scenes` persistence and existing `advanceSession` semantics.
- Existing Story Reader playback exposes the committed generated scene through `currentScene`; no shadow reader/session state was introduced.
- Hook-backed generated scene identity is stable (`generated:hook:<hookId>`), preventing duplicate prose rows across retries.
- Replay detects an already committed hook scene before generation, avoiding a second provider call and double-advance.
- Missing/disabled settings fail before canonical mutation; foreign tenant hooks fail closed.
- Hook is marked consumed only after the generated scene is successfully committed/advanced.

## ULTEF production evidence

Scenario: `PX-LUMI-S37-HOOK-READER-PROD-001`

The DB-backed scenario uses disposable PostgreSQL plus a local HTTP OpenRouter-compatible provider stub. It exercises the real profiles encryption/settings adapter and story persistence without external provider cost.

Verified invariants:

1. accepted StoryHook -> real settings adapter -> generated scene;
2. generated scene -> canonical `story_scenes` -> `advanceSession`;
3. subsequent playback/reader state returns the generated scene;
4. replay creates no duplicate scene, makes no second provider call and does not double-advance;
5. disabled story-generation settings leave session state unchanged;
6. foreign tenant hook is rejected;
7. successful hook is marked consumed.

## Green gate evidence

Implementation head `a2de3b02e236a1e0becf9e5c2925c8da4799e27c`:

- ULTEF S37 Hook Reader — run #8 — PASS
- ULTEF Integration — run #467 — PASS
- Security Scan — run #651 — PASS
- CI — run #707 — PASS, including format, lint, typecheck, full tests, build and Build Artifact web image
- ULTEF PX-LUMI — run #105 — PASS
- ULTEF PX-02 Character Continuity — run #82 — PASS
- ULTEF PX-04 Emotional Consistency — run #71 — PASS
- ULTEF PX-05 Story Consequence — run #64 — PASS
- ULTEF S36 Quest Reward regression — run #28 — PASS
- ULTEF S35 Outbox Worker regression — run #38 — PASS

## Closure

All Sprint 37 exit criteria are satisfied. The sprint is COMPLETE. The next planned delivery area is template authoring/versioning, followed by the planned UI work unless a higher-priority production gap is discovered.
