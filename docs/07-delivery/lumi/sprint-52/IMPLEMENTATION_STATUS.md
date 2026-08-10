# Sprint 52 — Implementation Status

Status: IN PROGRESS
Date: 2026-08-10

## Current objective

Close the real browser composition path from Story Reader choice to durable world consequence and persistent scene progression in the canonical Elif -> Lina -> Işık Vadisi demo universe.

## Workboard

- [x] T01 Playable authored story graph — initial two-option slice committed
- [x] T02 Reader choice -> durable world consequence wiring — initial production handoff committed
- [ ] T03 Choice -> scene progression verification and replay hardening
- [ ] T04 Visible `Şimdi` consequence through production state/read boundary
- [ ] T05 Exit / reload / continue browser journey
- [ ] T06 Dedicated S52 DB + browser ULTEF gate
- [ ] Final CI / Integration / Security / PX / S40-S51 regression matrix

## Initial repository findings

Sprint 51 already provides a real browser-visible seeded session, but its authored story graph contains only one entry scene. Story Reader itself already supports production choice rendering and calls `commitChoice` followed by `advanceSession` when an option exposes a target scene.

The repository also already contains the PX-05 production service `commitPersistedChoiceConsequence`, which converts persisted choice metadata into canonical idempotent world commits. The missing browser composition boundary was that the live choice commit endpoint did not invoke that service.

## Implemented slice

### T01 — playable authored graph

`apps/web/scripts/lumi-demo-story-db.mjs` now authors:

- entry choice point `ilk-isik-yolu`;
- option `isigi-takip-et`;
- option `mira-ile-incele`;
- next scene `atesbocekleri-izinde`;
- next scene `mira-ile-izleri-okumak`;
- deterministic choice transitions;
- one `scene_transition` preview and one durable `flag_set` preview per option.

All new demo IDs are stable. Scene metadata remains `visualStatus: not_generated`.

The adapter's readiness definition now permits the persisted current scene to be any canonical playable S52 scene instead of incorrectly treating a legitimately progressed session as unready.

Reset order now removes demo choice consequences, committed choices, options, points, checkpoints, visits, idempotency records, event rows, transitions and scenes before deleting the session/version graph.

### T02 — production world handoff

`POST /api/stories/sessions/{sessionId}/choices/{choicePointId}/commit` now:

1. keeps the existing household/session authorization boundary;
2. loads the persisted selected option;
3. detects supported durable world previews (`flag_set` / `flag_remove`);
4. commits the choice through the existing `commitChoice` service;
5. automatically invokes `commitPersistedChoiceConsequence` only when such a durable preview exists;
6. returns the canonical world-consequence result alongside the committed choice.

No demo-specific IDs or semantics were added to the runtime endpoint. Existing non-world-changing choices continue to behave as before.

## Next implementation slice

T03/T04 must now prove and expose the complete effect:

`click option -> committed choice -> durable world commit -> advanceSession -> reload -> Şimdi-visible production state`.

The next coding decision should prefer an already-existing location, inventory or quest mutation boundary rather than teaching the `Şimdi` UI to interpret demo-only flags.

## Current status

Sprint 52 is not complete. Initial production wiring and authored playable data are in place on branch `s52/playable-demo-journey`; dedicated S52 runtime tests and the visible `Şimdi` consequence remain blocking work.
