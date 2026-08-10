# Sprint 54 — Portable Asset Storage Foundation

Status: IN PROGRESS
Date: 2026-08-10

## Objective

Make the existing Sprint 53 character visual storage path portable across local filesystem and S3-compatible object storage without changing the character visual domain/application contract.

## In scope

- Preserve `CharacterVisualStoragePort` as the application boundary.
- Preserve local managed character visual storage.
- Add provider-neutral S3-compatible object operations.
- Add `S3CompatibleCharacterVisualStorageAdapter`.
- Select storage at runtime through standard `OBJECT_STORAGE_*` configuration.
- Remove direct local-storage coupling from character visual generation and content API routes.
- Keep objects private; reads continue through the authorized LUMI content route.
- Prove the real LUMI adapter against the configured Cloudflare R2 development bucket.
- Keep Cloudflare/R2 naming out of domain/application packages and runtime contracts.

## Out of scope

- Generic asset metadata model for NPC/location/item/story-scene assets.
- Public bucket access or public asset URLs.
- Presigned browser uploads.
- Production bucket provisioning.
- Image-generation provider redesign or grid generation.
- Vercel deployment.
- Fully self-hosted object storage.

## Runtime contract

When all required object-storage values exist, web runtime uses S3-compatible storage:

- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- `OBJECT_STORAGE_REGION` (optional; defaults to `auto`)

When the required object-storage configuration is absent, local managed storage remains the development fallback.

Provider-specific GitHub secret names such as `LUMI_DEV_OBJECT_STORAGE_*` are CI/deployment inputs only and are mapped into the runtime contract.

## Storage reference compatibility

Existing local refs remain readable:

`local-character-visual://...`

New S3-compatible refs use:

`s3-character-visual://<bucket>/<key>`

Persisted references do not contain credentials or provider endpoints.

## Security constraints

- Bucket remains private.
- Object credentials are server-side only.
- Asset authorization remains enforced before storage reads.
- Storage refs must not be accepted as arbitrary filesystem paths or cross-bucket reads.
- No secrets are committed to the repository.

## Acceptance criteria

- Existing Sprint 53 local visual behavior remains green.
- Character visual generation route constructs storage through the provider-neutral factory.
- Character visual content route reads both historical local refs and S3-compatible refs.
- Real R2 adapter gate succeeds for store → read/byte compare → delete → confirmed missing.
- Ordinary CI does not require R2 secrets and does not perform external writes.
- Typecheck, lint, format, tests, and build remain green.
- No Cloudflare SDK/domain dependency is introduced.

## Evidence

Expected evidence at sprint close:

- Sprint 54 PR and CI.
- Manual `ULTEF S54 R2 Storage` green run against `lumi-dev-assets`.
- Existing regression gates green.

## Next sprint

Sprint 55 generalizes the asset model beyond character visuals. Sprint 54 must not prematurely introduce that generic domain model.
