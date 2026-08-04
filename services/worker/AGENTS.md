# `services/worker` — DOX Contract

## Purpose

`@lumi/worker` provides the background job orchestrator that drives Sprint 14
world simulation. It discovers worlds with absent children, dispatches
idempotent simulation runs, records committed effects, and freezes worlds past
the absence threshold.

## Ownership

Owned by the Simulation / Sprint 14 squad.

## Local Contracts

- **Idempotency.** Every simulation run is dispatched with an idempotency key
  derived from `(worldId, clockHash, seed)`; retries are safe and never re-apply
  the same effect.
- **Parent-safe.** The worker never lets the child's character make autonomous
  decisions during background simulation.
- **Observability.** All runs emit structured logs via `@lumi/logger`.

## Work Guidance

- Add new job types as separate classes implementing `JobRunner`.
- Keep the worker loop simple; delegate domain logic to `@lumi/simulation`.

## Verification

- `pnpm --filter @lumi/worker lint`
- `pnpm --filter @lumi/worker typecheck`
- `pnpm --filter @lumi/worker test`

## Child DOX Index

No child packages.
