# Sprint 25 — T08: Regression + Validation Evidence

**Source plan:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
**Status:** All remaining interaction types delivered
**Branch:** `codex/sprint-25-interactions-remaining`

## Summary

Sprint 25 extended the S24 NPC Emergent Interaction foundation with the five
remaining interaction types: **gift**, **warning**, **quest_seed**,
**social_visit**, and **information_share**. This document maps each type to
its backlog requirement, implementation, and tests.

## Scope

In scope: all five deferred types (product-owner approved).
Out of scope: NPC-to-NPC rumor propagation chains + confidence decay;
accepted-opportunity → story hook conversion (both follow-ups).

## Per-Type Mapping

| Type | Backlog requirement | Implementation | Tests |
| --- | --- | --- | --- |
| `gift` | NPC gives only an owned, transferable item; same item never in two characters | Generator emits gift only for `ownedItems[id].transferable`; evidence carries itemId + transferable | `never generates a gift for an unowned or non-transferable item`, `generates a gift only for an owned transferable item` |
| `warning` | Safe, age-appropriate warning about a pending condition; no fear-mongering | Generator requires `childAgeBand === "all"`; gentle message wording | `generates a warning from a pending age-suitable condition`, `skips a warning when no age-suitable condition exists` |
| `quest_seed` | Non-mandatory story seed; no pressure | Generator produces a low-pressure suggestion from event/location fact | `generates a quest_seed from an event/location fact` |
| `social_visit` | Casual relationship-strengthening visit | Generator requires a trusted nearby character (trust ≥ 0.5) | `generates a social_visit to a trusted nearby character` |
| `information_share` | Sharing information the NPC actually knows | Generator gates on an active belief (info-access); single-step to child | `generates an information_share only from a belief-backed fact`, `never shares information the NPC does not believe` |

## Type + Risk Map

- `OPPORTUNITY_TYPES` now has 7 types: rumor, invitation, gift, warning,
  quest_seed, social_visit, information_share.
- Risk: `gift`/`warning`/`social_visit` = conditional (parent approval);
  `quest_seed`/`information_share` = safe.
- `assertOpportunityType` is list-driven (auto-accepts new types).

## Scoring / Safety

- Scoring remains **component-driven and type-independent** (identical
  components → identical score regardless of type).
- Safety filter gates conditional types on parent approval; any forbidden type
  is blocked before scoring.

## Regression Verification

```bash
pnpm --filter @lumi/npc-intelligence typecheck   # clean
pnpm --filter @lumi/npc-intelligence lint        # clean (--max-warnings=0)
pnpm --filter @lumi/npc-intelligence test        # 106/106
pnpm build                                       # success
node scripts/check-mojibake.mjs                  # pass
```

No regressions to the S24 rumor/invitation path: existing generator tests
still pass (all S24 types retained).

## Outcome

- All 7 interaction types now generate evidence-grounded opportunities.
- Same S24 guarantees preserved: determinism, info-access, safety-first,
  idempotent delivery, explainable traces.
- No P0/P1 defects.

## Remaining Backlog (follow-up sprints)

- NPC-to-NPC rumor propagation chains + confidence decay.
- Accepted opportunity → story hook conversion (touches `@lumi/story`).
- Quest aggregate (from S22/23).
