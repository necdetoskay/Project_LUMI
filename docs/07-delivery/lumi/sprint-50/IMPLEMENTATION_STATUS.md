# Sprint 50 — Implementation Status

Status: COMPLETE

## Implemented

- typed NPC action-effect contract with registered `move_character` and `set_relationship` effects;
- decision payload validation rejects unknown effect types, unknown candidate mappings, malformed movement targets, and relationship values outside `[-1, 1]`;
- existing Sprint 49 movement effect preserved behind the typed registry;
- bounded absolute `set_relationship(relationshipToCharacter)` effect added;
- exact household/world/child-profile/NPC scoped relationship persistence;
- relationship applicator treats an already-equal absolute value as an idempotent duplicate with zero writes;
- shared NPC action outbox enqueue path preserves the existing advisory transaction lock and decision/candidate idempotency key;
- decision-side `NpcActionEffectRegistry` routes explicit selected-candidate effects to typed outbox enqueuers;
- outbox-side `NpcActionOutboxRegistry` routes typed NPC intents to their applicators;
- unregistered outbox intents still fail closed;
- S50 dedicated disposable-PostgreSQL ULTEF gate added.

## Production invariants

- no world or NPC-state mutation is inferred from candidate kind, candidate description, or free-form memory text;
- only a registered structured effect attached to the selected candidate may mutate state;
- relationship mutation uses an absolute bounded value rather than a delta, so at-least-once replay cannot compound the change;
- exact household/world/profile/NPC scope is required for relationship mutation;
- foreign household scope fails closed and remains retryable;
- repeated enqueue for the same decision evidence and selected candidate reuses one durable outbox row;
- Sprint 49 `move_character` behavior remains unchanged and replay-safe.

## ULTEF evidence

Dedicated scenario: `PX-LUMI-S50-NPC-ACTION-EFFECT-REGISTRY-001`.

Final-head disposable PostgreSQL evidence proves:

1. duplicate relationship-effect enqueue reuses one durable outbox row;
2. production `OutboxJobRunner` routes `npc_action_set_relationship` through the typed registry;
3. the exact scoped canonical NPC snapshot relationship becomes the requested bounded absolute value;
4. replay leaves the relationship at the same value rather than applying a second delta;
5. a foreign-household relationship effect fails closed and remains retryable;
6. Sprint 49 movement-effect L9 remains green on the same final head.

## Final validation matrix

Validated head: `8731c4e7c7cc457e48861e527cad073e23403f96`  
PR: #66  
Merge commit: `1914b4431f297eaf0294bb92abc02a130592b7e1`

Passed on the validated head:

- CI validate — PASS
- Build Artifact — PASS
- ULTEF Integration — PASS
- Security Scan — PASS
- ULTEF S50 NPC Action Effect Registry — PASS
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

Sprint 50 generalizes the Sprint 49 single-effect production path into a typed NPC action-effect registry and proves a second real, replay-safe NPC state effect without granting arbitrary mutation authority to decision text or memory text.

## Next production boundary

The next sprint can extend the registry with additional carefully bounded effect types and richer audit/effect-history evidence while preserving the same explicit-intent, authorization, idempotency, replay, and ULTEF boundaries.
