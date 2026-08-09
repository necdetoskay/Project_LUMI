# PX-LUMI-04 Emotional Consistency — Production Wiring Blocker

Status: **BLOCKED**  
Date: 2026-08-09

## Gate requirement

`PX-LUMI-04` requires runtime evidence that:

1. an event causes the intended directional emotion delta;
2. emotion values remain bounded;
3. unrelated emotion dimensions do not drift unexpectedly;
4. the updated emotion state reaches downstream decision/utility evaluation;
5. the narrative evidence can explain event → emotion delta → downstream consequence.

## What exists today

### Bounded emotion domain and persistence

`@lumi/profiles` validates every provided emotion dimension against the canonical emotion dimension catalog and range `0..1`. `LumiCharacter.updateEmotions()` validates and versions the new vector. `updateEmotions()` persists it transactionally and emits `CHARACTER_EMOTION_UPDATED`.

This proves that explicit emotion state can be validated and stored. It does **not** prove that a world/story event derives the correct emotion delta.

### Downstream utility consumption

`@lumi/npc-intelligence` `DecisionContextBuilder` accepts an emotion vector and includes it in the deterministic decision context. `UtilityEvaluator` calculates `emotionalComfort` from `joy`, `trust`, `fear`, `anger`, and `sadness`.

This proves that supplied emotions can influence utility evaluation. It does **not** prove that the persisted profile emotion state is the value supplied in production.

### Context adapter boundary

`@lumi/context` currently exports `InMemoryEmotionalStateAdapter`. There is no production adapter in the adapter index that loads persisted profile emotion state for context construction.

The Sprint 11 implementation report explicitly described these context adapters as in-memory test doubles and deferred production adapters.

## Missing production links

### Blocker A — event → directional emotion delta

No production service was found that accepts a story/world/NPC event and deterministically derives a bounded, evidence-bearing emotion delta while preserving unrelated dimensions.

The existing `updateEmotions()` API accepts a complete caller-supplied vector. Using that API directly in a PX test would only prove storage of a chosen answer, not emotional consistency.

### Blocker B — persisted emotion → decision context

No production adapter/wiring was found that loads the persisted character emotion vector from `@lumi/profiles` and feeds that exact state into the downstream decision/context path.

Passing a hand-built emotion object directly into `DecisionContextBuilder` would be a component test, not a production integration proof.

## Why the gate is BLOCKED instead of FAIL

The existing bounded-domain, persistence, and utility components are individually present. The missing requirement is the production orchestration boundary between them. ULTEF therefore records the gate as **BLOCKED** until the wiring exists rather than pretending a test double proves the real system.

## Required implementation before PASS

A minimal production-safe path should provide:

1. a versioned event-to-emotion rule/evaluator that returns explicit per-dimension deltas plus evidence;
2. bounded/clamped application semantics that preserve dimensions not touched by the event;
3. persisted update through the existing profile character-domain transaction;
4. a production emotional-state adapter/read contract for the decision/context layer;
5. an integration scenario that proves the persisted post-event vector is the exact vector consumed by decision/utility evaluation;
6. runtime narrative evidence containing event, before vector, delta, after vector, unchanged dimensions, decision context hash and utility consequence.

## Closure scenario target

Proposed stable ID:

`PX-LUMI-04-EMOTION-DECISION-001`

The scenario should remain blocked until both missing production links are implemented. A mock/in-memory handoff must not close the gate.
