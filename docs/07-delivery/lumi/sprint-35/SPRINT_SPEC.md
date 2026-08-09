# Sprint 35 — Production Outbox Worker & Applicator Dispatch

Status: ACTIVE
Date: 2026-08-09

## Goal

Close the post-S34 production gap between persisted `story_outbox` intents and the already implemented idempotent applicators. The background worker must consume eligible outbox work continuously, dispatch each intent to the correct production applicator, isolate failures, and ship as a deployable worker process.

## Why now

S31–S34 can persist automation intents (`quest_seed_automation`, `quest_reward_grant`, rumor/story-hook related intents), but the deployed worker currently runs only background simulation. The applicators exist, yet there is no production worker composition loop connecting the outbox to them.

## Scope

### S35-T01 — Worker intent dispatcher

- Add a worker-side dispatcher implementing the story `IndirectEffectApplicator` contract.
- Dispatch by explicit allowlisted intent type.
- Wire `quest_seed_automation` to `QuestSeedAutomationApplicator`.
- Unknown/unconfigured intent types must fail closed; they must never be silently marked applied.
- Keep package direction clean: domain packages remain unaware of the worker.

### S35-T02 — Outbox worker loop

- Add an outbox runner invoked from `BackgroundWorker.tick()` alongside simulation.
- Prevent overlapping ticks with the existing worker lock.
- Process bounded batches.
- Preserve `IndirectEffectPropagator` retry/idempotency semantics.
- Emit structured worker logs with processed/applied/failed/skipped counts.

### S35-T03 — Household discovery

- Provide a production-safe way to discover households with retryable outbox work.
- Do not require a manually maintained household list for normal operation.
- Discovery must be bounded and deterministic.

### S35-T04 — Production adapters

- Compose already-safe applicators whose required dependencies are available without fabricating authority.
- `quest_seed_automation` is required in this sprint.
- Do **not** fake an authenticated user for `quest_reward_grant`; the real `InventoryGrantPort -> acquireItem` system-authority adapter remains a separately tracked backlog slice unless a safe system boundary is implemented here.
- Unconfigured intents must remain retryable/failed according to the canonical outbox policy.

### S35-T05 — Worker deployment

- Add/complete worker Docker build target and compose service.
- Worker connects only through internal Postgres/Redis network paths.
- Add health/liveness behavior appropriate for a non-HTTP worker (container process health or equivalent).
- Document required environment variables and graceful shutdown.

### S35-T06 — Verification / ULTEF evidence

Required evidence:

1. persisted `quest_seed_automation` outbox row -> worker dispatch -> quest created;
2. replay/restart does not create a duplicate quest;
3. unknown/unconfigured intent is not silently applied;
4. one failing row does not prevent another valid row from applying;
5. worker overlapping ticks remain suppressed;
6. CI format/lint/typecheck/test/build and Security Scan remain green.

Proposed stable scenario ID:

`PX-LUMI-S35-OUTBOX-WORKER-001`

## Exit criteria

- Production worker consumes story outbox without manual per-row invocation.
- At least `quest_seed_automation` has a real end-to-end production dispatch path.
- Dispatch is allowlisted and fail-closed.
- Retry/idempotency semantics remain those of `IndirectEffectPropagator` and downstream applicators.
- Worker is deployable from repository infrastructure.
- DB-backed evidence and standard regression gates pass.

## Explicit follow-up backlog

- Real system-authority `InventoryGrantPort` adapter for `quest_reward_grant` using inventory `acquireItem` semantics without inventing an end-user identity.
- Generated hook scene -> `advanceSession` / Story Reader production wiring + real web LLM-settings port adapter.
- Template authoring UI/versioning.
