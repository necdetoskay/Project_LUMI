# Sprint 52 — Implementation Status

Status: IN PROGRESS
Date: 2026-08-10

## Current objective

Close the real browser composition path from Story Reader choice to durable world consequence and persistent scene progression in the canonical Elif -> Lina -> Işık Vadisi demo universe.

## Workboard

- [x] T01 Playable authored story graph — initial two-option slice committed
- [x] T02 Reader choice -> durable world consequence wiring — production handoff committed
- [x] T03 Choice -> scene progression verification path authored; dedicated browser execution pending
- [x] T04 Visible `Şimdi` consequence wired through canonical world location; dedicated browser execution pending
- [x] T05 Exit / reload / continue browser journey authored; dedicated browser execution pending
- [x] T06 Dedicated S52 browser ULTEF workflow authored; green evidence pending
- [ ] Final CI / Integration / Security / PX / S40-S51 regression matrix

## Repository findings

Sprint 51 already provides a real browser-visible seeded session. Story Reader already supports production choice rendering and calls `commitChoice` followed by `advanceSession` when an option resolves a target scene.

The repository also already contains the PX-05 production service `commitPersistedChoiceConsequence`, which converts persisted choice metadata into canonical idempotent world commits. The missing browser composition boundary was that the live choice commit endpoint did not invoke that service.

Sprint 43 `Şimdi` reads canonical current location from the world model and actual inventory state. The world package already provides `moveCharacterToLocation`, including household/world isolation, location accessibility, path validation, current-location persistence and domain-event recording. S52 therefore reuses that boundary instead of adding demo-only UI state.

## Implemented slices

### T01 — playable authored graph

`apps/web/scripts/lumi-demo-story-db.mjs` authors:

- entry choice point `ilk-isik-yolu`;
- option `isigi-takip-et`;
- option `mira-ile-incele`;
- next scene `atesbocekleri-izinde`;
- next scene `mira-ile-izleri-okumak`;
- deterministic choice transitions;
- one `scene_transition` preview and one durable `flag_set` preview per option.

The grove scene carries canonical `locationKey: atesbocekleri-korusu`; the Mira scene carries `locationKey: fisildayan-orman`. All demo IDs remain stable and visual metadata remains truthful (`visualStatus: not_generated`).

Readiness permits the persisted current scene to be any canonical playable S52 scene, so a legitimately progressed session is not misclassified as unready. Reset removes progressed choice/consequence/checkpoint/event/session data in dependency-safe order.

### T02 — production world handoff

`POST /api/stories/sessions/{sessionId}/choices/{choicePointId}/commit`:

1. keeps existing household/session authorization;
2. loads the persisted selected option;
3. detects supported durable world previews (`flag_set` / `flag_remove`);
4. commits through the existing `commitChoice` service;
5. invokes `commitPersistedChoiceConsequence` when a durable preview exists;
6. returns canonical world-consequence evidence with the committed choice.

Non-world-changing choices remain backward compatible.

### T03/T04 — target scene -> canonical current location

The same production endpoint now resolves the selected option's `scene_transition`, loads the persisted target scene, and treats `scene.metadata.locationKey` as authored canonical scene-location context.

It then:

1. resolves that location key inside the session's real world graph;
2. resolves the session protagonist from persisted session participants;
3. reads the protagonist's current world location;
4. no-ops when already at the canonical target;
5. otherwise calls `@lumi/world` `moveCharacterToLocation` with the authenticated household and session world scope.

For the demo's `isigi-takip-et` option this means Lina moves through the real connected path from Fısıldayan Orman to Ateşböcekleri Korusu. `Şimdi` requires no special S52 rendering logic because it already reads the canonical current-location projection.

### T05/T06 — dedicated browser journey

`apps/web/tests/e2e/ultef-s52-playable-demo-journey.spec.ts` defines `PX-LUMI-S52-PLAY-RELOAD-001`:

`login -> Reader entry scene -> choose follow-light -> grove scene -> browser reload -> grove scene still current -> Şimdi -> Ateşböcekleri Korusu -> stories -> continue -> grove scene`.

`.github/workflows/ultef-s52-playable-demo.yml` provisions a disposable PostgreSQL database, applies the canonical auth/profile/world/NPC/story migration order, seeds the real demo universe, and runs the S52 Playwright scenario.

## Remaining blockers

Sprint 52 is not complete until the newly authored S52 gate is green on the final head and the normal CI / Integration / Security / PX / relevant S40-S51 regression matrix is green. Any type/build/runtime failure must be fixed before this workboard may move to COMPLETE.
