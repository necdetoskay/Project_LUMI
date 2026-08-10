# Sprint 52 — Playable Demo Journey

Status: COMPLETE
Date: 2026-08-10

## Goal

Turn the Sprint 51 reference universe into a genuinely playable, persistent production-shaped journey:

`story start -> scene -> choice -> consequence -> world mutation -> inventory/quest -> exit -> reload -> continue`

Sprint 52 must prove that a meaningful story choice changes durable LUMI state through existing production boundaries and that the result remains visible after leaving and reopening the experience.

## Canonical reference journey

Reference scope remains:

- child profile: Elif;
- player character: Lina;
- world: Işık Vadisi;
- starting location: Fısıldayan Orman;
- opening story: Fısıldayan Ormandaki İlk Işık;
- active quest: Kayıp Işık İzini Bul.

The opening scene receives at least two real options. Each option must:

1. be loaded through the production Reader choice API;
2. commit through `commitChoice`;
3. produce a persisted `ChoiceConsequence`;
4. hand supported durable consequence previews to the existing canonical world-commit service;
5. advance to a deterministic next scene;
6. remain idempotent on retry/reload;
7. preserve household/world isolation.

## Production-boundary rule

No Sprint 52 browser action may mutate profile/story/world tables directly to fake gameplay.

Demo seed code may author the initial story graph and choice metadata, but runtime consequences must use production services already proven by the story/choice/world pipelines.

## Delivery slices

### S52-T01 — Playable authored story graph

Extend the canonical demo story with:

- at least one choice point;
- at least two options;
- deterministic next scenes;
- explicit consequence previews;
- stable IDs/keys;
- reset-safe authored graph rows.

### S52-T02 — Reader choice -> world consequence production wiring

Close the production composition gap where Story Reader previously called `commitChoice` and `advanceSession` without invoking the already-existing durable choice-world handoff.

The choice endpoint must automatically run canonical world consequence commit only when the selected option actually contains a supported durable world consequence (`flag_set` / `flag_remove`). Non-world choices must retain their existing behavior.

### S52-T03 — Choice -> scene progression

Prove the browser can choose an available option and reach the intended next scene through the existing session advance boundary.

A stale/replayed request must not create a second committed choice, second world mutation or duplicate scene visit.

### S52-T04 — Visible `Şimdi` consequence

Project at least one story-caused durable change onto an existing production read surface used by Lina's `Şimdi` page.

Preferred evidence order:

1. location change through an existing world/location mutation boundary;
2. inventory change through the production inventory grant boundary;
3. quest progress/status through the production quest boundary;
4. a clearly labeled durable world fact only if the above are not yet composition-ready.

The UI must not claim a state change that exists only in browser memory.

### S52-T05 — Exit / reload / continue

After making the choice:

- leave Story Reader;
- open Lina's `Şimdi` page and observe the durable result;
- return to stories;
- reopen the same session;
- observe the persisted current scene and immutable choice history.

### S52-T06 — Dedicated ULTEF gate

Add DB-backed and browser-backed S52 gates covering choice, world commit, progression, reload, replay safety and tenant isolation.

## Required ULTEF evidence

Scenario family:

- `PX-LUMI-S52-PLAYABLE-CHOICE-001` — seeded entry scene exposes the canonical options and committing one option persists one committed choice + consequence;
- `PX-LUMI-S52-WORLD-CONSEQUENCE-002` — the selected option produces exactly one canonical durable world commit with choice evidence provenance;
- `PX-LUMI-S52-SCENE-PROGRESSION-003` — selected option advances to the intended authored next scene;
- `PX-LUMI-S52-RELOAD-CONTINUE-004` — reload returns the same current scene, choice history and durable consequence;
- `PX-LUMI-S52-REPLAY-IDEMPOTENCY-005` — retry cannot duplicate choice, world commit, checkpoint or scene visit;
- `PX-LUMI-S52-NOW-VISIBILITY-006` — returning to Lina's `Şimdi` surface displays the story-caused durable change;
- `PX-LUMI-S52-ISOLATION-007` — a foreign household cannot read or mutate the demo session/world consequence.

## Acceptance criteria

1. Sprint 51 Demo Control still prepares a deterministic resettable universe.
2. The opening Story Reader scene shows at least two real selectable options.
3. Selecting a supported world-changing option invokes the existing canonical choice-world handoff without a second client-only mutation path.
4. Exactly one committed choice and one durable world commit exist after the selection.
5. The session reaches the option's deterministic next scene through `advanceSession`.
6. At least one story-caused durable state change is visible on Lina's `Şimdi` page.
7. Leaving and reopening the story restores the progressed scene and immutable choice history.
8. Replaying the same selection is idempotent.
9. Reset removes S52 authored/runtime demo rows without touching foreign household data.
10. No visual-generation claim is introduced; scene media remains truthfully `not_generated`.
11. Dedicated S52 ULTEF, CI, Integration, Security and relevant PX/S40-S51 regressions are green before COMPLETE.

## Non-goals

- image generation or asset persistence (Sprint 53+);
- character visual candidate selection;
- location visual canon;
- illustrated Story Reader;
- broad new story-authoring UI;
- replacing the existing story/world/inventory/quest production services with demo-specific shortcuts.

## Exit condition

Sprint 52 is COMPLETE only when a user can make a meaningful choice in the canonical demo story, observe its durable consequence outside Story Reader, leave, reload and continue without duplicate effects or tenant leakage.
