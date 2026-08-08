# ULTEF-LUMI Sprint 00 — Validation Evidence

Status: IN PROGRESS
Date: 2026-08-08

## Milestone: first DB-backed 3/3 PASS

GitHub Actions workflow `ULTEF Integration` run #12 completed successfully against a disposable PostgreSQL 17 service.

Result:

```text
L4-SCENE-SESSION-001   PASS
PX-LUMI-09-001         PASS
PX-LUMI-09-002         PASS

PASS: 3
FAIL: 0
BLOCKED: 0
```

This is the first ULTEF integration profile in Project LUMI to produce a fully green DB-backed narrative-evidence run.

## What was actually proven

### L4-SCENE-SESSION-001

A generated story scene containing Arin and Mira was persisted as a normal story scene, the canonical story session advanced to that scene, the session version incremented, a scene visit and checkpoint were written, and the same narrative remained reader-visible after PostgreSQL reload.

During earlier runs ULTEF caught a stale-response bug: the database had session version 2 while the service response still exposed version 1. The generated-scene bridge was changed to re-read fresh playback state after `advanceSession` completes. Run #12 verified the corrected behavior.

### PX-LUMI-09-001

A validated story outcome was committed durably through the world-commit pipeline. The run verified persistence of the commit record, world-version advancement, append-only world commit event, indirect-effect outbox intent, and idempotent retry without duplicate commit creation.

### PX-LUMI-09-002

A story `npc_rumor_spread` outbox intent was processed by the production composition root and materialized as a persisted hearsay belief for the target NPC. The run verified PostgreSQL reload, outbox `pending -> applied`, and duplicate-free retry behavior.

This scenario also drove two production corrections before becoming green:

1. the story outbox now carries the real source `storySessionId` instead of treating `commitId` as a session identifier for propagation audit events;
2. propagation error text is bounded before persistence so an oversized database error cannot cause a second failure while recording the original failure.

## Why this matters

The run did more than confirm that functions returned success. ULTEF compared runtime narrative events, assertions, persisted state and reload state. The sequence of failed runs exposed real integration defects that ordinary mocked unit tests had not made visible.

The milestone therefore satisfies the intended ULTEF principle:

> A scenario is not green because code executed; it is green only when its observable story/runtime behavior and durable state both match the expected outcome.

## Current L6 impact

The three prerequisites that previously blocked `L6-GOLDEN-001` now have DB-backed PASS evidence:

- `L4-SCENE-SESSION-001`
- `PX-LUMI-09-001`
- `PX-LUMI-09-002`

Therefore `L6-GOLDEN-001` moves from `BLOCKED` to `READY_FOR_IMPLEMENTATION`.

The next implementation milestone is to compose the already-proven lower-level paths into one canonical headless journey with a single narrative timeline covering profile/character/world bootstrap, NPC rumor/opportunity, StoryHook, generated scene, session progression, world commit, materialized NPC belief, reload, and later-session continuity.

## CI note

The same commit's normal `CI` workflow failed only at `pnpm format:check`, before lint/typecheck/test/build could execute. The ULTEF behavior run itself and Security Scan were green. Formatting remediation is housekeeping and must be resolved before merge, but it does not invalidate the DB-backed execution evidence above.
