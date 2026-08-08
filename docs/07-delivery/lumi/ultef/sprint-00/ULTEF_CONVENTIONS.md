# ULTEF-LUMI — Scenario, Naming & Narrative Conventions

Status: Sprint 00 canonical draft
Date: 2026-08-08

## 1. Stable scenario IDs

Each meaningful ULTEF scenario receives a stable ID independent of file path:

```text
L0-CONTRACT-001
L1-PROFILE-001
L1-WORLD-001
L2-PERSISTENCE-001
L3-NPC-001
L4-STORY-WORLD-001
L6-GOLDEN-001
L7-REGRESSION-001
L8-MODEL-001
L9-WEB-001
PX-LUMI-09-001
```

Existing Vitest/Playwright tests may be mapped to an ID without moving or renaming the source file.

## 2. Scenario metadata

Each ULTEF scenario definition should expose:

- `id`
- `title`
- `level`
- `projectGates[]`
- `purpose`
- `preconditions`
- `expectedBehavior`
- `sourceTests[]`
- `requiredEvidence`
- `deterministicSeed` when applicable
- `environmentRequirements[]`

## 3. Execution narrative requirement

Behavior-oriented tests must produce a human-readable account of what actually happened, based on runtime evidence rather than invented prose.

Required structure:

```text
Scenario: L6-GOLDEN-001
Purpose: Verify story → consequence → persistence → continuity

SETUP
- Household created: Test Household A
- Child profile created: Deniz, age band 7-9
- Character created: Arin
- World created: Güneş Vadisi

TIMELINE
01. Story session started: Fısıldayan Kütüphane
02. Arin entered the library.
03. NPC Mira was selected/encountered.
04. Mira shared rumor R-004: “Fırtınadan önce köprünün ışıkları yanıyor.”
05. Memory system stored R-004 as hearsay with confidence 0.64.
06. Player selected choice C-02: “Bunu ilk kim gördü?”
07. Relationship trust Arin → Mira changed 0.40 → 0.46.
08. Story outcome commit completed.
09. World state was reloaded from persistence.

ASSERTIONS
✓ rumor R-004 exists after reload
✓ memory provenance = Mira
✓ relationship trust = 0.46
✓ no duplicate outcome was committed

RESULT: PASS
Reason: all expected durable state changes matched actual persisted state.
```

Names and narrative content in examples are illustrative; runtime reports must use the actual values generated or seeded by the scenario.

## 4. State delta reporting

State-changing scenarios must record the smallest useful before/after diff rather than dumping the full database.

Example:

```text
STATE DELTA
relationship[Arin,Mira].trust: 0.40 -> 0.46
memory[R-004]: absent -> present
memory[R-004].sourceNpcId: null -> npc-mira
world.events[bridge-lights-rumor]: absent -> present
```

Unchanged critical invariants may also be listed:

```text
UNCHANGED / PROTECTED
childProfileId: same
householdId: same
unrelated NPC states: unchanged
```

## 5. Failure narrative

FAIL must explain both expectation and actual behavior:

```text
RESULT: FAIL
Failed at: persistence reload
Expected: memory R-004 present after reload
Actual: memory R-004 absent
Last successful step: story outcome commit returned success
Likely boundary: outcome commit -> persistence/reload
```

A likely boundary is diagnostic context, not a claim of root cause unless proven.

## 6. Blocked narrative

A blocked test must say why it did not execute:

```text
RESULT: BLOCKED
Reason: PostgreSQL integration database unavailable
Executed steps: setup validation only
Assertions executed: 0/6
```

A blocked or skipped mandatory test never contributes a PASS.

## 7. Evidence source-of-truth

Narrative fields are derived from structured runtime events such as:

```text
profile.created
character.created
world.created
story.session.started
story.scene.generated
story.choice.selected
npc.encountered
rumor.shared
memory.created
relationship.changed
outcome.committed
world.reloaded
assertion.checked
```

The human-readable report is a renderer over these structured facts. It must not fabricate events to make the report easier to read.

## 8. Privacy and safety

Automated scenarios must use synthetic/test identities. Reports must avoid real child PII, credentials, provider secrets, auth tokens, raw sensitive prompts and unnecessary full payload dumps.

## 9. Compact vs detailed reporting

Every run may provide two views:

### Summary

```text
L6-GOLDEN-001 PASS — 14 steps, 8 assertions, 4 state deltas
```

### Detailed narrative

Contains setup, timeline, assertions, deltas, result/reason and links/paths to machine-readable evidence.

The detailed narrative is mandatory for L6 and state-changing PX-LUMI scenarios and strongly recommended for behavior-rich L3/L4 tests.
