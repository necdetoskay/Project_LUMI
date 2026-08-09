# Sprint 36 — Quest Reward Production Wiring

Status: COMPLETE
Date: 2026-08-09

## Goal

Close the remaining production gap for `quest_reward_grant`: persisted story outcome → reward outbox → worker → `QuestRewardApplicator` → real inventory grant, without fabricating an authenticated end-user identity.

## Authority boundary

Background story effects execute as a narrow service authority, not as a synthetic user. The profiles package owns the privileged inventory entry point and validates the complete tenant/target scope while reusing the existing inventory acquisition domain, repository, provenance, and idempotency semantics.

Rules:

- authority is explicit and allowlisted (`story_reward_worker`);
- it can grant only `originType: story` rewards to `child_profile` owners;
- `childProfileId` must exist, be active, and belong to the supplied `householdId`;
- the existing inventory idempotency ledger remains authoritative via `quest-reward:<questId>`;
- no user id is invented or persisted as if an end user performed the grant;
- system-authored audit records use `actor_user_id = null` with explicit service provenance;
- cross-household targets and unknown authorities fail closed.

## Tasks

### S36-T01 — Profiles system-authority inventory boundary

Implemented `grantStoryRewardAsSystem` with explicit authority, tenant/child validation, story provenance, inventory-domain validation, transaction-scoped writes, audit records, and existing `acquire` idempotency ledger semantics.

### S36-T02 — InventoryGrantPort production adapter

Implemented `ProfileInventoryGrantAdapter` in worker composition. World/story remain independent of profiles; the worker owns the production composition boundary.

### S36-T03 — Worker dispatch

`WorkerOutboxDispatcher` now allowlists `quest_reward_grant`, composes `QuestRewardApplicator`, and preserves fail-closed behavior for invalid or unconfigured intents.

### S36-T04 — ULTEF L9 / DB-backed production scenario

Stable scenario: `PX-LUMI-S36-QUEST-REWARD-PROD-001`.

Verified:

1. persisted story reward outbox row is consumed by the real worker path;
2. inventory receives the authored reward for the intended child;
3. replay/restart produces no duplicate grant;
4. tenant isolation rejects a child from another household;
5. unauthorized/unknown service authority is rejected;
6. a rejected grant is not silently marked applied and remains under retry semantics;
7. standard CI, Security, Integration and PX regressions remain green.

## Completion evidence

Green implementation head before closeout docs: `49e302beb98fcd83d5d73f31944e12825e5d67ba`.

- `ULTEF S36 Quest Reward` — PASS, DB-backed L9 production scenario.
- `ULTEF Integration` — PASS, including DB integration profile, long-horizon, recovery, tenant isolation, continuity and memory coherence journeys.
- `ULTEF PX-LUMI` — PASS.
- `ULTEF PX-02 Character Continuity` — PASS.
- `ULTEF PX-04 Emotional Consistency` — PASS.
- `ULTEF PX-05 Story Consequence` — PASS.
- `ULTEF S35 Outbox Worker` regression — PASS.
- `Security Scan` — PASS.
- `CI` validate — PASS: frozen install, ULTEF self-tests, format, lint, typecheck, tests, load smoke/gate and build.
- `CI` Build Artifact — PASS: web image build completed successfully.

## Exit criteria

- [x] No fabricated user identity exists in the reward path.
- [x] `quest_reward_grant` has a real production dispatch path.
- [x] Existing inventory acquisition/idempotency semantics are reused.
- [x] Tenant isolation and authority rejection are DB-backed tested.
- [x] ULTEF scenario is green.
- [x] CI / Security / Integration / PX are green.
- [x] Sprint closeout evidence is recorded and status is COMPLETE.

## Follow-up order

After S36: generated story hook → `advanceSession` / Story Reader production wiring + real web LLM-settings port adapter; then template authoring/versioning and UI work.
