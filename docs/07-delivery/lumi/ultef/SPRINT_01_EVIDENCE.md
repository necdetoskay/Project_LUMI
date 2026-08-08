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
- `L7-LIVE-CONTINUITY-001` — the production OpenRouter client called `openai/gpt-4.1-mini` against the same world-scoped continuity fixture and the live generated story visibly recalled the bridge-lights-before-storm rumor while retaining Arin and Bora, passing the basic child-safety lexical gate, and remaining schema-valid.

## First live-provider evidence

`L7-LIVE-CONTINUITY-001` was executed successfully in GitHub Actions after increasing the live-test timeout from Vitest's default 5 seconds to 30 seconds. The first attempt proved the repository secret was available and reached the real provider but timed out at the harness boundary. The corrected run completed successfully.

- Provider path: production `callOpenRouter`
- Model: `openai/gpt-4.1-mini`
- Result: `PASS`
- Provider/test latency: approximately `7.2 s`
- Prompt tokens: `571`
- Completion tokens: `331`
- Total tokens: `902`
- Continuity: prior Bora/Mira bridge-light rumor visibly recalled
- Character consistency: Arin and Bora both present
- Basic child-safety lexical gate: PASS
- Output schema validity: PASS

Generated live-story evidence:

> Arin, uzun zamandır görmediği arkadaşı Bora'yla nehir kenarındaki eski tahta köprünün yanında buluştu. Güneş hafifçe batarken, Arin heyecanla Bora'ya eski köprüyle ilgili duyduğu bir söylentiyi anlattı. Mira'dan duyduğu üzere, köprüde fırtına öncesi ışıkların yandığı söyleniyordu. Bora da bu hikayeyi duymuş ve merak etmişti. İkisi birlikte köprünün etrafında dolaşırken, ışıkların neden yandığını ve bu eski köprünün gizemini keşfetmeye karar verdiler. Arin ve Bora, macera dolu bir günün başlangıcında, dostluklarının ve meraklarının onları nereye götüreceğini bilmiyorlardı ama birlikte keşfetmek için sabırsızlanıyorlardı.

The API key remained masked by GitHub Actions and was never written into ULTEF evidence.

## Production defects found by ULTEF during Sprint 01

1. Core `advanceSession` could persist version `2` while returning a stale version `1` playback snapshot. The service now reads the fresh playback state from the active transaction.
2. Terminal indirect-effect records (`failed`/`applied`) could be reprocessed and consume extra attempts. The propagator now skips terminal records without incrementing attempts or processed counts.
3. NPC belief persistence was scoped by `household + npc` but not `world`, allowing a potential same-household cross-world continuity leak. Beliefs now support `world_id`, rumor propagation carries `story_outbox.worldId` through the writer chain, and world-aware repository reads use `household + world + npc` scope.
4. The first live-provider evaluation exposed a harness-only timeout: Vitest's default 5-second timeout was too short for a real external model call. The live evaluation now has a 30-second test window while the separate opt-in workflow retains an overall 15-minute job ceiling.
5. Earlier Sprint 00 runs also exposed incorrect outbox audit session provenance and stale generated-scene playback state; those fixes remain covered by the regression suite.

## Continuity milestone

The continuity chain is now verified at three distinct levels:

1. `L5-CONTEXT-DIVERGENCE-001`: persisted memory is correctly isolated and reaches only the correct later story prompt.
2. `L6-CONTEXT-TO-STORY-001`: the later deterministic provider consumes that continuity and produces visible prose that recalls the prior event.
3. `L7-LIVE-CONTINUITY-001`: a real OpenRouter model receives the same world-scoped continuity and produces child-safe, schema-valid later-story prose that visibly recalls the prior event.

This now proves the live chain:

`prior story event -> world-scoped persisted NPC memory -> continuity adapter -> story-generation prompt -> production OpenRouter client -> live generated later-story prose`

## Cost-control policy

Live provider evaluation remains opt-in. Normal PR/push ULTEF does not call the paid provider. The dedicated `ULTEF Live Provider Evaluation` workflow requires manual dispatch, a model id, the exact `RUN_LIVE_PROVIDER` cost acknowledgement, and the `OPENROUTER_API_KEY` repository secret.

## Next target

Expand from one live continuity probe into the L8 model scorecard. Run controlled live scenarios for age appropriateness, character/world consistency, choice influence, hallucination control, schema reliability, latency and token usage. Compare candidate models using identical fixtures rather than selecting a model from one successful sample.
