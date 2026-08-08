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
- `L4-OUTCOME-REJECT-002` — an outcome change with an empty `evidenceRef` is rejected with no commit/world-version/event/outbox persistence leak.
- `L4-OUTCOME-ROLLBACK-001` — if outcome validation fails inside `advanceSession`, the enclosing PostgreSQL transaction rolls back session advance plus all world side effects.
- `L4-INDIRECT-RETRY-001` — transient indirect-effect failure remains retryable; the successful retry materializes exactly one hearsay belief and later passes do not duplicate it.
- `L4-INDIRECT-FAILURE-001` — retry budget exhaustion transitions the outbox record to terminal `failed`; later passes do not consume attempts or create NPC state.
- `L4-CHOICE-DIVERGENCE-001` — two different options from the same choice point remain isolated across independent sessions and produce distinct choice history/consequence/event records.
- `L4-CHOICE-WORLD-DIVERGENCE-001` — two choice-derived outcome manifests from equivalent starting state produce distinct durable world hashes/commit identities without cross-branch leakage.
- `L5-CONTEXT-DIVERGENCE-001` — the same NPC can hold different persisted beliefs in two worlds; each later story-generation prompt receives only the continuity for its own `household + world + npc` scope.
- `L6-CONTEXT-TO-STORY-001` — a prior story's persisted Bora/Mira rumor is loaded through the world-scoped continuity adapter and is visibly recalled in the prose of a later deterministic-provider-generated story.

## Production defects found by ULTEF during Sprint 01

1. Core `advanceSession` could persist version `2` while returning a stale version `1` playback snapshot. The service now reads the fresh playback state from the active transaction.
2. Terminal indirect-effect records (`failed`/`applied`) could be reprocessed and consume extra attempts. The propagator now skips terminal records without incrementing attempts or processed counts.
3. NPC belief persistence was scoped by `household + npc` but not `world`, allowing a potential same-household cross-world continuity leak. Beliefs now support `world_id`, rumor propagation carries `story_outbox.worldId` through the writer chain, and world-aware repository reads use `household + world + npc` scope.
4. Earlier Sprint 00 runs also exposed incorrect outbox audit session provenance and stale generated-scene playback state; those fixes remain covered by the regression suite.

## Continuity milestone

The continuity chain is now verified at two distinct levels:

1. `L5-CONTEXT-DIVERGENCE-001`: persisted memory is correctly isolated and reaches only the correct later story prompt.
2. `L6-CONTEXT-TO-STORY-001`: the later deterministic provider consumes that continuity and produces visible prose that recalls the prior event.

This proves the deterministic chain:

`prior story event -> world-scoped persisted NPC memory -> continuity adapter -> story-generation prompt -> generated later-story prose`

It does **not** yet prove the same behavior for a live external LLM provider; that belongs to the L7/L8 evaluation phase.

## Next target

Prepare the L7/L8 real-provider evaluation harness with explicit cost/safety gating. The first live-provider scenario should reuse the deterministic continuity fixture and score: continuity recall, child-age appropriateness, character/world consistency, choice influence, JSON/schema validity, latency, token/cost usage, and retry behavior. Live provider tests must be opt-in and must not become an uncontrolled per-commit CI cost.
