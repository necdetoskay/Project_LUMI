# `packages/simulation` — DOX Contract

## Purpose

`@lumi/simulation` implements world time, calendar, and the background simulation
engine that advances world state while a child is absent. It enforces an
absence-policy (normal → reduced → limited → frozen) based on real-world absence
duration, a relevance-budgeted simulation planner, idempotent simulation runs
and committed effects, and a deterministic return recap builder.

## Ownership

Owned by the Simulation / Sprint 14 squad. Changes to the absence policy,
simulation budget model, or effect-commit semantics must be reviewed by the
simulation architecture owner.

## Local Contracts

- **Absence policy is parent-safe.** The child's character is never chosen as an
  decision target during background simulation. Irreversible or critical events
  stay `pending` or `player-preserved` until the child returns.
- **Determinism.** Given the same world clock state, NPC state, and seed, a
  simulation run produces the same set of effects.
- **Idempotency.** Each simulation effect carries an idempotency key; retries do
  not re-apply the same effect.
- **Committed vs. pending.** Only committed effects (resolved within the same
  simulation run) appear in the return recap.
- **Budget discipline.** Only entities within the relevance bubble and within the
  per-phase simulation budget consume planner ticks.
- **Persistence boundary.** Domain and application code depend only on ports
  (`src/ports/*`); the drizzle repository in `src/db/` implements the simulation
  store. Effects are isolated by household + world at query time.

## Work Guidance

- Add new simulation inputs as ports and provide in-memory test doubles.
- Keep effect rules bounded; generate a concrete effect only when required
  facts/characters are available.
- Extend the absence policy only as a new version; never mutate past runs.

## Verification

- `pnpm --filter @lumi/simulation lint`
- `pnpm --filter @lumi/simulation typecheck`
- `pnpm --filter @lumi/simulation test`
- `pnpm --filter @lumi/simulation test:int` (requires
  `SIM_TEST_ENABLE_DESTRUCTIVE=true` and a reachable PostgreSQL)

Required test coverage includes absence-policy segments (1/5/9/14 day fixtures),
10-day freeze boundary, idempotency on retry, relevance ordering, pending-event
exclusion from recap, and DB round-trip/isolation.

## Child DOX Index

No child packages.
