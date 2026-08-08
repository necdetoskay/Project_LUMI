# ULTEF Sprint 01 — Future Story Continuity Context

## Status

SPECIFIED — production persistence continuity is proven, but story-generation prompt injection of prior world/NPC state is not yet implemented.

## Why this exists

Current ULTEF evidence proves that story outcomes survive persistence and can still be reloaded in a later session. The current story-generation contract, however, is built from hook content plus content boundary, age band, locale and nonce. It does not yet define a canonical input carrying prior durable world/NPC continuity state into the next generated scene.

This distinction matters: data being correct in PostgreSQL is not sufficient if the story-generation context never receives it.

## Canonical chain to prove

```text
choice
  -> validated outcome
  -> durable world commit
  -> persisted NPC/world continuity
  -> later session starts
  -> continuity context assembler reloads only that household/world state
  -> story-generation prompt receives continuity context
  -> generated scene can reference the correct prior consequence
```

## Planned ULTEF scenario

### L5-CONTEXT-DIVERGENCE-001

Two equivalent starting worlds diverge through different choices.

Branch A:
- Arin asks Mira about the bridge lights.
- Durable outcome: Mira relationship/trust path.

Branch B:
- Arin silently follows the bridge lights.
- Durable outcome: bridge-light knowledge path.

After both first sessions complete, start a later session for each branch and build the real story-generation context.

Required assertions:

1. Branch A context contains A-specific durable continuity.
2. Branch A context does not contain B-specific continuity.
3. Branch B context contains B-specific durable continuity.
4. Branch B context does not contain A-specific continuity.
5. Household/world isolation is preserved after DB reload.
6. Context construction is deterministic for the same persisted state.
7. Context is bounded and safe for prompt inclusion.

### L6-CONTEXT-TO-STORY-001

Using the production story-scene generation boundary with a deterministic test provider:

1. Persist a known consequence in story 1.
2. Complete story 1.
3. Start story 2 in the same child/world continuity.
4. Build the real continuity context.
5. Send that context through the real prompt builder/provider boundary.
6. Assert the generated narrative includes the required prior consequence semantically.
7. Assert a control branch without that consequence does not reference it.

The test evidence must be human-readable, for example:

```text
Story 1: Arin learned from Mira that the old bridge lights glow before a storm.
Persisted result: Bora stores the claim as hearsay.

Story 2 context reload:
- Bora knows bridge-lights-before-storm as hearsay.
- source/provenance includes Mira.

Generated story 2:
- Bora warns Arin that he heard the bridge-light rumor from Mira.

Result: PASS — prior story consequence influenced later generated prose.
```

## Production integration required before execution

Introduce a package-safe continuity input for story generation. The story package must not directly depend on profiles or NPC persistence implementations.

Recommended boundary:

```ts
export interface StoryContinuityContextPort {
  build(input: {
    householdId: string;
    childProfileId: string;
    characterId: string;
    worldId: string;
    storySessionId: string;
  }): Promise<StoryContinuityContext>;
}
```

`StoryContinuityContext` should contain bounded, prompt-safe summaries rather than raw database rows. Candidate sections:

- recent committed story consequences,
- relevant NPC beliefs/memories and provenance,
- relationship changes,
- active/recent world facts,
- relevant items/quest state,
- branch-specific continuity facts.

## Guardrails

- Household and world scope are mandatory on every read.
- Do not pass raw internal IDs or audit metadata to generated prose unless needed for tracing outside the prompt.
- Bound item counts and text lengths.
- Prefer relevance-ranked recent continuity over an unbounded history dump.
- Context assembly must be deterministic before the LLM call.
- LLM prose may vary; required continuity facts are verified semantically at L6/L8.

## Exit criteria

This item becomes EXECUTED_PASS only when:

- L5-CONTEXT-DIVERGENCE-001 passes on disposable PostgreSQL using real persistence adapters;
- L6-CONTEXT-TO-STORY-001 passes through the real story-generation prompt boundary with a deterministic test provider;
- narrative ULTEF evidence shows exactly what happened in story 1, what was reloaded, and how story 2 used it;
- CI, ULTEF integration and Security Scan are green.
