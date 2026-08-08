# ULTEF-LUMI Sprint 00 — Validation Evidence

Status: VALIDATED
Date: 2026-08-08

## Milestone 1: first DB-backed 3/3 PASS

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

This was the first ULTEF integration profile in Project LUMI to produce a fully green DB-backed narrative-evidence run.

## Milestone 2: canonical L6 Golden Journey PASS

GitHub Actions workflow `ULTEF Integration` run #25 completed successfully after running both the DB-backed prerequisite profile and the canonical `L6-GOLDEN-001` headless journey.

The Golden Journey used the same household/child/world continuity and produced runtime narrative evidence proving this sequence:

```text
Deniz profile
→ Arin character
→ Gunes Vadisi story session
→ Arin meets Mira in the Old Library
→ Mira tells the bridge-lights rumor
→ Arin chooses to ask who saw it first
→ generated scene persists
→ session version 1 -> 2
→ story outcome commits
→ world version 1 -> 2
→ Bora learns the rumor as hearsay
→ first session completes
→ second session starts in the same child/world continuity
→ Bora's prior rumor survives PostgreSQL reload
```

All Golden Journey assertions passed, including commit idempotency, one-time rumor propagation, hearsay classification, Mira provenance, later-session child/world continuity and persisted rumor reload.

`L6-GOLDEN-001` is therefore promoted to `EXECUTED_PASS` in the scenario manifest.

## What was actually proven

### L4-SCENE-SESSION-001

A generated story scene containing Arin and Mira was persisted as a normal story scene, the canonical story session advanced to that scene, the session version incremented, a scene visit and checkpoint were written, and the same narrative remained reader-visible after PostgreSQL reload.

During earlier runs ULTEF caught a stale-response bug: the database had session version 2 while the service response still exposed version 1. The generated-scene bridge was changed to re-read fresh playback state after `advanceSession` completes. The corrected behavior was revalidated in run #25.

### PX-LUMI-09-001

A validated story outcome was committed durably through the world-commit pipeline. The run verified persistence of the commit record, world-version advancement, append-only world commit event, indirect-effect outbox intent, and idempotent retry without duplicate commit creation.

### PX-LUMI-09-002

A story `npc_rumor_spread` outbox intent was processed by the production composition root and materialized as a persisted hearsay belief for the target NPC. The run verified PostgreSQL reload, outbox `pending -> applied`, and duplicate-free retry behavior.

This scenario also drove two production corrections before becoming green:

1. the story outbox now carries the real source `storySessionId` instead of treating `commitId` as a session identifier for propagation audit events;
2. propagation error text is bounded before persistence so an oversized database error cannot cause a second failure while recording the original failure.

### L6-GOLDEN-001

The lower-level paths were composed into one headless continuity journey rather than being executed as unrelated examples. The test proved that a narrative event in one story session can produce durable world/NPC consequences that remain observable when a later session starts in the same child/world continuity.

The story-rendering portion remains deterministic at L6. Real model/provider rendering remains intentionally assigned to L8 so L6 stays stable, reproducible and inexpensive.

## Defects ULTEF exposed while reaching green

The sequence of failed runs exposed production and integration issues that mocked tests had not made obvious:

- missing production-shaped household/session fixtures;
- UUID and foreign-key contract mismatches;
- stale session response after successful persistence;
- incorrect `commitId`/`storySessionId` propagation audit correlation;
- unbounded error persistence in the propagator;
- placeholder rumor applicator that reported writes without materializing NPC state;
- generated-scene/session production wiring gap;
- test cleanup ordering across session dependent tables.

## Why this matters

The run did more than confirm that functions returned success. ULTEF compared runtime narrative events, assertions, persisted state and reload state. A scenario is not green merely because code executed; it is green only when its observable story/runtime behavior and durable state both match the expected outcome.

That principle is now demonstrated by a complete Project LUMI Golden Journey.

## Current Sprint 00 position

The foundation now contains:

- canonical ULTEF L0-L9 and PX-LUMI roadmap;
- scenario manifest and runner commands;
- narrative evidence recorder;
- JSON and Markdown artifact writer;
- DB-backed integration suite with no-runtime-evidence protection;
- PostgreSQL GitHub Actions workflow;
- project-specific gate catalogue;
- executable and validated `L6-GOLDEN-001`.

Sprint 00 can therefore move to closeout once the normal repository CI is green on the final documentation/type-safety commit.

## CI note

For the run #25 commit, `ULTEF Integration` and `Security Scan` were green. Normal `CI` passed formatting and lint but found three TypeScript-only test/evidence typing issues in the new ULTEF tests. Those issues do not invalidate the recorded runtime evidence; they are being corrected before Sprint 00 is closed so the branch satisfies both behavioral and repository-quality gates.
