# Sprint 50 — Typed NPC Action Effect Registry

Status: COMPLETE

## Goal

Generalize the Sprint 49 single movement effect path into a typed, explicit NPC action-effect registry without allowing candidate text, memory text, or untyped payloads to invent mutations.

## Production scope

- preserve `move_character(targetLocationId)` as the first registry effect;
- add bounded `set_relationship(relationshipToCharacter)` with an absolute `-1..1` value;
- route selected NPC effects through a typed enqueue registry;
- route NPC outbox intents through a typed applicator registry;
- preserve the existing story outbox idempotency key and advisory transaction lock;
- make relationship replay idempotent by setting an absolute value, not applying a delta;
- reject malformed/out-of-range effect payloads;
- reject cross-household/world/profile/NPC relationship mutations through exact snapshot scope;
- retain S49 movement behavior and regressions unchanged.

## Acceptance criteria

1. Decision payload validation accepts only registered typed effects.
2. Unknown candidate effect mappings remain invalid.
3. `set_relationship` is bounded to `[-1, 1]`.
4. Same relationship effect enqueue produces one durable outbox row.
5. Production worker dispatcher applies the relationship effect through the registry.
6. Outbox replay leaves the absolute relationship unchanged.
7. Foreign household scope fails closed and remains retryable.
8. Existing S49 movement L9 remains green.
9. Dedicated `PX-LUMI-S50-NPC-ACTION-EFFECT-REGISTRY-001` passes on disposable PostgreSQL.
10. CI, Integration, Security and relevant ULTEF/PX regressions are green before merge.
