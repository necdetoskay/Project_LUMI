# Sprint 52 — Implementation Status

Status: COMPLETE
Date: 2026-08-10

## Result

Sprint 52 closes the real browser composition path from Story Reader choice to durable world consequence, persistent scene progression and canonical `Şimdi` state in the Elif -> Lina -> Işık Vadisi reference universe.

The verified product journey is now:

`login -> Story Reader -> choice -> committed consequence -> next scene -> canonical world mutation -> reload -> Şimdi -> continue story`

## Workboard

- [x] T01 Playable authored story graph
- [x] T02 Reader choice -> durable world consequence wiring
- [x] T03 Choice -> scene progression and reload persistence
- [x] T04 Visible `Şimdi` consequence through canonical world location
- [x] T05 Exit / reload / continue browser journey
- [x] T06 Dedicated S52 browser ULTEF gate
- [x] Final CI / Integration / Security / PX / S40-S51 regression matrix

## Production findings closed by S52

Sprint 51 provided a real browser-visible seeded story session, and PX-05 already provided the canonical `commitPersistedChoiceConsequence` world-commit boundary. Two composition gaps remained in the live product path:

1. Story Reader choice projection exposed persistence-field names (`promptText`, `optionText`) while the client expected `prompt` and `label`, so persisted choices could exist without rendering correctly.
2. The live choice endpoint committed the choice but did not compose the persisted consequence and authored scene location back into the canonical world state used by `Şimdi`.

S52 closes both gaps without adding demo-only runtime state.

## Implemented slices

### T01 — playable authored graph

`apps/web/scripts/lumi-demo-story-db.mjs` authors a deterministic two-path continuation for `Fısıldayan Ormandaki İlk Işık`:

- entry choice point `ilk-isik-yolu` with canonical type `single`;
- option `isigi-takip-et`;
- option `mira-ile-incele`;
- next scene `atesbocekleri-izinde`;
- next scene `mira-ile-izleri-okumak`;
- deterministic choice transitions;
- one `scene_transition` preview and one durable `flag_set` preview per option.

The grove scene carries canonical `locationKey: atesbocekleri-korusu`; the Mira scene carries `locationKey: fisildayan-orman`. All demo IDs remain stable and visual metadata remains truthful (`visualStatus: not_generated`).

Readiness permits the current session scene to be any canonical playable S52 scene, so a legitimately progressed universe remains ready. Reset removes progressed choice/consequence/checkpoint/event/session data in dependency-safe order.

### T02 — persisted choice -> durable world consequence

`POST /api/stories/sessions/{sessionId}/choices/{choicePointId}/commit` now:

1. preserves household/session authorization;
2. loads the persisted selected option;
3. detects supported durable world previews (`flag_set` / `flag_remove`);
4. commits through the existing `commitChoice` service;
5. invokes the existing PX-05 `commitPersistedChoiceConsequence` boundary when required;
6. returns canonical world-consequence evidence with the committed choice.

Non-world-changing choices remain backward compatible.

### T03 — truthful Story Reader choice projection

`GET /api/stories/sessions/{sessionId}/reader` now normalizes persisted choice records into the Reader contract:

- `promptText -> prompt`;
- `optionText -> label`;
- persisted consequence previews remain intact for next-scene resolution.

This is a general production projection fix, not a demo-specific exception.

### T04 — target scene -> canonical current location

The live choice endpoint resolves the selected option's `scene_transition`, loads the persisted target scene and treats `scene.metadata.locationKey` as authored canonical scene-location context.

It then resolves the location inside the real session world, resolves the persisted protagonist, checks the current location and, when movement is required, calls `@lumi/world` `moveCharacterToLocation` with the authenticated household and session world scope.

For `isigi-takip-et`, Lina therefore moves through the real connected world path from Fısıldayan Orman to Ateşböcekleri Korusu. `Şimdi` requires no S52-specific display logic because Sprint 43 already reads canonical current location.

### T05/T06 — persistent browser journey

`apps/web/tests/e2e/ultef-s52-playable-demo-journey.spec.ts` defines:

- `PX-LUMI-S52-PLAY-RELOAD-001`

and verifies:

`login -> Reader entry scene -> choose follow-light -> Ateşböceklerinin İzinde -> browser reload -> same scene -> Şimdi -> Ateşböcekleri Korusu -> stories -> continue -> same scene`.

`.github/workflows/ultef-s52-playable-demo.yml` provisions disposable PostgreSQL, applies canonical auth/profile/world/NPC/story migrations, seeds the real demo universe and executes the Playwright journey.

## Final evidence

Validated implementation head before this closeout-only documentation commit:

`96522eade165c1d1bdc1671ea6298ebcd29b4fb8`

Green evidence on that head:

- CI #1079 — PASS, including format, lint, typecheck, unit tests, load gate, production build and Build Artifact;
- ULTEF Integration #764 — PASS across DB integration, L6/L9 continuity/recovery/isolation and PX memory coverage;
- Security Scan #1024 — PASS;
- ULTEF S52 Playable Demo #6 — PASS;
- ULTEF S51 Demo Browser #36 — PASS;
- ULTEF S51 Demo Bootstrap #53 — PASS;
- ULTEF S51 Demo Manifest #66 — PASS;
- ULTEF PX-LUMI #402 — PASS;
- ULTEF PX-02 Character Continuity #379 — PASS;
- ULTEF PX-04 Emotional Consistency #368 — PASS;
- ULTEF PX-05 Story Consequence #361 — PASS;
- relevant S35-S50 regression workflows — PASS.

The S52 gate initially exposed the Reader projection mismatch; after normalizing the persisted projection, the same real browser journey passed end-to-end.

## Exit condition

Sprint 52 is COMPLETE: a real Story Reader choice now creates persistent story progression and canonical world state that survives reload, is visible from `Şimdi`, and remains resumable through the production browser experience.

Visual generation remains intentionally out of scope and begins with Sprint 53 — Character Visual Canon.
