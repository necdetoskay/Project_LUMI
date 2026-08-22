# Production Background Life boundary

Issue #465 wires the existing deterministic `@lumi/simulation` runtime into the production web application without introducing a separate worker service.

## Trigger

Vercel Cron calls `GET /api/internal/background-life` once per day. The route is fail-closed and requires Vercel's `CRON_SECRET` bearer token plus `DATABASE_URL`.

## Execution bounds

- Active worlds only.
- At most 10 worlds per invocation by default (hard cap 25).
- A world is eligible only when its simulation clock has not advanced for at least one hour, or when it has no clock yet.
- A PostgreSQL advisory lock prevents concurrent processing of the same world.
- Runtime retry/idempotency semantics remain owned by `@lumi/simulation`.
- The existing absence policy remains authoritative, including the >10 day frozen simulation phase.

## Production evidence

Acceptance requires the deployed route to be exercised against production with the configured cron secret, followed by verification of the returned summary and corresponding `simulation.simulation_runs` / `simulation.simulation_effects` records. Production validation is recorded on issue #465 after the exact merged SHA is deployed.
