# Sprint 34 — T06: Backlog Validation Evidence

**Source plan:** `AGENTS.md` S33 closeout backlog (*production accept route / opportunity inbox persistence / `respond`→`createHook` wiring (accept akışı)*)
**Status:** Production Accept Flow delivered
**Branch:** `codex/sprint-34-production-accept-flow` → PR (target `main`)

## Summary

Sprint 34 closed the **production trigger gap**: every interaction automation
built in S24–S33 (opportunity → hook → quest automation → reward) was only
exercised in tests. Now opportunities persist in a real inbox, are listed for a
child, and are accepted through a web route that wires
`respond → StoryHookService.createHook` (thereby triggering the
`quest_seed_automation` / `quest_reward_grant` intents for the right hook
types). The worker outbox propagator loop remains the documented next sprint.

## Deliverables (T01–T05)

- **T01** Migration `0002_opportunity_inbox.sql` (per `0001` conventions) +
  `DrizzleOpportunityInboxRepository` implementing `OpportunityInboxPort`
  (deliver idempotent by key, findByIdempotencyKey, findById household-scoped,
  listProposedForChild, transitionStatus, markExpired). Guarded integration
  `opportunity-inbox.integration.test.ts`.
- **T02** Port gained `findById(householdId, opportunityId)`;
  `OpportunityDeliveryService.respond` now loads the opportunity and applies
  the domain `accept/decline/defer` guard (non-proposed/expired rejected);
  new `listProposedForChild` service wrapper. 4 new unit tests.
- **T03** Web routes: `GET /api/interactions/opportunities` (household-gated
  proposed list) + `POST /api/interactions/opportunities/[opportunityId]/respond`
  (`declined`/`deferred` transition only; `accepted` resolves world + active
  session, builds hook payload from evidence, calls `StoryHookService.createHook`).
  Added `@lumi/npc-intelligence` to `apps/web` deps.
- **T04** `quest_seed` accept path verified: `createHook` enqueues
  `quest_seed_automation` (S31) for quest_seed hooks — exercised via the route
  wiring (the web accept test asserts hook creation inputs).
- **T05** Missing world / missing active session return 404 (not 500); web
  deps added; guarded missing-session route test.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Opportunity inbox persistence | migration `0002` + Drizzle repo | guarded integration |
| Accept flow (respond → createHook) | respond route wires both services | `opportunity-respond-api.test.ts` |
| Household + child + session gating | `withParent` + `getOwnedHousehold` + `findChildProfileForUser` + session/world resolve | route tests (403/404/400) |
| Declined/deferred create no hook | non-accepted branch transitions only | route test |
| Missing world/session → 4xx | controlled 404s before createHook | route test |

## Coverage Summary

- `@lumi/npc-intelligence` unit: **171 tests green** (167 prior + 4 new guard).
- `@lumi/web` unit: **152 tests green** (144 prior + 8 new route tests).
- `format:check | lint | typecheck | test | build | check-mojibake` green.
- Guarded integration behind `NPC_TEST_ENABLE_DESTRUCTIVE=true`:
  `opportunity-inbox.integration.test.ts`.
- **Partial:** 0 · **Future-backlog:** worker/web outbox propagator loop +
  applicator dispatch + deployment; real `acquireItem` web adapter; generated
  scene wiring; template authoring UI.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| Migration `0002` applies; inbox persists/reads/transitions | ✅ T01 |
| `findById` household-scoped; respond enforces domain guards | ✅ T02 |
| List route returns only proposed, household-gated opportunities | ✅ T03 |
| Accept creates the hook; declined/deferred create no hook | ✅ T03 |
| Missing world/session → 4xx | ✅ T05 |
| `quest_seed` accept enqueues `quest_seed_automation` | ✅ T04 (wiring) |
| All source green | `format:check \| lint \| typecheck \| test \| build` |