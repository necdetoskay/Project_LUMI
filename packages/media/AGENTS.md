# `packages/media` — DOX Contract

## Purpose

`@lumi/media` implements provider-neutral image, TTS and audio generation
pipelines. It enforces child-safety and character-consistency validation,
cost estimation before generation, size/duration/quality policy, fingerprint
caching, and asset lifecycle where binary payloads live in object storage and
PostgreSQL stores metadata only.

## Ownership

Owned by the Media / Sprint 15 squad. Changes to provider contracts, cost or
policy gates, or the asset lifecycle must be reviewed by the media
architecture owner.

## Local Contracts

- **Provider-neutral domain.** Domain and application code depend only on
  ports (`src/ports/*`); concrete providers live in `src/infrastructure/`.
  No provider-specific UI or credential handling in the domain.
- **Cost before generation.** Every image/audio job produces an estimated
  cost; generation is blocked before any provider call when the cost limit is
  exceeded.
- **Fingerprint idempotency.** Identical job inputs produce the same
  fingerprint; a cache hit never starts a duplicate paid generation.
- **Binary-free PostgreSQL.** `media_assets` stores metadata and object
  storage keys only. Binary payloads are never written to the database.
- **Safety/consistency are hard gates.** An asset that fails safety or
  character-consistency validation is never published (`active`).
- **Scoped access.** Assets are only readable within the owning
  household/child-profile scope.
- **No credential/signed-URL logging.** Provider credentials and raw signed
  URLs are never logged.

## Work Guidance

- Add new provider support as a port adapter in `src/infrastructure/`;
  keep domain rules bounded.
- Keep cost tables in `src/application/cost-estimator.service.ts`; never
  hard-code provider pricing in domain models.
- New asset kinds require a new `StoredAsset.kind` plus migration checks.

## Verification

- `pnpm --filter @lumi/media lint`
- `pnpm --filter @lumi/media typecheck`
- `pnpm --filter @lumi/media test`
- `pnpm --filter @lumi/media test:int` (requires
  `MEDIA_TEST_ENABLE_DESTRUCTIVE=true` and a reachable PostgreSQL)

Required test coverage includes fingerprint idempotency, cost-limit
blocking, safety/consistency rejection, storage scoping, and fake-provider
job lifecycle.

## Child DOX Index

No child packages.
