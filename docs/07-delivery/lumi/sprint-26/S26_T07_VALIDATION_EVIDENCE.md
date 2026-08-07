# Sprint 26 — T07: Backlog Validation Evidence

**Source plan:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`
**Status:** All Sprint 26 tasks delivered; backlog validation complete
**Branch:** `main`

## Summary

Sprint 26 delivered NPC-to-NPC rumor propagation with confidence decay,
closing the `information_share` single-step limitation from S25. This
document maps each SOWS scenario to its coverage status and confirms
exit criteria are met.

## SOWS Scenario Matrix

| # | Scenario | Coverage | Evidence |
| --- | --- | --- | --- |
| SOWS-01 | Rumor domain model with confidence decay | Covered | `tests/domain/rumor.test.ts` — 9 tests |
| SOWS-02 | Deterministic propagation with seeded RNG | Covered | `tests/application/rumor-propagation.service.test.ts` — 19 tests |
| SOWS-03 | Household-scoped propagation (cross-family forbidden) | Covered | `tests/application/rumor-propagation.service.test.ts` — household filter tests |
| SOWS-04 | Confidence decay per hop (0.8 factor) | Covered | `tests/domain/rumor.test.ts` — `decayRumorForHop` tests |
| SOWS-05 | Confidence decay per elapsed time (0.1/day) | Covered | `tests/domain/rumor.test.ts` — time decay tests |
| SOWS-06 | Propagation floor (0.2) blocks low-confidence rumors | Covered | `tests/application/rumor-propagation.service.test.ts` — floor tests |
| SOWS-07 | Max recipients cap | Covered | `tests/application/rumor-propagation.service.test.ts` — cap tests |
| SOWS-08 | Source/target dedup via rumor ledger | Covered | `tests/application/rumor-ledger.service.test.ts` — 7 tests |
| SOWS-09 | Hearsay belief adoption with decayed confidence | Covered | `tests/application/hearsay-adoption.service.test.ts` — 12 tests |
| SOWS-10 | Outbox integration (`npc_rumor_spread` intent) | Covered | `tests/application/rumor-propagation-orchestrator.service.test.ts` — 4 tests |
| SOWS-11 | Idempotent outbox enqueue | Covered | `tests/application/rumor-propagation-orchestrator.service.test.ts` — idempotency tests |
| SOWS-12 | Rumor never mutates canonical world state | Covered | `tests/application/rumor-safety-filter.service.test.ts` — 10 tests |
| SOWS-13 | Safety boundary: hearsay source only | Covered | `tests/application/rumor-safety-filter.service.test.ts` — `validateAdoption` tests |
| SOWS-14 | Information access gate (NPC must hold rumor) | Covered | `tests/application/rumor-propagation.service.test.ts` — info-access tests |
| SOWS-15 | Same source/target pair never receives same rumor twice | Covered | `tests/application/rumor-ledger.service.test.ts` — dedup tests |
| SOWS-16 | Confidence strictly decreases across hops | Covered | `tests/domain/rumor.test.ts` — hop decay tests |
| SOWS-17 | Deterministic shuffle (same seed = same recipients) | Covered | `tests/application/rumor-propagation.service.test.ts` — seeded RNG tests |
| SOWS-18 | Rumor expiry and cooldown respected | Covered | `tests/application/rumor-ledger.service.test.ts` — expiry/cooldown tests |

## Coverage Summary

- **Covered:** 18/18 SOWS scenarios
- **Partial:** 0
- **Future-backlog:** 0

## Exit Criteria

| Criteria | Status |
| --- | --- |
| `pnpm --filter @lumi/npc-intelligence lint` | Green |
| `pnpm --filter @lumi/npc-intelligence typecheck` | Green |
| `pnpm --filter @lumi/npc-intelligence test` | 167/167 green |
| `pnpm --filter @lumi/story test` | 79/79 green |
| `pnpm build` | Green |
| `node scripts/check-mojibake.mjs` | Pass |

## Remaining Backlog (follow-up sprints)

- Accepted opportunity → story hook conversion (touches `@lumi/story`).
- Quest aggregate (from S22/23).
- NPC-to-NPC rumor propagation chains beyond single hop (future enhancement).