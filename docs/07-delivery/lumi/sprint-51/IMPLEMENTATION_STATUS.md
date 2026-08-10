# Sprint 51 — Implementation Status

Status: IMPLEMENTATION
Date: 2026-08-10

## Current objective

Build and verify the canonical LUMI Demo Universe so product evaluation can move from isolated backend capability checks to a real browser experience.

## Workboard

- [x] T01 Reference manifest
- [x] T02 Safe seed/reset runner
- [ ] T03 Profile/character/world bootstrap
- [ ] T04 Inventory/relationships/memory/NPC state
- [ ] T05 Story bootstrap
- [ ] T06 Browser-facing smoke journey
- [ ] T07 Dedicated S51 DB-backed ULTEF
- [ ] Final CI / Integration / Security / PX / S42-S50 regression matrix
- [ ] Browser product review: "How does LUMI actually feel?"

## T01 evidence — canonical reference manifest

T01 defines a versioned, production-shaped reference manifest at `scripts/demo/lumi-demo-manifest.mjs`.

Canonical reference identities now include:

- demo household: `LUMI Demo Ailesi`;
- child profile: Elif, age 7;
- canonical child character: Lina;
- reference world: Işık Vadisi;
- start location: Fısıldayan Orman;
- five stable locations and deterministic connections;
- three supporting NPCs: Mira, Tiko and Yaşlı Meşe;
- two initial inventory objects;
- two canonical NPC memories;
- one active reference quest;
- stable story definition/version/session identities for the later story bootstrap task.

All reference entities use stable UUIDs or semantic keys. The manifest validator rejects duplicate stable IDs/keys, invalid references, out-of-range relationship values and invalid memory salience. `scripts/demo/lumi-demo-manifest.selftest.mjs` includes both positive and intentionally malformed-manifest assertions.

## T02 evidence — safe seed/reset runner

T02 adds an adapter-driven safety boundary at `scripts/demo/lumi-demo-runner.mjs` before any real PostgreSQL bootstrap is introduced.

The runner now enforces:

- `NODE_ENV=production` is always rejected;
- database names must explicitly look disposable/local (`dev`, `local`, `test`, `demo` or `review`);
- destructive seed/reset requires exact confirmation token `lumi-demo-v1`;
- manifest validation runs before adapter mutation;
- an existing household with the wrong stable ID/key is rejected;
- manifest-version drift requires explicit reset rather than silent overwrite;
- seed replay returns `already_seeded` without a second adapter seed call;
- reset replay returns `already_absent` without a second adapter reset call;
- post-seed and post-reset state are re-inspected before success is returned.

`scripts/demo/lumi-demo-runner.selftest.mjs` proves safe DB acceptance, unsafe DB rejection, production rejection, confirmation rejection, seed idempotency, reset idempotency, scope collision rejection and version-change refusal using an in-memory adapter.

The persistent `ULTEF S51 Demo Manifest` workflow now runs both the manifest and runner safety self-tests and is PASS. Repository-facing `pnpm demo:seed`, `demo:reset` and `demo:status` will be bound to the real PostgreSQL adapter as the first part of T03; T02 deliberately does not invent partial fixture rows merely to make the commands appear functional.

## Merge rule

Do not mark COMPLETE merely because fixture rows exist. The final head must prove that the seeded world is visible and navigable through production app surfaces and that seed/reset are deterministic, scoped and safe.
