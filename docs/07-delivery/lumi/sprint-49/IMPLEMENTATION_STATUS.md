# Sprint 49 — Implementation Status

Status: IN PROGRESS

## Implemented

- explicit selected-candidate world effect contract on decision-ready NPC snapshots;
- effect validation rejects mappings for unknown candidates;
- initial bounded effect type: `move_character(targetLocationId)`;
- idempotent NPC action story-outbox enqueue using a household/effect advisory transaction lock;
- replay recovery reuses persisted S48 decision evidence and does not recompute selection;
- world-side NPC movement applicator reuses canonical household/world/location validation;
- outbox dispatcher recognizes `npc_action_move_character`;
- already-applied movement is treated as replay duplicate rather than a second write.

## Pending evidence

- dedicated S49 DB-backed L9 scenario;
- crash-between-decision-and-enqueue recovery proof;
- no-effect candidate proof;
- cross-world/cross-household rejection proof;
- outbox replay/no-duplicate movement proof;
- final CI, Integration, Security, S44-S48 and PX regression matrix.
