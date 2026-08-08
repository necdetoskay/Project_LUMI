# ULTEF Sprint 01 — Regression Expansion and Negative Paths

Status: ACTIVE
Date: 2026-08-08

## Goal

Move ULTEF from a small set of proven integration anchors to a repeatable regression network that exercises alternative choices, isolation boundaries, invalid transitions and continuity failures without losing readable narrative evidence.

## Principles

1. Keep `L6-GOLDEN-001` as the permanent happy-path regression anchor.
2. Prefer production code and disposable PostgreSQL for persistence boundaries.
3. Use deterministic generation at L0–L7 unless the scenario explicitly targets provider behavior.
4. A guarded/skipped scenario never counts as PASS without runtime evidence.
5. Negative tests must describe the attempted action and why the system rejected it.
6. Every failure-path test must assert that forbidden state changes did **not** leak into persistence.

## Sprint 01 scenario set

### S01-T01 — Household isolation matrix

Scenario IDs:

- `L2-ISOLATION-001` — foreign household cannot load child profile/character.
- `L2-ISOLATION-002` — foreign household cannot read or mutate story session.
- `L2-ISOLATION-003` — NPC belief/rumor state never crosses household boundary.

Evidence should show both attempted access and unchanged protected state.

### S01-T02 — Session transition negative paths

Scenario IDs:

- `L3-SESSION-001` — stale expectedVersion is rejected.
- `L3-SESSION-002` — completed session cannot advance.
- `L3-SESSION-003` — second active session for the same child/world is rejected when the product rule forbids it.
- `L3-SESSION-004` — duplicate idempotency key reuses the existing operation rather than duplicating state.

### S01-T03 — Story choice branch regression

Scenario IDs:

- `L4-CHOICE-001` — investigate rumor branch.
- `L4-CHOICE-002` — postpone rumor branch.
- `L4-CHOICE-003` — ask another NPC branch.

The branches must produce distinct but valid state deltas. The objective is to prove that choice is not decorative.

### S01-T04 — Outcome rejection and no-leak tests

Scenario IDs:

- `L4-OUTCOME-REJECT-001` — evidence reference is invalid or missing.
- `L4-OUTCOME-REJECT-002` — outcome targets an entity outside the allowed world/household scope.
- `L4-OUTCOME-REJECT-003` — conflicting/stale commit cannot silently overwrite newer state.

Required evidence:

```text
Attempted change
→ validation/rule rejection
→ no commit record
→ no world version increment
→ no event/outbox side effect
```

### S01-T05 — Rumor failure and retry behavior

Scenario IDs:

- `L4-RUMOR-FAIL-001` — writer failure keeps intent retryable.
- `L4-RUMOR-FAIL-002` — max attempts marks intent failed.
- `L4-RUMOR-FAIL-003` — failed rumor does not create a partial belief.
- `L4-RUMOR-FAIL-004` — successful retry creates one belief only.

### S01-T06 — Golden Journey variants

Scenario IDs:

- `L6-GOLDEN-002` — second character/world configuration.
- `L6-GOLDEN-003` — alternate player choice with a different downstream consequence.
- `L6-GOLDEN-004` — continuity survives session completion and later restart without immediately reusing the same hook.

These should reuse the L6 harness but vary canonical inputs and expected consequences.

### S01-T07 — Narrative report quality

Add report-level assertions that ensure every L4+ run includes:

- named child/character aliases;
- story/session context;
- ordered `What happened` events;
- expected/actual assertions;
- before/after state deltas where mutation occurs;
- explicit limitation labels for test doubles;
- clear rejection explanation for negative scenarios.

## L7 preparation

Sprint 01 should prepare but not overclaim L7. Candidate L7 themes:

- multi-session / multi-NPC long continuity;
- time progression and delayed effects;
- repeated story generation without excessive seed repetition;
- partial failure recovery across several services;
- concurrency and idempotency under competing requests.

## L8 preparation

L8 remains provider-backed semantic E2E. Sprint 01 should define the evaluation contracts but not require paid provider calls in normal CI.

Planned L8 checks include:

- actual story generated through configured provider;
- age appropriateness;
- canonical character consistency;
- world-state fidelity;
- meaningful response to player choice;
- correct use of known NPC/item/rumor context;
- no invention of contradictory canonical state;
- later story recalls prior committed events;
- origin-story candidate quality when Character Origin Story Seed System is implemented.

## Acceptance criteria

Sprint 01 can close when:

1. household isolation has DB-backed evidence;
2. stale/invalid session transitions have no-leak evidence;
3. at least three distinct choice branches are tested;
4. rejected outcomes prove no world-state leak;
5. rumor retry/failure paths are covered;
6. at least one additional L6 Golden variant executes successfully;
7. all scenarios emit narrative evidence;
8. CI, ULTEF Integration and Security remain green.

## Initial implementation order

1. `L2-ISOLATION-001..003`
2. `L3-SESSION-001..004`
3. `L4-OUTCOME-REJECT-001..003`
4. `L4-RUMOR-FAIL-001..004`
5. `L4-CHOICE-001..003`
6. `L6-GOLDEN-002`
7. report quality assertions and Sprint 01 closeout review
