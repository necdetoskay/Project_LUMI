# Sprint 24 — T08: Backlog Validation Evidence

**Source plan:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
**Status:** Foundation + rumor/invitation delivered
**Branch:** `codex/sprint-24-interactions`

## Summary

Sprint 24 built the NPC Emergent Interaction foundation and delivered two
interaction types end-to-end: **rumor** and **invitation**. This document maps
the backlog's activation/validation requirements to concrete implementation +
tests.

## Scope Decision (product owner approved)

Delivered: foundation + `rumor` + `invitation`.
Deferred to follow-up sprints: `gift`, `warning`, `quest_seed`,
`social_visit`, `information_share` (and NPC-to-NPC propagation chains).

## Backlog Activation Criteria (mapped)

| Criterion | Status |
| --- | --- |
| World State / Character / Relationship / Inventory contracts firm | S13 decision foundation + `@lumi/world`/`@lumi/profiles` in place | ✅ |
| NPC information-access model implemented | `PerceptionWindow` + active `Belief` gate (info-access) | ✅ |
| World Simulation + Background Life safe | S14/S23 outbox propagation | ✅ |
| Child safety + parent policy controls available | `OpportunitySafetyFilter` (safe/conditional/blocked) | ✅ |
| Opportunity persistence + idempotency approach | `opportunity_inbox` schema + idempotent delivery | ✅ |
| Product owner approved scope/sprint | Approved: foundation + rumor/invitation | ✅ |

## Backlog Required Validation (mapped)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| Relationship/proximity-based targeting | Generator picks trusted nearby NPC for invitations | `interaction-opportunity-generator.test.ts` |
| NPC cannot give unowned item | `gift` deferred (not in scope) | — |
| NPC cannot share unknown rumor | Rumor requires an active belief; info-access gate | `never surfaces a rumor without an active belief` |
| Rumor confidence/decay | Belief confidence carried in evidence; decay over hops deferred | partial |
| Source/target/pair cooldown | `OpportunityLedgerService` gates by cooldown keys | `opportunity-ledger.test.ts` |
| Novelty + duplicate prevention | `recordFired` novelty count + threshold | `novelty count reaches threshold` |
| Expiry | Opportunity expires silently; stale-expiry in inbox | `opportunity-delivery.test.ts`, domain `expire` |
| Accept/decline/defer | Child response transitions, no-punish decline | `opportunity-delivery.test.ts`, domain tests |
| Child safety + parent policy filters | `OpportunitySafetyFilter` blocks before scoring | `opportunity-safety-filter.test.ts` |
| NPC-to-NPC transfer chain | Deferred (follow-up) | — |
| Accepted opportunity → story hook (once) | Deferred (touches `@lumi/story`) | — |

## Deliverables (T01–T07)

- **T01** `InteractionOpportunity` domain + statuses (proposed/accepted/declined/
  deferred/expired) — 12 tests.
- **T02** `InteractionOpportunityGenerator` (deterministic rumor + invitation) —
  7 tests.
- **T03** `OpportunityScorer` + 11-dimension versioned policy — 6 tests.
- **T04** `OpportunityLedgerService` + port (cooldown/novelty/expiry) — 6 tests.
- **T05** `OpportunitySafetyFilter` (safe/conditional/blocked) — 6 tests.
- **T06** `OpportunityInboxPort` + schema + `OpportunityDeliveryService`
  (idempotent) — 6 tests.
- **T07** `OpportunityTrace` (safelisted steps, deterministic hash) — 5 tests.

## Verification Commands

```bash
pnpm --filter @lumi/npc-intelligence typecheck   # clean
pnpm --filter @lumi/npc-intelligence lint        # clean (--max-warnings=0)
pnpm --filter @lumi/npc-intelligence test        # 91/91
pnpm build                                       # success
node scripts/check-mojibake.mjs                  # pass
```

## Outcome

- Foundation + rumor/invitation delivered with 91 unit tests green.
- No P0/P1 defects.
- Determinism, info-access, safety-first, idempotent delivery, explainable
  traces all inherited from the S13 contract.

## Remaining Backlog (follow-up sprints)

- `gift`, `warning`, `quest_seed`, `social_visit`, `information_share` types.
- NPC-to-NPC rumor propagation chains + confidence decay.
- Accepted opportunity → story hook conversion (touches `@lumi/story`).
