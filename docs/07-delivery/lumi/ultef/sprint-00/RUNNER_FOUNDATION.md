# ULTEF Runner Foundation

Status: INITIAL SKELETON IMPLEMENTED
Date: 2026-08-08

## Implemented

The repository now contains `tooling/ultef`, a dependency-light foundation for ULTEF orchestration and narrative evidence.

Root commands currently exposed:

```text
pnpm ultef:selftest
pnpm ultef:L0
pnpm ultef:L1
pnpm ultef:L2
pnpm ultef:L3
pnpm ultef:L9
```

These are foundation mappings, not final coverage claims. L0/L1 currently delegate broadly to the existing root test suite; later manifest work will select exact scenarios by semantics.

## Narrative evidence recorder

`tooling/ultef/src/evidence.mjs` provides a minimal scenario recorder with:

- setup facts;
- ordered runtime events;
- assertions with expected/actual values;
- before/after state deltas;
- PASS/WARN/FAIL/BLOCKED result semantics;
- Markdown narrative rendering.

It refuses to finalize a scenario as PASS when any recorded assertion failed. BLOCKED scenarios require a reason or blocking prerequisite.

## Self-test

`pnpm ultef:selftest` constructs a deterministic demonstration scenario containing a profile, character, NPC encounter, rumor and relationship state change. The data is explicitly synthetic and exists only to verify the recorder itself; it must never be presented as an actual LUMI product-flow result.

The self-test also verifies the false-PASS guard.

## Important limitation

This commit establishes the recorder and orchestration skeleton but does not yet instrument production LUMI flows. Therefore no claim is made that `L6-GOLDEN-001` currently passes. The next implementation step is to attach the recorder to real profile/world/story/NPC/state-commit operations and generate evidence from runtime data.

## Next runner increments

1. Add a versioned scenario manifest.
2. Add filesystem artifact writer for `artifacts/ultef/latest` and per-run directories.
3. Add run metadata: git SHA, environment, duration, seed and prerequisites.
4. Add explicit skipped/blocked capture for guarded integration tests.
5. Instrument one real low-level scenario before attempting the complete L6 journey.
6. Implement L6 only after all required production paths exist; never fill missing paths with mocks merely to obtain PASS.
