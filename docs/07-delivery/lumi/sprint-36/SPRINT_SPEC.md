# Sprint 36 — Quest Reward Production Wiring

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Close the remaining production gap for `quest_reward_grant`: persisted story outcome → reward outbox → worker → `QuestRewardApplicator` → real inventory grant, without fabricating an authenticated end-user identity.

## Authority boundary

Background story effects execute as a narrow service authority, not as a synthetic user. The profiles package owns the privileged inventory entry point and must validate the complete tenant/target scope before delegating to the same inventory acquisition semantics used by `acquireItem`.

Rules:

- authority is explicit and allowlisted (`story_reward_worker`);
- it can grant only `originType: story` rewards to `child_profile` owners;
- `childProfileId` must exist, be active, and belong to the supplied `householdId`;
- the existing inventory idempotency ledger remains authoritative via `quest-reward:<questId>`;
- no user id is invented or persisted as if an end user performed the grant;
- cross-household targets and unknown authorities fail closed.

## Tasks

### S36-T01 — Profiles system-authority inventory boundary

Add a service-only inventory grant API that validates authority and tenant/child scope, then reuses the inventory acquisition implementation with story reward provenance.

### S36-T02 — InventoryGrantPort production adapter

Implement the world `InventoryGrantPort` in the worker composition layer using the profiles system-authority boundary. Keep world/story packages independent of profiles.

### S36-T03 — Worker dispatch

Allowlist `quest_reward_grant` in `WorkerOutboxDispatcher`, compose `QuestRewardApplicator`, and preserve fail-closed behavior for all other unconfigured intents.

### S36-T04 — ULTEF L9 / DB-backed production scenario

Stable scenario: `PX-LUMI-S36-QUEST-REWARD-PROD-001`.

Required evidence:

1. story reward outbox row is consumed by the real worker path;
2. inventory receives the authored reward for the intended child;
3. replay/restart produces no duplicate grant;
4. tenant isolation rejects a child from another household;
5. unauthorized/unknown service authority is rejected;
6. a rejected grant is not silently marked applied;
7. standard CI, Security, Integration and PX regressions remain green.

## Exit criteria

- [ ] No fabricated user identity exists in the reward path.
- [ ] `quest_reward_grant` has a real production dispatch path.
- [ ] Existing inventory acquisition/idempotency semantics are reused.
- [ ] Tenant isolation and authority rejection are DB-backed tested.
- [ ] ULTEF scenario is green.
- [ ] CI / Security / Integration / PX are green.
- [ ] Sprint closeout evidence is recorded and status becomes COMPLETE.

## Follow-up order

After S36: generated story hook → `advanceSession` / Story Reader production wiring + real web LLM-settings port adapter; then template authoring/versioning and UI work.
