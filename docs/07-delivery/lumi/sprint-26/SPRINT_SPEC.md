# Sprint 26 — NPC-to-NPC Rumor Propagation + Confidence Decay

**Sprint ID:** LUMI-S26
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 23 outbox, Sprint 24/25 interaction foundation
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
(S24/S25 deferred list)

## Goal

Implement **NPC-to-NPC rumor propagation** with **confidence decay** across
hops. A rumor an NPC hears can spread to other NPCs in the same world
(household-scoped), each hop reducing confidence and extending provenance.
This closes the `information_share` single-step limitation from S25.

## Principle (from backlog)

- A rumor is **immutable fact replacement**: it never overwrites canonical
  world state.
- Each rumor carries: source NPC, the underlying event/first source, a
  confidence/reliability value, the transfer chain (provenance), creation and
  expiry times, and any meaning drift from transmission.
- **Reliability decays over time and with each hop.**
- **Critical information can never change world state based on rumor alone.**

## Reused Foundation

- `@lumi/npc-intelligence` `Belief` model: already has `source: "hearsay"`,
  `provenance` (chain), `confidence`, `expiresAt` — the propagation target.
- `@lumi/story` S23 outbox (`story_outbox`): `npc_rumor_spread` intent type +
  idempotent `IndirectEffectPropagator`.
- Perception window / belief access rules (S13): an NPC can only propagate a
  rumor it actually holds as an active belief.

## In Scope

- **Rumor domain model**: `Rumor` (factId, claim, originNpcId, sourceEventId,
  confidence, provenance chain, createdAt, expiresAt, hops).
- **Confidence decay**: deterministic decay per hop + per time elapsed;
  `source: "hearsay"` beliefs inherit decayed confidence.
- **Propagation engine**: given an NPC's active belief, pick recipient NPCs
  (nearby, same household, relationship-appropriate), write a hearsay belief
  with decayed confidence + extended provenance.
- **Rumor ledger** (dedup/idempotency): same rumor never re-propagates to the
  same NPC (source/target pair guard, mirroring S24 ledger).
- **Safety boundary**: critical/world-state facts never change canonical state
  via rumor; only belief-level hearsay is written.
- **Integration with S23 outbox**: propagation intents flow through the outbox
  (`npc_rumor_spread`) and are applied by the existing propagator, idempotently.

## Out of Scope

- Accepted opportunity → story hook conversion (separate follow-up).
- Quest aggregate.
- Cross-family rumor propagation (forbidden by isolation).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S26-T01 | `Rumor` domain + confidence decay function | `@lumi/npc-intelligence` | unit: decay determinism |
| S26-T02 | Rumor propagation engine (pick recipients, write hearsay) | `@lumi/npc-intelligence` | unit: info-access, household scope |
| S26-T03 | Rumor ledger (source/target dedup) | `@lumi/npc-intelligence` | unit + guarded integration |
| S26-T04 | Hearsay belief adoption (decayed confidence + provenance) | `@lumi/npc-intelligence` | unit: chain grows, confidence decays |
| S26-T05 | Outbox integration (`npc_rumor_spread` → propagation) | `@lumi/story` | guarded integration |
| S26-T06 | Safety: no canonical-state change via rumor | `@lumi/npc-intelligence` | unit: rumor never mutates world |
| S26-T07 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-26/` | scenario matrix green |

## Requirements

- Rumor propagation is household-scoped (cross-family forbidden).
- Confidence decays deterministically per hop and per elapsed time.
- A rumor never changes canonical world state; only belief-level hearsay.
- Dedup: same rumor never re-propagates to the same NPC.
- No real child data in fixtures/tests.

## Acceptance Criteria

- [ ] A rumor held by one NPC can propagate to another, with decayed confidence
      and extended provenance.
- [ ] Same source/target pair never receives the same rumor twice.
- [ ] Confidence strictly decreases across hops.
- [ ] No canonical world-state write originates from a rumor.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- `@lumi/npc-intelligence` has no belief persistence writer yet (only
  `belief-source.port` reader) — needs a belief-adoption port/repository.
- Outbox integration touches `@lumi/story` (S23) — keep the propagator's
  idempotency contract; do not duplicate it.
- Propagation must stay bounded (no flooding): recipient cap + cooldown.

## Validation

- `pnpm --filter @lumi/npc-intelligence lint | typecheck | test`
- Integration behind `NPC_TEST_ENABLE_DESTRUCTIVE` / `STORY_TEST_ENABLE_DESTRUCTIVE`.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
