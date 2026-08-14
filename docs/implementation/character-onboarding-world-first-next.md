# Character Onboarding v2 — World-first next slice

Refs: #197, #199

## Goal

Continue the merged start-direction foundation with a complete world-first vertical slice that uses the Prompt Registry for real LLM generation.

## User flow

1. `/characters/new/start` -> choose World-first.
2. `/characters/new/world-feeling` -> choose and persist a world feeling.
3. Generate compatible character-type candidates through `character_onboarding.world_character_suggestions`.
4. `/characters/new/world-character` -> present generated candidates without provider/model/internal ids.
5. Select one candidate and persist it to the active `CharacterCreationCycle` selection ledger.
6. Continue to `/characters/new/identity`.

## Runtime contract

`CreationCycle -> Prompt Registry active version -> safe context renderer -> LLM gateway -> JSON schema validation -> generation trace -> candidate UI`

The production prompt must not be embedded in the consumer source code. Generation trace must retain prompt key/version, provider/model, token usage where available, approximate cost where available, latency, validation result, and creation-cycle reference.

## Acceptance

- World feeling survives refresh/resume.
- World-character suggestions are generated from the selected world feeling and current cycle context.
- Active Prompt Registry version is resolved at runtime.
- Malformed model output is rejected before reaching child UI.
- Generation failure gives a child-safe retry state and does not corrupt the cycle.
- Refresh/regenerate preserves prior selection/generation history rather than overwriting audit history.
- Selecting a world-character candidate persists an append-only selection.
- Continue routes to identity generation.
- Child UI exposes no model/provider/prompt ids or lifecycle jargon.
- Focused tests cover persistence, prompt resolution, schema rejection, retry, selection, and routing.
- 360px mobile remains usable.
- Prettier, lint, typecheck, focused tests, ULTEF and security gates pass.

## Explicitly deferred

Full Settings/Admin prompt editor, playground, A/B comparison, activation/rollback UI and broader Prompt Management remain in #199.
