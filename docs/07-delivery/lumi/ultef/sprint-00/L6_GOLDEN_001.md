# L6-GOLDEN-001 — First Canonical Headless LUMI Journey

Status: Canonical scenario specification
Date: 2026-08-08
Primary levels: L4 + L6
Project gates: PX-LUMI-01, 02, 03, 05, 08, 09

## Goal

Prove that a realistic LUMI journey can start from a synthetic household/child profile, create a world and character, run a story interaction involving an NPC-originated fact/rumor, commit resulting state, reload persistence and observe continuity in a later session — without relying on browser/UI behavior.

This test is deliberately narrative-visible: the report must show exactly what happened, not just assertion counts.

## Determinism policy

Initial implementation should use deterministic fixtures/fakes for generation/decision steps wherever needed so lower-level correctness is stable and cheap. A later L8 variant may execute the same scenario with a real model/provider.

All synthetic names below are fixture defaults, not user data.

## Scenario setup

Household alias: `H-GOLDEN-001`
Child profile: `Deniz`, age band representing approximately 7 years
World: `Gunes Vadisi`
Player character: `Arin`
NPC: `Mira`
Location: `Eski Kutuphane`
Rumor/fact seed: `R-GOLDEN-001`

Canonical rumor content for deterministic fixtures:

> Firtinadan once eski koprunun isiklari kendiliginden yaniyor.

The implementation may localize/display Turkish characters correctly; identifiers remain ASCII-safe.

## Preconditions

- test database/state can be isolated and reset;
- household/profile/world/story/NPC repositories are available through application ports or test adapters;
- story session can be started headlessly;
- rumor/memory or equivalent fact propagation path is available;
- world outcome commit and reload path is available;
- test recorder can capture structured runtime events.

If a required production path does not yet exist, the scenario must report `BLOCKED` at the exact step rather than silently substituting an unrelated mock that would hide the gap.

## Journey

### Step 01 — Create household and child profile

Action:
- create synthetic household;
- create child profile `Deniz` with target age band.

Expected:
- profile belongs only to the test household;
- profile can be retrieved after creation.

Narrative event example:

```text
[PROFILE_CREATED] Deniz profile was created in household H-GOLDEN-001.
```

### Step 02 — Create character

Action:
- create player character `Arin` for Deniz.

Expected:
- Arin belongs to Deniz;
- baseline trait/inventory/relationship state is captured as Snapshot C0.

Narrative:

```text
[CHARACTER_CREATED] Arin was created for Deniz.
```

### Step 03 — Create/resolve world

Action:
- create or bootstrap `Gunes Vadisi`;
- ensure `Eski Kutuphane` and NPC `Mira` exist in deterministic fixture state.

Expected:
- world identity is stable;
- initial world snapshot W0 is captured.

Narrative:

```text
[WORLD_READY] Gunes Vadisi is ready. Mira is present at Eski Kutuphane.
```

### Step 04 — Start story session

Action:
- start a story session for Deniz/Arin in Gunes Vadisi.

Expected:
- active session is persisted;
- opening scene can be selected/generated headlessly.

Narrative:

```text
[STORY_STARTED] Arin entered the story in Gunes Vadisi.
```

### Step 05 — NPC encounter

Action:
- drive deterministic scene/interaction so Arin encounters Mira at Eski Kutuphane.

Expected:
- encounter references the real fixture NPC id;
- no duplicate/foreign NPC is introduced.

Narrative:

```text
[NPC_ENCOUNTER] Arin met Mira at Eski Kutuphane.
```

### Step 06 — Rumor/fact transmission

Action:
- Mira shares `R-GOLDEN-001`.

Expected:
- Arin receives a memory/fact representation;
- source is Mira;
- classification distinguishes hearsay from direct observation;
- confidence is within valid configured bounds.

Illustrative expected confidence: `0.64` only if the implementation fixture/rule chooses that exact deterministic value. The test must assert the configured value, not hardcode documentation fiction.

Narrative:

```text
[RUMOR_HEARD] Mira told Arin: "Firtinadan once eski koprunun isiklari kendiliginden yaniyor."
[MEMORY_CREATED] Arin stored R-GOLDEN-001 as hearsay from Mira with confidence <runtime-value>.
```

### Step 07 — Player choice

Present deterministic choices, for example:

1. `Bunu ilk kim gordu?`
2. `Ben kopruye hemen giderim.`
3. `Bu sadece bir soylenti olabilir.`

Action:
- select choice 1 through a deterministic test policy.

Expected:
- choice belongs to active scene;
- story advances exactly once;
- consequence path is traceable.

Narrative:

```text
[CHOICE_PRESENTED] 3 choices were offered.
[CHOICE_SELECTED] Arin chose: "Bunu ilk kim gordu?"
```

### Step 08 — Relationship / consequence mutation

Action:
- process the deterministic consequence of respectful curiosity toward Mira.

Expected:
- any relationship delta follows the actual domain rule;
- before and after values are captured;
- unrelated relationships do not change unexpectedly.

Narrative example using runtime values:

```text
[RELATIONSHIP_CHANGED] Arin -> Mira trust changed 0.40 -> 0.46 because of story consequence SC-GOLDEN-001.
```

Documentation values are examples. Runtime evidence is authoritative.

### Step 09 — Finish story and create outcomes

Action:
- end the deterministic story segment/session;
- produce outcome manifest/events for relevant changes.

Expected:
- outcome set references existing entities;
- no duplicate logical outcome keys;
- expected memory/relationship/world consequences are represented.

Narrative:

```text
[STORY_COMPLETED] The story session completed with N outcome intents/events.
```

### Step 10 — Commit outcomes

Action:
- apply outcomes through the real world/story commit pipeline.

Expected:
- commit succeeds transactionally as designed;
- second application is idempotent or safely rejected according to domain contract;
- Snapshot W1/C1 is captured.

Narrative:

```text
[OUTCOME_COMMITTED] Story outcomes were committed once.
[IDEMPOTENCY_CHECK] Re-applying the same logical outcome produced no duplicate mutation.
```

### Step 11 — Reload persisted state

Action:
- dispose in-memory aggregate/repository state where possible;
- reload world, character, relationship and memory from persistence.

Expected:
- world identity matches W0;
- rumor memory remains;
- source/classification/confidence remain correct;
- relationship consequence remains;
- unrelated baseline state remains unchanged.

Narrative:

```text
[STATE_RELOADED] Gunes Vadisi and Arin were reloaded from persistence.
[CONTINUITY_CONFIRMED] R-GOLDEN-001 and the Arin/Mira relationship state survived reload.
```

### Step 12 — Start later session and prove continuity

Action:
- start a second story/session for the same child/world;
- retrieve/build context relevant to Mira/bridge rumor.

Expected:
- prior committed memory/world fact is available to the later session when relevant;
- system does not invent a contradictory source/history.

Narrative:

```text
[LATER_SESSION_STARTED] A new story session started for Arin.
[PRIOR_STATE_USED] The later session could access Arin's prior Mira rumor memory.
```

## Required snapshots

### Profile/ownership
- household id/alias;
- child profile id/alias;
- character ownership linkage.

### Character Snapshot C0/C1
At minimum when implemented:
- character id/name;
- inventory summary;
- relevant trait/vector values;
- relevant relationships;
- relevant memories.

### World Snapshot W0/W1
At minimum when implemented:
- world id/name;
- relevant facts/events;
- NPC identity/state needed by scenario;
- active/committed story effects;
- quest/inventory/world deltas when applicable.

## Core assertions

The scenario cannot PASS unless all applicable assertions execute:

1. profile/character/world ownership is correct;
2. story session starts and advances;
3. Arin encounters fixture NPC Mira;
4. rumor/fact is transmitted with correct source semantics;
5. selected choice is valid and applied once;
6. intended consequence is represented in outcomes;
7. outcome commit changes the expected state and not unrelated state;
8. duplicate application causes no duplicate logical effect;
9. persistence reload retains committed state;
10. later session can observe relevant prior state.

## Failure localization

The report should identify the first failing boundary and downstream blocked checks. Examples:

- rumor exists before commit but not after reload → likely L2/PX-LUMI-09 persistence/commit boundary;
- rumor source becomes unknown after propagation → PX-LUMI-03 / NPC-memory semantics;
- relationship changes twice after retry → idempotency failure in PX-LUMI-09/L7;
- later session cannot see valid committed memory → PX-LUMI-01/02/03 continuity integration failure.

## Required human-readable report shape

```text
L6-GOLDEN-001 — Golden Headless Journey

SETUP
Household: H-GOLDEN-001
Child: Deniz (synthetic test profile)
Character: Arin
World: Gunes Vadisi
NPC: Mira

TIMELINE
01 ✓ Deniz profile created
02 ✓ Arin created
03 ✓ Gunes Vadisi ready
04 ✓ Story session started
05 ✓ Arin met Mira at Eski Kutuphane
06 ✓ Mira shared R-GOLDEN-001
07 ✓ Memory created as hearsay, source=Mira, confidence=<runtime>
08 ✓ Arin selected "Bunu ilk kim gordu?"
09 ✓ Relationship/consequence delta recorded
10 ✓ Outcomes committed
11 ✓ Duplicate apply caused no duplicate effect
12 ✓ Persistence reload completed
13 ✓ Prior memory and consequence survived reload
14 ✓ Later session observed prior state

STATE DELTA
<actual structured before -> after values>

ASSERTIONS
<each assertion and expected/actual value>

RESULT: PASS | WARN | FAIL | BLOCKED
REASON: <concrete reason based on runtime evidence>
```

## L8 real-model variant

`L8-GOLDEN-001-*` may reuse the same fixture world and expected invariants while replacing deterministic story rendering/selection with a real configured model. Narrative wording is allowed to vary, but structural invariants, safety, continuity, cost, latency and model identity must be captured separately.
