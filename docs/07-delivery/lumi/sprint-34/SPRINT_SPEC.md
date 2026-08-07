# Sprint 34 — Production Accept Flow (opportunity inbox + accept route + hook wiring)

**Sprint ID:** LUMI-S34
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 24–27 (opportunity domain/delivery, story hooks), Sprint 31 (quest seed automation), Sprint 33 (quest rewards)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `AGENTS.md` (S33 closeout backlog: *production accept route / opportunity inbox persistence / `respond`→`createHook` wiring (accept akışı)*)

## Goal

Close the **production trigger gap**: every interaction automation built in
S24–S33 (opportunity → hook → quest automation → reward) is exercised only in
tests today. This sprint delivers the **accept flow**: persist opportunities in
a real inbox, list them for a child, and accept one through a web route that
wires `respond → StoryHookService.createHook` (and thereby the quest_seed /
reward intents). The opportunity's `worldId`/`storySessionId` are resolved
from the child's world + active session at accept time.

The **worker outbox propagator loop** (deployment + all-household claim +
composed applicators) is a separate follow-up sprint; this sprint makes the
inbox + accept route production-ready and creates hooks immediately in the
route transaction.

## Principle

- **Accept is a committed, guarded transition**: the inbox persists
  `proposed → accepted|declined|deferred|expired`; domain guards
  (`assertRespondable`) are enforced by the production repo.
- **Accept → hook is wired end-to-end in the route**: accepting creates the
  StoryHook (which enqueues `story_hook_delivery` and, for `quest_seed`,
  `quest_seed_automation`) — so a child accepting a quest_seed opportunity
  also seeds a quest via the existing S31 automation intent.
- **Household + session gated**: routes use `withParent` + `getOwnedHousehold`
  + `getStorySessionOrForbidden`; opportunities are only visible/respondable to
  their own household and child.
- **Package boundary preserved**: `@lumi/npc-intelligence` stays free of
  `@lumi/story`; the web route composes the two services.

## Reused Foundation

- `@lumi/npc-intelligence` `OpportunityInboxPort` (S24) + domain
  `InteractionOpportunity` + `OpportunityDeliveryService` (S24).
- `@lumi/story` `StoryHookService.createHook` (S27) + `mapHookToScene` (S27).
- `@lumi/world` `getWorldForCharacter` (web already uses it) +
  `@lumi/story` `getActiveSessionForChildAndWorld` / `getStorySessionOrForbidden`.
- Web route pattern: `withParent`, `getOwnedHousehold`, `observeHandler`,
  `handleStoryError` (S30 quests route as template).

## In Scope

- **Migration `0002_opportunity_inbox.sql`** (`@lumi/npc-intelligence`):
  creates the `opportunity_inbox` table per the existing Drizzle schema
  (`npc_intelligence.opportunity_inbox`) — status CHECK, idempotency key,
  three indexes.
- **`DrizzleOpportunityInboxRepository`** implementing `OpportunityInboxPort`
  (deliver, findByIdempotencyKey, listProposedForChild, transitionStatus with
  household + domain guard, markExpired).
- **Port addition**: `findById(householdId, opportunityId)` so the accept route
  can load one opportunity; `OpportunityDeliveryService.respond` extended to
  load + apply the domain `accept/decline/defer` guard instead of a blind
  transition.
- **`listOpportunitiesForChild` service wrapper** (npc-intelligence
  application) exposing the port's `listProposedForChild`.
- **Web routes** (`apps/web`):
  - `GET /api/interactions/opportunities?householdId=&childProfileId=` —
    lists proposed opportunities for a child.
  - `POST /api/interactions/opportunities/[opportunityId]/respond` — body
    `{ householdId, childProfileId, response }`; on `accepted` it calls
    `OpportunityDeliveryService.respond` then `StoryHookService.createHook`
    (resolving worldId/sessionId), returning `{ hook, created }`.
  - Adds `@lumi/npc-intelligence` to `apps/web` deps.
- **Tests**: Drizzle repo guarded integration; service respond-guard tests;
  web route tests (list gated, accept wiring, household mismatch, missing
  session/world, declined/deferred no-hook).
- **Seed evidence**: `docs/07-delivery/lumi/sprint-34/S34_T06_VALIDATION_EVIDENCE.md`.

## Out of Scope

- Worker/web outbox **propagator loop** + applicator dispatch + deployment
  (worker Dockerfile/compose) — next sprint.
- Real `InventoryGrantPort` `acquireItem` adapter (web, S33 follow-up).
- Opportunity generation scheduling (S24 generator is already delivered;
  this sprint only persists/list/responds).
- `story_hook_delivery` consumidation in the reader (S16 reader is the
  display surface; hook scene-steering stays as-is).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S34-T01 | Migration `0002` + `DrizzleOpportunityInboxRepository` | `@lumi/npc-intelligence` db | guarded integration |
| S34-T02 | Port `findById` + service `listOpportunitiesForChild` + respond domain-guard | `@lumi/npc-intelligence` application | unit: service |
| S34-T03 | `GET /api/interactions/opportunities` + `POST .../respond` (respond→createHook wiring) | `apps/web` api | web route tests |
| S34-T04 | Quest-seed hook → `quest_seed_automation` enqueue verified end-to-end via accept route | `apps/web` + `@lumi/story` | web route test |
| S34-T05 | Web dependency + missing-world/session handling | `apps/web` | web route tests |
| S34-T06 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-34/` | scenario matrix green |

## Requirements

- `opportunity_inbox` persists opportunities with status, idempotency key,
  expiry; proposed rows are household+child scoped.
- `findById` is household-scoped; `respond` loads the opportunity and enforces
  the domain `assertRespondable` guard (reject non-proposed/expired).
- The list route returns only `proposed` opportunities for the child,
  household-gated.
- The respond route on `accepted`:
  - calls `respond(householdId, opportunityId, "accepted")`,
  - resolves `worldId` via the child's primary character → world,
  - resolves `storySessionId` via `getActiveSessionForChildAndWorld`,
  - calls `StoryHookService.createHook({ ..., opportunityStatus:
    "accepted", sceneType: mapHookToScene(hookType), payload: from
    opportunity.evidence })`,
  - returns `{ hook, created }`.
- Declined/deferred only transition the opportunity; no hook is created.
- Missing world or session returns a clear 4xx rather than a 500.
- A `quest_seed` accept also enqueues the `quest_seed_automation` intent
  (verified by the route test).

## Acceptance Criteria

- [ ] Migration `0002` applies and the inbox persists/reads/transitions rows.
- [ ] `findById` is household-scoped; respond enforces domain guards.
- [ ] List route returns only proposed, household-gated opportunities.
- [ ] Accept route creates the hook and returns it; declined/deferred create
  no hook.
- [ ] Missing world/session → 4xx, not 500.
- [ ] `quest_seed` accept enqueues `quest_seed_automation`.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- `worldId`/`storySessionId` absent from the opportunity: resolve from the
  child's world + active session at accept; handle "no active session" as a
  controlled 4xx.
- Route atomicity: `respond` and `createHook` are separate services; keep them
  sequential with a documented retry note (createHook is idempotent by
  opportunityId, so a retried accept after a partial failure is safe — verify
  this in a route test).
- Port/domain guard: don't let the production repo bypass `assertRespondable`;
  test expired/non-proposed rejects.
- Migration conventions: mirror `0001_npc_intelligence_schema.sql`
  (ledger + `DO $$ IF NOT EXISTS` + check helper).

## Validation

- `pnpm --filter @lumi/npc-intelligence lint | typecheck | test`
- `pnpm --filter @lumi/web lint | typecheck | test`
- Guarded integration behind `NPC_TEST_ENABLE_DESTRUCTIVE=true` /
  `STORY_TEST_ENABLE_DESTRUCTIVE=true`.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- `pnpm format:check` green.