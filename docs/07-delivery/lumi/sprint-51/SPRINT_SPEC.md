# Sprint 51 — LUMI Demo Universe Seed

Status: PLANNED
Date: 2026-08-10

## Goal

Create a deterministic, resettable, production-shaped LUMI reference universe that lets us open the real application in a browser and evaluate how LUMI actually feels before visual generation is introduced.

## Product target

The browser journey must become meaningfully populated:

`Login -> Parent Home -> Elif -> Lina -> Şimdi -> Işık Vadisi -> Hikâyeler -> Story Reader`

The result must feel like one coherent child/world/story context rather than unrelated fixture rows.

## Canonical reference content

Initial target content:

- one demo household;
- child profile: Elif, age 7;
- canonical player character: Lina;
- world: Işık Vadisi;
- starting location: Fısıldayan Orman;
- additional important locations: Ateşböcekleri Korusu, Eski Taş Köprü, Ay Gölü, Lina'nın evi;
- NPCs: Mira, Tiko, Yaşlı Meşe;
- authored relationships between Lina and selected NPCs;
- a small inventory set;
- at least one quest or quest seed where existing production contracts support it;
- canonical memories/world facts sufficient to make continuity surfaces non-empty without fabrication;
- one starting story definition/version/session that is playable through the current Story Reader.

## Implementation rules

1. Use deterministic semantic keys/UUIDs so the same seed can be safely replayed.
2. Prefer existing application/domain services. Direct SQL is permitted only for fixture bootstrap where no safe public write boundary exists, and must be isolated in the demo seeder rather than product runtime code.
3. `demo:seed` must be idempotent.
4. `demo:reset` must delete only records belonging to the canonical demo household/reference IDs.
5. The seeder must refuse unsafe reset when the configured database is not explicitly recognized as local/dev/test/demo.
6. No generated image is claimed or fabricated in Sprint 51.
7. The demo must not bypass runtime story/NPC/world effect pipelines to fake post-story outcomes.
8. Re-seeding may restore initial reference state only after an explicit reset; ordinary `demo:seed` must not unexpectedly overwrite a played universe.

## Delivery slices

### S51-T01 — Reference manifest

Define one versioned manifest containing stable IDs/keys and authored demo content. Separate authored reference data from seed mechanics.

### S51-T02 — Safe seed/reset runner

Add repository commands such as:

- `pnpm demo:seed`
- `pnpm demo:reset`
- optionally `pnpm demo:status`

with environment safety guards and concise human-readable output.

### S51-T03 — Profile / character / world bootstrap

Seed the household, child profile, character, world graph, initial/current location and other production-required ownership records.

### S51-T04 — Inventory / relationships / memory / NPC state

Populate enough canonical supporting state to make `Şimdi`, world continuity and later decision systems visibly meaningful.

### S51-T05 — Story bootstrap

Create or reuse a canonical story definition/version/session so the seeded child can enter the existing Story Reader without manual database preparation.

### S51-T06 — Browser-facing smoke journey

Verify the seeded reference universe through real authenticated web routes/pages. Prefer Playwright/ULTEF over assertions against SQL alone.

### S51-T07 — Dedicated DB-backed ULTEF

Create a persistent Sprint 51 gate covering seed idempotency, reset isolation, referential integrity and semantic completeness.

## Required ULTEF evidence

Dedicated scenario family:

- `PX-LUMI-S51-DEMO-SEED-001` — seed from empty disposable PostgreSQL and verify the canonical reference universe;
- `PX-LUMI-S51-DEMO-SEED-REPLAY-002` — replay seed without duplicate canonical entities;
- `PX-LUMI-S51-DEMO-RESET-003` — reset removes only the demo universe and preserves a foreign household fixture;
- `PX-LUMI-S51-DEMO-WEB-004` — browser/API journey resolves Elif -> Lina -> current world/location -> stories/reader with no fabricated runtime claims.

## Acceptance criteria

1. One command produces the canonical reference universe on a prepared development DB.
2. Re-running seed produces no duplicate household/profile/character/world/NPC/story rows.
3. Reset is scoped and safe.
4. Foreign household data remains unchanged by seed/reset.
5. Elif, Lina and Işık Vadisi are available through existing production read surfaces.
6. `Şimdi` shows the seeded canonical current location and inventory rather than fallback/empty technical state.
7. Story Reader can enter the seeded playable story/session.
8. Seed data contains no fake generated-image claims.
9. Dedicated S51 DB-backed ULTEF passes.
10. CI, Integration, Security and relevant S42–S50/PX regressions are green before COMPLETE.

## Non-goals

- live image generation;
- character visual candidate generation;
- location art generation;
- Story Reader illustration generation;
- final visual polish;
- replacing production authoring tools with the demo seeder.

These belong to S53–S55. S52 first proves the playable persistent journey using the seeded universe.

## Exit condition

Sprint 51 is COMPLETE only when we can seed the reference universe, open it through real app surfaces, enter the Story Reader, reset it safely, and prove those properties with dedicated ULTEF evidence on the final head.
