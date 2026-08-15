# Character Onboarding Live E2E — M1 Flow Map

Tracking: #208

## Purpose

This document is the executable-test discovery map for the current Character Onboarding implementation. The live E2E must exercise the same application entry points, prompt registry, Context Builder, provider/router, validation and persistence path used by the product. It must not call OpenRouter directly.

## Confirmed context path

`buildGenerationContext(userId, { householdId, childProfileId, profile: "character_onboarding" })`

Currently supplies:

- child identity: id, age band, locale
- child personalization: interests, custom interests, development goals
- active creation cycle: cycle id, start direction, latestSummary as previous selections

The assembler applies the `character_onboarding` policy and budget before prompt context is produced.

## M1 discovery table

The following rows must be filled from current `main` before the live harness is implemented.

| Stage | UI/API entry point | Generation service | Prompt/template | Response schema | Persist/selection service | Cycle transition | Prior context consumed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 3 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 5 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 6 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 7 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 8 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 9 | TODO | TODO | TODO | TODO | TODO | TODO | TODO |

## Finalization path

To discover from current `main`:

1. Which stage/action marks the creation cycle completed.
2. Which application service creates or finalizes the Character record.
3. Which onboarding selections are copied into canonical character state.
4. Whether finalization is idempotent.
5. How the completed character is loaded after refresh/navigation.

## Live E2E invariants

For each generative stage the test will eventually assert:

1. generation is invoked through the product application path;
2. the configured provider/model is used indirectly through that path;
3. returned candidates satisfy the application's schema;
4. at least one usable candidate exists;
5. the chosen candidate is persisted through the normal selection command;
6. the creation cycle advances to the expected state;
7. relevant previous selections are visible to the next generation through Context Builder;
8. estimated context remains inside policy budget;
9. required child context is not silently removed;
10. unrelated story/world/memory context is not leaked into onboarding.

## Test execution boundary

The paid live suite must be separate from normal PR unit tests. Target execution modes after M1/M2:

- manual GitHub Actions run;
- optional nightly run after stabilization;
- explicit local live-test flag.

Exact creative wording is never an assertion. Schema, persistence, authorization, state transitions and context propagation are assertions.
