# Production Background Life boundary

Issue #465 wires the existing deterministic `@lumi/simulation` runtime into the production web application without introducing a separate worker service.

## Trigger

Vercel Cron calls `GET /api/internal/background-life` once per day. The route is fail-closed and requires Vercel's `CRON_SECRET` bearer token plus `DATABASE_URL`.

## Execution bounds

- Active worlds only.
- At most 10 worlds per invocation by default (hard cap 25).
- A world is eligible only when it has no prior simulation run or its latest run is at least one hour old.
- A PostgreSQL advisory lock prevents concurrent processing of the same world.
- The worker ensures a canonical simulation clock exists before running the simulation.
- Cron wall-clock elapsed time is deliberately not translated into world-clock progression. The runtime currently has a 120x real-to-game-time clock multiplier, and #465 does not define an autonomous gameplay time-rate contract.
- Runtime retry/idempotency semantics remain owned by `@lumi/simulation`.
- The existing absence policy remains authoritative, including the >10 day frozen simulation phase.

## Production evidence

Acceptance requires the deployed route to be exercised against production with the configured cron secret, followed by verification of the returned summary and corresponding `simulation.simulation_runs` / `simulation.simulation_effects` records. Production validation is recorded on issue #465 after the exact merged SHA is deployed.
