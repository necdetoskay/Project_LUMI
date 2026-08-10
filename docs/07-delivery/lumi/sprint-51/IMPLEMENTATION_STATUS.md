# Sprint 51 — Implementation Status

Status: IMPLEMENTATION
Date: 2026-08-10

## Current objective

Build and verify the canonical LUMI Demo Universe so product evaluation can move from isolated backend capability checks to a real browser experience.

## Workboard

- [x] T01 Reference manifest
- [ ] T02 Safe seed/reset runner
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

PR workflow `ULTEF S51 Demo Manifest` runs the manifest self-test on every pull request update. T01 does not write to PostgreSQL; DB mutation begins only in T02/T03 so the data-write and reset safety boundary remains explicit.

## Merge rule

Do not mark COMPLETE merely because fixture rows exist. The final head must prove that the seeded world is visible and navigable through production app surfaces and that seed/reset are deterministic, scoped and safe.
