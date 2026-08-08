# ULTEF Sprint 01 — Execution Evidence

## Verified PostgreSQL-backed scenarios

The following scenarios have been executed against disposable PostgreSQL in GitHub Actions and produced runtime narrative evidence.

- `L2-ISOLATION-001` — foreign household cannot load another household's child profile; owning state remains unchanged after reload.
- `L2-ISOLATION-003` — persisted NPC belief state does not cross household boundaries.
- `L3-SESSION-001` — stale `expectedVersion` is rejected with no session persistence leak.
- `L3-SESSION-002` — completed sessions cannot advance and no new visit/checkpoint/event is persisted.
- `L3-SESSION-003` — a second active session for the same child/world is rejected without creating a second session or dependent records.
- `L3-SESSION-004` — retrying the same session advance idempotency key produces exactly one persisted mutation.
- `L4-OUTCOME-REJECT-001` — an outcome targeting an entity absent from the pre-story snapshot is rejected before world commit; no commit/world-version/event/outbox side effect persists.
- `L4-OUTCOME-ROLLBACK-001` — if outcome validation fails inside `advanceSession`, the enclosing PostgreSQL transaction rolls back session advance plus all world side effects.

## Production defects found by ULTEF during Sprint 01

1. Core `advanceSession` could persist version `2` while returning a stale version `1` playback snapshot. The service now reads the fresh playback state from the active transaction.
2. Earlier Sprint 00 runs also exposed incorrect outbox audit session provenance and stale generated-scene playback state; those fixes remain covered by the regression suite.

## Current instrumented scenario

`L4-OUTCOME-REJECT-002` verifies that a change with an empty `evidenceRef` is rejected and leaves commit/world-version/event/outbox state unchanged after PostgreSQL reload.

## Next target

After `L4-OUTCOME-REJECT-002` is executed successfully, move to propagation retry/failure semantics and then broaden Golden Journey branch variation coverage.
