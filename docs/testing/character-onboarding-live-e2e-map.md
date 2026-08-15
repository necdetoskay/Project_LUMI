# Character Onboarding Live E2E — M1 Flow Map

Tracking: #208

## Purpose

This document is the executable-test discovery map for the current Character Onboarding implementation. The live E2E must exercise the same application entry points, prompt registry, Context Builder, provider/router, validation and persistence path used by the product. It must not call OpenRouter directly.

## Canonical onboarding contract

The previously agreed canonical onboarding has 9 stages:

1. Character Type
2. Universe
3. World
4. World ↔ Character Fit
5. Character Idea / Identity
6. Region
7. Origin
8. Core Saga
9. Final Review / Commit (`Dünyaya getir`)

`Start Direction` is a routing decision before/reordering the canonical flow, not a replacement canonical stage. It selects `character_first` or `world_first` and should eventually converge into the common character flow.

## Confirmed current V2 world-first state machine

Current `character-creation-cycle.service.ts` implements these persisted transitions:

1. `chooseCharacterCreationDirection(world_first)` → `world_feeling`
2. `chooseWorldFeeling(...)` → `world_character_suggestions`
3. `chooseWorldCharacterSuggestion(...)` → `character_identity`
4. `chooseCharacterIdentity(...)` → `origin`
5. no persisted transition after `origin` is currently implemented in this service

Every implemented selection above writes both `character_creation_cycles.latestSummary/currentStep` and a `character_creation_selections` record.

## Canonical ↔ current V2 matrix

| Canonical stage | Intended responsibility | Current V2 world-first representation | UI/API | Live LLM | Persistence / transition | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Character Type | Choose human/animal/fantastic character family | No confirmed world-first state before world construction; `character_first` points to `character_type` but its complete V2 path still needs mapping | Needs discovery | Needs discovery | `character_first` target exists, full path unconfirmed | 🟡 Partial |
| 2. Universe | Establish/select universe container/context | No distinct confirmed V2 state in the current cycle service | Not confirmed | Not confirmed | Not confirmed | ❌ Missing/unmapped |
| 3. World | Establish the world | `world_feeling` is currently the world-side entry point | Confirmed selection path | No LLM required for feeling selection itself | `chooseWorldFeeling` persists and advances | 🟡 Partial — world feeling is not yet proven equivalent to complete World stage |
| 4. World ↔ Character Fit | Produce/choose a character compatible with the selected world | `world_character_suggestions` | Confirmed API/application generation + selection | ✅ real configured LLM path | `chooseWorldCharacterSuggestion` → `character_identity` | ✅ Implemented for world-first |
| 5. Character Idea / Identity | Define identity/name/personality traits | `character_identity` | Confirmed generation + selection path | ✅ real configured LLM path | `chooseCharacterIdentity` → `origin` | ✅ Implemented |
| 6. Region | Choose the character's concrete region/start location inside the world | No distinct confirmed V2 state | Not confirmed | Not confirmed | Not confirmed | ❌ Missing/unmapped |
| 7. Origin | Define where/how the character comes from | `origin` generation exists | Generation API confirmed | ✅ real configured LLM path | Selection/persistence command not found; no next transition | 🟡 Blocked |
| 8. Core Saga | Establish the character's foundational saga/long-term narrative seed | No confirmed V2 state | Not confirmed | Not confirmed | Not confirmed | ❌ Missing/unmapped |
| 9. Final Review / Commit | Review selections and create/finalize canonical Character | No confirmed V2 state/finalizer | Not confirmed | N/A/needs discovery | No confirmed cycle completion/Character finalization path | ❌ Missing/unmapped |

## Start Direction status

`chooseCharacterCreationDirection` persists the user's routing choice:

- `world_first` → `world_feeling`
- `character_first` → `character_type`

The world-first branch is partially implemented as mapped above. The complete character-first branch still needs discovery and must not be assumed to be complete merely because the `character_type` state target exists.

## Confirmed context path

`buildGenerationContext(userId, { householdId, childProfileId, profile: "character_onboarding" })`

Currently supplies:

- child identity: id, age band, locale
- child personalization: interests, custom interests, development goals
- active creation cycle: cycle id, start direction, latestSummary as previous selections

The assembler applies the `character_onboarding` policy and budget before prompt context is produced.

Confirmed onboarding LLM consumers so far include world-character, character-identity and character-origin generation. Relevant previous selections are supplied through the creation cycle summary and Context Builder rather than by bypassing the application path.

## M1 blockers / decisions

1. Implement or locate Origin selection/persistence and its next transition.
2. Map the complete `character_first` branch beginning at `character_type`.
3. Decide/confirm how canonical Universe and World map onto the current `world_feeling` design; do not silently collapse them without an explicit product decision.
4. Implement/map Region.
5. Implement/map Core Saga.
6. Implement/map Final Review / Commit and canonical Character finalization.
7. Define where world-first and character-first converge so downstream stages share one state machine rather than duplicating onboarding logic.

## Finalization path

Still to discover/implement:

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
