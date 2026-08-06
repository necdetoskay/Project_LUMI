# Sprint 25 — NPC Emergent Interaction: Remaining Interaction Types

**Sprint ID:** LUMI-S25
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 24 foundation (opportunity domain, generator, scoring,
ledger, safety, inbox, trace)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
(S24-T08 deferred list)

## Goal

Extend the S24 NPC Emergent Interaction foundation with the five remaining
interaction types: **gift**, **warning**, **quest_seed**, **social_visit**,
and **information_share**. Each type is added with the same guarantees as
S24: determinism, information access, safety-first, idempotent delivery,
and explainable traces.

## Scope Decision (product owner approved)

In scope: `gift`, `warning`, `quest_seed`, `social_visit`,
`information_share` — all five deferred from S24.
Out of scope: NPC-to-NPC rumor propagation chains + confidence decay
(separate follow-up); accepted-opportunity → story hook conversion (touches
`@lumi/story`).

## Reused Foundation (S24)

- `InteractionOpportunity` domain + statuses.
- `InteractionOpportunityGenerator` (deterministic candidate generation).
- `OpportunityScorer` + versioned policy.
- `OpportunityLedgerService` (cooldown/novelty/expiry).
- `OpportunitySafetyFilter` (safe/conditional/blocked).
- `OpportunityDeliveryService` + inbox (idempotent).
- `OpportunityTrace` (safelisted observability).

## Per-Type Requirements (from backlog)

### `gift`
- NPC can only give an item it owns and that is `transferable`.
- Transfer produces an inventory transaction + ownership history.
- The same item never appears in two characters at once.
- Gifts affect relationship but never *buy* trust/affection automatically.
- Story-critical items may require parent/safety approval before delivery.

### `warning`
- Safe, age-appropriate warning about a pending world condition.
- No fear-mongering or urgency that pressures the child.

### `quest_seed`
- Non-mandatory story seed (e.g. find the owner of a lost letter).
- No pressure; child can ignore.

### `social_visit`
- Casual relationship-strengthening visit (a friend comes to visit).

### `information_share`
- Sharing information between NPCs (a traveler's news spreading to the village).
- **Note:** full NPC-to-NPC propagation chains are deferred; this sprint
  supports a single-step information share to the child, with propagation
  structure reserved for the follow-up.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S25-T01 | Extend `OpportunityType` + risk map for 5 types | `@lumi/npc-intelligence` domain | unit: domain accepts new types |
| S25-T02 | Generation: `gift` (owned+transferable item) | generator | unit: unowned/untranferable never generated |
| S25-T03 | Generation: `warning` (pending world condition) | generator | unit: age-appropriate, no fear |
| S25-T04 | Generation: `quest_seed` (non-mandatory story seed) | generator | unit: no pressure |
| S25-T05 | Generation: `social_visit` (trusted nearby NPC) | generator | unit: relationship-gated |
| S25-T06 | Generation: `information_share` (single-step to child) | generator | unit: info-access gate |
| S25-T07 | Scoring/safety extensions (gift parent approval, etc.) | scorer/filter | unit: blocked/conditional |
| S25-T08 | Regression + evidence | `docs/07-delivery/lumi/sprint-25/` | scenario matrix green |

## Requirements

- No LLM writes world state or inventory; opportunities are evidence-grounded.
- Household + child isolation at every boundary.
- The same item is never in two characters at once (gift transfer constraint).
- Parent/safety filter blocks before scoring.
- No real child data in fixtures/tests.

## Acceptance Criteria

- [ ] All five interaction types generate opportunities grounded in evidence.
- [ ] A gift for an item the NPC does not own / is not transferable is never generated.
- [ ] A warning is never delivered if it would pressure or scare the child.
- [ ] Same input + seed produces the same opportunity set (determinism).
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- `gift` touches inventory semantics — must not allow duplicate ownership;
  the generator emits an intent; actual transfer is a downstream consumer's job.
- `information_share` overlaps future propagation chains — keep single-step now.
- New types expand the scoring policy; keep the policy versioned and additive.

## Validation

- `pnpm --filter @lumi/npc-intelligence lint | typecheck | test`
- Integration behind `NPC_TEST_ENABLE_DESTRUCTIVE=true` guard.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
