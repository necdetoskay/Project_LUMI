# PX-LUMI-05 Story Consequence — Production Handoff Blocker

Status: **BLOCKED**  
Date: 2026-08-09

## Gate requirement

PX-LUMI-05 requires one causal runtime chain:

1. a presented option is valid for the active scene;
2. the selected choice produces the rule-defined consequence;
3. the outcome is committed once;
4. later world/story context can observe that committed consequence.

## What exists today

- `commitChoice()` validates option availability, enforces single/idempotent commit semantics, persists `CommittedChoice`, persists a `scene_transition` `ChoiceConsequence`, and records `STORY_CHOICE_COMMITTED` transactionally.
- `L4-CHOICE-DIVERGENCE-001` proves different valid choices persist as distinct histories/consequences across equivalent story starts.
- `L4-CHOICE-WORLD-DIVERGENCE-001` proves different manually-authored `OutcomeManifest` inputs create distinct durable world hashes/commits/outbox records.
- World outcome commit, reload, idempotency and later continuity are strongly verified elsewhere by PX-LUMI-09/L6/L9.

## Missing production link

No production consumer/orchestrator was found that takes the persisted `ChoiceConsequence` / committed choice and derives the canonical outcome manifest/world mutation that the world-commit pipeline applies.

`L4-CHOICE-WORLD-DIVERGENCE-001` constructs its `OutcomeManifest` inside the test. It therefore proves the world-commit side of a hypothetical choice consequence, but it does not prove the production causal handoff from the actual persisted choice.

Marking PX-LUMI-05 PASS from those two independent tests would overclaim an integration boundary that does not currently exist.

## Required implementation before PASS

A minimal production-safe handoff should:

1. consume a persisted committed choice/consequence by stable identity;
2. derive a schema-valid outcome candidate/manifest through versioned rules;
3. preserve evidence linking the world mutation back to the choice, scene and consequence;
4. call the existing transactional/idempotent world-commit boundary;
5. expose the committed consequence to later story/world continuity context;
6. remain replay-safe so the same committed choice cannot mutate the world twice.

## Closure scenario target

Proposed stable ID:

`PX-LUMI-05-CHOICE-CONSEQUENCE-CONTINUITY-001`

The future scenario must start from a real available option and `commitChoice()` record; a test-authored outcome manifest is not sufficient to close this gate.
