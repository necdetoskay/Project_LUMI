# LUMI Playable Visual Alpha Roadmap

Status: ACTIVE
Date: 2026-08-10

## Product question

The next delivery phase exists to answer one question with a real browser experience:

> **How does LUMI actually feel to use?**

The phase must prioritize a coherent, playable, persistent reference universe over adding unrelated backend breadth.

## Reference-universe rule

The canonical demo universe is not disposable UI mock data. It is a deterministic reference world that uses production schemas, services and persistence boundaries wherever possible. It serves three roles:

1. product demo;
2. development fixture;
3. ULTEF reference world for long-horizon behavior.

No demo-only shortcut may create behavior that production cannot reproduce.

## Milestones

### Sprint 51 — LUMI Demo Universe Seed

Create/reset one deterministic reference household/profile/character/world with enough canonical data to make the current UI feel inhabited.

Target journey:

`Login -> Parent Home -> Elif -> Lina -> Şimdi -> Işık Vadisi -> Hikâyeler -> Story Reader`

No image-generation dependency is required for Sprint 51.

### Sprint 52 — Playable Demo Journey

Make the reference universe genuinely playable through the existing production story and world-state boundaries:

`story start -> scene -> choice -> consequence -> world mutation -> inventory/quest -> exit -> reload -> continue`

A world-state change caused by a story must be visible after returning to `Şimdi`.

### Sprint 53 — Character Visual Canon

Introduce real provider-backed character image generation, durable asset persistence, provenance, candidate generation/selection and canonical visual versioning. No placeholder may be represented as generated art.

### Sprint 54 — World / Location Visual Canon

Generate and persist stable visual canon for important reference-world locations. Visual identity must remain consistent across subsequent story-scene generation.

### Sprint 55 — Illustrated Story Reader

Add asynchronous scene illustration generation after canonical scene commit. Text playback must remain usable while imagery is pending or unavailable.

### Sprint 56 — Playable Visual Alpha

Run the complete visual playable journey and evaluate the product as an experience rather than as independent backend capabilities. Close with UX, continuity, visual-consistency, persistence, replay, cost and failure-mode ULTEF evidence.

## Reference demo concept

Initial canonical reference world:

- child profile: **Elif**, age 7;
- player character: **Lina**;
- world: **Işık Vadisi**;
- initial area: **Fısıldayan Orman**;
- important locations: Fısıldayan Orman, Ateşböcekleri Korusu, Eski Taş Köprü, Ay Gölü, Lina'nın evi;
- NPC set: **Mira**, **Tiko**, **Yaşlı Meşe**;
- small authored inventory, quest, relationship, memory and world-fact set;
- one playable starting story/session.

Names/content remain implementation details until S51 seeds are committed, but IDs and semantic keys must be deterministic.

## Phase invariants

1. Seeded data uses canonical production persistence boundaries or documented fixture adapters around those same schemas.
2. Re-running the seed is idempotent.
3. Reset removes only the reference universe and cannot delete unrelated household data.
4. Tenant/profile/world isolation remains strict.
5. Story/world/NPC effects use the existing production pipelines; the demo must not mutate tables behind those boundaries to simulate runtime behavior.
6. Visual generation is not fabricated. Before Sprint 53, truthful non-generated visual states remain acceptable.
7. External provider cost is not required for normal CI. Provider-backed visual checks must have deterministic zero-cost/stub coverage plus explicitly scoped live-provider evaluation when required.
8. Every sprint has a dedicated ULTEF gate plus CI, Integration, Security and relevant PX/regression gates before COMPLETE.

## Product acceptance definition

The phase is successful when a user can open LUMI, meet a coherent child/character/world, play a story, make a meaningful choice, see the persistent result in the world, leave and return later, and eventually see visually consistent generated art for the same character/world without continuity breaking.

## Stop condition

Do not pre-plan Sprint 57. After Sprint 56, evaluate the visual alpha in the browser and let observed product/UX problems determine the next roadmap.
