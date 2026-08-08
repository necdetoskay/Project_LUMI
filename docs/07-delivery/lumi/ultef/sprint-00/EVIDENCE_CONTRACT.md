# ULTEF-LUMI — Execution Evidence Contract

Status: CANONICAL DRAFT
Date: 2026-08-08

## Purpose

ULTEF evidence must answer more than `PASS` or `FAIL`. For every meaningful scenario, a human reviewer must be able to understand:

1. What was the test trying to prove?
2. What initial world/profile/character state was created?
3. What actions/events occurred during the test?
4. Which engines/components reacted?
5. What state changed?
6. What was expected?
7. What actually happened?
8. Why did the gate pass, warn, fail or become blocked?

This human-readable record is called the **Execution Narrative**.

## Required outputs

Each ULTEF run should produce both machine-readable and human-readable evidence:

```text
artifacts/ultef/<run-id>/
  summary.json
  summary.md
  failures.json
  scenarios/
    <scenario-id>.json
    <scenario-id>.md
```

The `.json` form is for automation; the `.md` form is for a developer/product reviewer.

## Scenario evidence structure

Every non-trivial scenario evidence record should contain the following sections.

### 1. Test identity

- Scenario ID
- ULTEF level / PX gate
- Scenario title
- Purpose
- Commit/ref
- Timestamp
- Seed
- Provider/model where applicable
- Final result: `PASS | WARN | FAIL | BLOCKED`

### 2. Given — initial state

Describe the data that the test actually created or loaded. Prefer meaningful names in addition to IDs.

Example:

```text
Household: Yildiz Ailesi
Child profile: Deniz, age 7
Universe: Gunes Vadisi
Primary character: Arin
Character traits: curiosity=0.82, courage=0.61
NPCs: Mira the librarian, Taro the fox
Starting inventory: Empty
Known rumor count: 0
Active quests: 0
```

The evidence must be generated from the actual runtime objects. Do not fabricate friendly prose that is disconnected from execution data.

### 3. When — execution timeline

Record important domain events in order. This is not a raw debug log. It is a concise semantic transcript.

Example:

```text
01. Story session created: session-001
02. Opening scene generated: "The Whispering Library"
03. Arin entered the old library.
04. NPC Mira was selected as an eligible encounter.
05. Mira shared rumor R-17: "The bridge lights appear before a storm."
06. Memory Engine persisted the rumor as hearsay with confidence 0.64.
07. Player chose: "Ask Mira who first saw the lights."
08. Relationship Arin→Mira changed trust 0.40 → 0.46.
09. Story Outcome manifest emitted memory + relationship changes.
10. World commit completed.
11. Session/world reloaded from persistence.
```

### 4. Then — expected vs actual

Assertions should be expressed in domain language wherever possible.

Example:

| Assertion | Expected | Actual | Result |
|---|---|---|---|
| Story created | non-empty valid scene | `The Whispering Library` | PASS |
| NPC encounter | Mira appears | Mira appeared | PASS |
| Rumor learned | R-17 stored as hearsay | R-17 confidence=0.64 | PASS |
| Trust increased | > 0.40 | 0.46 | PASS |
| Persistence | state survives reload | rumor/trust restored | PASS |

### 5. State delta

Meaningful state changes must be visible explicitly.

Example:

```text
Memory
  before: []
  after : [R-17 hearsay, confidence=0.64]

Relationship Arin -> Mira
  trust: 0.40 -> 0.46

Inventory
  unchanged

World facts
  unchanged
```

For large states, store fingerprints/snapshots separately and summarize the important delta in the narrative.

### 6. Decision/engine explanations

Where a component makes a scored or rule-based decision, evidence should capture the important reason without exposing private model chain-of-thought.

Allowed example:

```text
Encounter selection:
  selected NPC: Mira
  eligibility: PASS
  relevance score: 0.81
  competing NPC: Taro (0.37)
  reason codes: same_location, story_relevance, available
```

For an LLM, record prompt/template version, structured inputs, output summary, validation/retry information and judge rubric results. Do not require or store hidden reasoning.

### 7. Final explanation

Every scenario ends with a short explanation such as:

```text
RESULT: PASS

The scenario passed because the story was generated, Mira was encountered,
the expected rumor was persisted as hearsay, trust increased after the chosen
interaction, and both mutations survived a database reload.
```

For failure:

```text
RESULT: FAIL

The scenario failed at assertion 5. The rumor existed before reload but was
missing after reload, indicating a persistence/commit defect rather than a
story-generation defect.
```

## Required reporting depth by ULTEF level

Not every tiny test needs a long story transcript.

- **L0:** concise input → contract validation → result.
- **L1:** domain setup + action + invariant/state delta.
- **L2:** persistence/transaction setup + operation + DB/reload result.
- **L3:** component input + important decision/output + state delta.
- **L4:** cross-component semantic timeline.
- **L5:** generated content summary + rubric scores + judge/metric evidence.
- **L6:** full Execution Narrative is mandatory.
- **L7:** attack/failure stimulus + observed protection/recovery path.
- **L8:** model/provider identity + scenario output + quality/cost/latency metrics.
- **L9:** user-visible action timeline + screenshots/traces where useful.
- **PX-LUMI:** domain-specific timeline and before/after state are mandatory where the gate concerns continuity or mutation.

## Human-readable summary report

`summary.md` should not be only a table of green/red gates. It should contain a scenario index such as:

```text
ULTEF Run 2026-08-08-001

L6-GOLDEN-001 — PASS
Child Deniz entered Gunes Vadisi as Arin. A story was created, Arin met Mira,
learned rumor R-17, increased trust with Mira, completed the session, and the
new memory/relationship state survived reload.

PX-LUMI-09-001 — PASS
Story outcome commit changed 2 expected state fields, changed 0 unexpected
fields, and produced the same result when the commit was replayed.

L7-REG-014 — FAIL
Duplicate rumor event was applied twice. Expected idempotent count=1; actual=2.
```

A reviewer must be able to select any scenario and open its detailed `.md` evidence.

## Safety and privacy

Execution Narratives use synthetic test users/children by default. They must not contain production child PII, secrets, credentials or unrestricted raw provider payloads.

## Core rule

> An ULTEF result is not sufficiently explained by `PASS`. The report must show what was tested, what happened, what changed, and why the observed result satisfies or violates the expectation.
