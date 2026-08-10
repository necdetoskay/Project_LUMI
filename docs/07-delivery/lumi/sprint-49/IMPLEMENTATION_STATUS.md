# Sprint 49 — Implementation Status

Status: COMPLETE

## Implemented

- explicit selected-candidate world effect contract on decision-ready NPC snapshots;
- effect validation rejects mappings for unknown candidates;
- initial bounded effect type: `move_character(targetLocationId)`;
- idempotent NPC action story-outbox enqueue using a household/effect advisory transaction lock;
- replay recovery reuses persisted S48 decision evidence and does not recompute selection;
- world-side NPC movement applicator reuses canonical household/world/location validation;
- outbox dispatcher recognizes `npc_action_move_character`;
- already-applied movement is treated as replay duplicate rather than a second write;
- absent optional effect maps are omitted rather than serialized as `undefined`, preserving the repository's `exactOptionalPropertyTypes` contract.

## Production invariants

- world mutations are never inferred from candidate kind, candidate description, or free-form memory text;
- only an explicit structured effect attached to the selected candidate may request a world mutation;
- cross-household effects fail closed through the canonical world ownership boundary;
- repeated enqueue of the same effect reuses one durable outbox row;
- at-least-once outbox replay creates no second canonical movement event;
- crash recovery can retry the effect enqueue from persisted decision evidence without re-running the NPC decision.

## ULTEF evidence

Dedicated scenario: `PX-LUMI-S49-NPC-ACTION-EFFECT-001`.

Final-head disposable PostgreSQL evidence proves:

1. duplicate enqueue reuses one durable outbox row;
2. production `OutboxJobRunner` moves the selected character to the explicit target location;
3. exactly one canonical movement event is written;
4. a foreign-household movement effect fails closed and remains retryable;
5. replay of the same applied outbox item produces no second movement event.

## Final validation matrix

Validated head: `022419c606d922a4fd840f0e8693a8437ee0e1b9`  
PR: #65  
Merge commit: `1e3450f631eb16cbba263886cc565f51e976ce46`

Passed on the validated head:

- CI validate — PASS
- Build Artifact — PASS
- ULTEF Integration — PASS
- Security Scan — PASS
- ULTEF S49 NPC Action Effect — PASS
- ULTEF S48 NPC Snapshot Worker — PASS
- ULTEF S47 Memory NPC Decision — PASS
- ULTEF S46 Memory Story Production — PASS
- ULTEF S45 Memory Lifecycle — PASS
- ULTEF S44 Memory Production — PASS
- ULTEF S43 Current Life Contract — PASS
- ULTEF S42 Character Creation Contract — PASS
- ULTEF S41 Parent Home Profile Contract — PASS
- ULTEF S40 Public Auth Visual Contract — PASS
- ULTEF S38 Template Versioning — PASS
- ULTEF S37 Hook Reader — PASS
- ULTEF S36 Quest Reward — PASS
- ULTEF S35 Outbox Worker — PASS
- PX-LUMI — PASS
- PX-02 Character Continuity — PASS
- PX-04 Emotional Consistency — PASS
- PX-05 Story Consequence — PASS

CI also passed format, lint, typecheck, unit tests, load gate, production build, and web image artifact build.

## Result

Sprint 49 closes the production path from persisted NPC decision evidence to a bounded, explicit, durable, replay-safe world mutation. NPC decisions can now produce a real canonical world effect without granting memory or candidate text authority to invent mutations.

## Next production boundary

The next sprint should expand the effect system from the single movement effect into a typed NPC action-effect registry while preserving the same explicit-intent, authorization, idempotency, replay, audit, and ULTEF boundaries.
