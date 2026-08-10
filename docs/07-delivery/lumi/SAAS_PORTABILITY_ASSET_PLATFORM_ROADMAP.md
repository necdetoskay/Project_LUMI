# Project LUMI — SaaS Portability & Asset Platform Roadmap

Status: ACTIVE
Date: 2026-08-10

## Goal

Keep Project LUMI fast to deploy on managed cloud services today while preserving a credible path to Vercel alternatives, VPS/self-hosting, alternate PostgreSQL providers, and alternate S3-compatible object storage providers.

## Canonical principles

1. State is external to disposable compute.
2. Provider SDKs and provider-specific concepts do not leak into domain/application packages.
3. Runtime configuration uses provider-neutral contracts wherever practical.
4. Local development remains a supported fallback.
5. Cloud staging and self-hosted deployment must consume the same canonical data and asset model.
6. Provider migrations require evidence: compatibility tests, browser journeys, or restore rehearsals rather than documentation-only claims.

## Completed foundation

- PostgreSQL provider portability proven against Neon PostgreSQL 18.
- Runtime and direct/migration database URLs separated.
- Canonical schema, demo journey, worker access, latency observation, and pg_dump/restore rehearsal validated on Neon.
- Cloudflare R2 development bucket created and validated through a provider-boundary object lifecycle smoke test.
- Sprint 53 introduced provider-independent character visual generation and storage ports plus local managed storage.

## Delivery sequence

### Sprint 54 — Portable Asset Storage Foundation

- Preserve the existing `CharacterVisualStoragePort`.
- Keep local managed storage as a supported fallback.
- Add an S3-compatible storage implementation.
- Use provider-neutral runtime configuration (`OBJECT_STORAGE_*`).
- Make character visual API generation/read paths storage-provider agnostic.
- Prove the actual LUMI adapter against the private R2 development bucket.

### Sprint 55 — Generic Asset Management Core

- Generalize beyond character visuals without discarding Sprint 53 canon/history behavior.
- Introduce asset subjects such as character, NPC, location, item, and story scene.
- Separate asset metadata/state in PostgreSQL from binary objects in object storage.
- Define canonical lifecycle, ownership, provenance, archive/reject, and authorization behavior.
- Evolve the parent/admin Asset Management surface around the generic model.

### Sprint 56 — Image Generation Platform

- Generalize image generation behind provider/model capabilities.
- Preserve OpenRouter/Krea as the first implementation, not a domain dependency.
- Add explicit cost/budget accounting and generation policy.
- Support candidate/batch generation.
- Experiment with grid generation and deterministic split/post-processing where cost-effective.
- Keep paid live tests opt-in and budget-capped.

### Sprint 57 — Deployment Portability & Cloud Staging

- Define deployment contract for local, cloud-staging, and self-hosted profiles.
- Avoid Vercel-only runtime dependencies in core application behavior.
- Deploy a test/staging build on Vercel using Neon + R2.
- Prove login → Asset Management → stored asset → reload in a remote browser journey.
- Maintain Docker/VPS deployment parity and document the self-hosted path.

## Future follow-up

- Production-specific database/storage isolation.
- Cost and usage observability.
- Provider failover drills.
- Optional fully self-hosted PostgreSQL + S3-compatible object storage profile.

## Exit condition for the roadmap

The roadmap is complete when LUMI can run the same canonical application and asset workflows on managed cloud staging and a documented self-hosted profile without provider-specific domain/application changes.
