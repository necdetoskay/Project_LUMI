# Sprint 15 Implementation Report

**Sprint ID:** LUMI-S15
**Sprint Title:** Image, Voice and Audio Pipelines
**Release Date:** 2026-08-04
**Branch:** `agent/sprint-15-image-voice-audio-pipelines`
**Pull Request:** (pending — requires explicit merge approval)
**Status:** Implemented / Ready for review

---

## 1. Task Summary

| Task ID | Deliverable | Target Boundary | Status |
| --- | --- | --- | --- |
| S15-T01 | Media contracts/provider ports | `packages/media` | Complete |
| S15-T02 | Image pipeline/consistency | media/image | Complete |
| S15-T03 | TTS/audio pipeline | media/audio | Complete |
| S15-T04 | Cost/policy estimator | media/policy | Complete |
| S15-T05 | Asset storage/cache lifecycle | database + object storage | Complete |
| S15-T06 | Safety/operations docs | `docs/` | Complete |

---

## 2. Files Changed

### New `packages/media`

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `eslint.config.mjs`
- `AGENTS.md` — package DOX contract (local contracts + verification commands)
- `migrations/0001_media_schema.sql`
- `scripts/media-migrate.mjs`
- `src/index.ts`

#### `src/domain`

- `media-types.ts` — `MediaKind`, `ImageAssetType`, `AudioAssetType`, `AssetLifecycleStatus`, `ImageSizePolicy`, `AudioDurationPolicy`, `MediaModelPolicy`, `MediaFailureState`, `MediaJobStatus`.
- `errors.ts` — `MediaError` base + `CostLimitExceededError`, `PolicyBlockedError`, `SafetyRejectedError`, `ConsistencyRejectedError`, `StorageFailedError`.
- `fingerprint.ts` — `computeMediaFingerprint` (key-sorted sha256 hex).
- `asset.ts` — `AssetScope`, `StoredAsset`, `AssetVariant`, `AssetGenerationMeta`.
- `identity.ts` — `CharacterVisualIdentity`, `VoiceProfile`.
- `findings.ts` — `SafetyFinding`, `ConsistencyFinding`.
- `media-jobs.ts` — `ImageJobRequest`, `TtsJobRequest`, `AudioJobRequest` (ambience/SFX), `AudioJobInput`, `MediaJobResult`.
- `index.ts`

#### `src/ports`

- `provider.port.ts` — `MediaProvider` with `generateImage`, `synthesizeSpeech`, `generateAmbient`; `ProviderImageRequest/Result`, `ProviderTtsRequest`, `ProviderAudioRequest/Result`.
- `storage.port.ts` — `ObjectStoragePort` (`put`/`get`/`delete`).
- `repository.port.ts` — `MediaAssetRepositoryPort`.
- `cache.port.ts` — `MediaFingerprintCachePort` (`get`/`put`, scope-isolated).
- `safety.port.ts` — `MediaSafetyValidatorPort`, `MediaConsistencyValidatorPort`.
- `policy.port.ts` — `MediaPolicyPort`, `MediaCostEstimatePort`, `PolicyDecision`.
- `index.ts`

#### `src/application`

- `cost-estimator.service.ts` — `MediaCostEstimator` (flat per-model image/audio cost table).
- `policy-enforcer.service.ts` — `MediaPolicyEnforcer` + `MediaPolicyConfig` (cost/size/attempts gates before generation).
- `image-pipeline.service.ts` — `ImagePipeline` (policy gate → prompt safety short-circuit → provider → payload safety → identity consistency → storage → metadata + cache).
- `audio-pipeline.service.ts` — `AudioPipeline` (TTS + ambience/SFX, policy gate → prompt safety short-circuit → provider → payload safety → storage → metadata + cache).
- `index.ts`

#### `src/infrastructure`

- `fake-provider.ts` — `FakeMediaProvider` (deterministic bytes embedding identity referenceKey + traitHashes, failure injection, call snapshots).
- `in-memory-object-storage.ts`, `in-memory-cache.ts`, `in-memory-repository.ts`.
- `validators.ts` — `StaticSafetyValidator` (forbidden terms + payload checks), `StaticConsistencyValidator` (identity reference/trait check).
- `index.ts`

#### `src/db`

- `client/index.ts` — postgres-js drizzle `createDatabase`.
- `schema/media/*` — `schemas.ts`, `common.ts`, `media-tables.ts`, `index.ts`.
- `repositories/interfaces/media-asset.repository.ts` — `MediaAssetRepositoryPort`.
- `repositories/drizzle/drizzle-media-asset.repository.ts` — `DrizzleMediaAssetRepository` (create/get/scope-list/fingerprint/lifecycle + variant/generation meta).
- `repositories/index.ts`, `index.ts`.

#### `tests`

- `tests/fixtures/media.fixtures.ts` — scope, size/duration policies, model policies, identity, voice.
- `tests/domain/fingerprint.test.ts` (4) — deterministic, order-insensitive, distinct inputs differ.
- `tests/application/image-pipeline.test.ts` (8) — stored asset, cache hit no re-generation, zero-cost cache, cost-limit pre-block, prompt-safety short-circuit before provider, provider unavailable, identity consistency rejection, scope-isolated cache.
- `tests/application/audio-pipeline.test.ts` (4) — TTS stored, idempotent TTS, different voice/seed → different fingerprint, unsafe TTS rejected.
- `tests/application/ambient-pipeline.test.ts` (3) — ambience stored, idempotent tags, distinct fingerprints per tag set.
- `tests/application/cost-policy.test.ts` (9) — estimator image/audio, policy cost/size/attempts gates.
- `tests/infrastructure/validators.test.ts` (7) — prompt/image/audio safety + identity consistency.
- `tests/integration/media-asset.repository.test.ts` (4) — env-guarded DB round-trip, household isolation, fingerprint lookup, lifecycle update.

### New `docs/`

- `docs/07-delivery/lumi/sprint-15/IMPLEMENTATION_REPORT.md` (this file).
- `docs/07-delivery/lumi/persistence/schemas/media/LUMI-media-and-asset-schema-v1.md` — media/asset schema authority doc.

### Modified

- `pnpm-lock.yaml` — workspace package registration.
- `AGENTS.md` — roadmap: Sprint 15 active-plan entry (added during sprint branch setup).

---

## 3. Media Contracts and Provider Ports (S15-T01)

- Provider-neutral design: domain/application depend only on `src/ports/*`; the concrete `FakeMediaProvider` lives in `src/infrastructure/`. No provider credentials or signed URLs cross the domain boundary.
- `MediaProvider` exposes three capabilities: `generateImage`, `synthesizeSpeech` (TTS), `generateAmbient` (ambience/SFX). Character identity is passed as a separate `CharacterVisualIdentity` object, never embedded in the narrative prompt contract.
- `FakeMediaProvider` produces deterministic bytes and embeds the identity `referenceKey` + `traitHashes` into the image payload so the consistency validator can positively verify identity fidelity. Failure injection (`failNextImageWith`/`failNextAudioWith`) and call snapshots make job-lifecycle assertions deterministic.

Evidence: `tests/domain/fingerprint.test.ts`, `tests/infrastructure/validators.test.ts`, `tests/application/image-pipeline.test.ts`.

---

## 4. Image Pipeline and Consistency (S15-T02)

- `ImagePipeline.run` ordering: estimate cost → policy gate → prompt safety (short-circuit before any provider call) → generate → payload safety → character-identity consistency → object storage → metadata insert → cache put.
- An asset failing safety or consistency is never published: the pipeline returns `failureState: safety_rejected | consistency_rejected` and writes nothing to storage or the database.
- Consistency validation checks every identity trait hash plus the reference key against the generated payload metadata; missing traits are `error`, a missing reference key is `warn`.

Evidence: `tests/application/image-pipeline.test.ts` (8 tests, incl. safety/consistency rejection and zero-storage assertions).

---

## 5. TTS / Audio Pipeline (S15-T03)

- `AudioPipeline` handles both TTS (`TtsJobRequest`) and ambience/SFX (`AudioJobRequest`), discriminated by `AudioJobInput.kind`.
- Prompt safety short-circuits before the provider call for both kinds; payload audio safety (`CHILD_SAFETY-002`, size/empty checks) runs after generation.
- `generateAmbient` returns OGG bytes with a bounded duration; `synthesizeSpeech` returns MPEG with a duration derived from text length (bounded by `maxSeconds`).

Evidence: `tests/application/audio-pipeline.test.ts` (4), `tests/application/ambient-pipeline.test.ts` (3).

---

## 6. Cost and Policy Estimator (S15-T04)

- `MediaCostEstimator` derives a per-job USD estimate from the model policy before generation; the estimate feeds the policy gate.
- `MediaPolicyEnforcer` blocks generation before any provider call when estimated cost exceeds the limit, requested size/duration exceeds the byte budget, or the model attempts exceed the configured bound (`CostLimitExceededError` / `PolicyBlockedError`).
- The policy is a plain port + config (`MediaPolicyConfig`), so parent policy can be supplied per household at the composition root.

Evidence: `tests/application/cost-policy.test.ts` (9).

---

## 7. Asset Storage, Cache and Lifecycle (S15-T05)

- `migrations/0001_media_schema.sql` creates the `media` schema: `media_assets` (metadata + object-storage key only — **no binary payloads**), `media_asset_variants`, `media_asset_generations`, `media_asset_references`, `media_fingerprint_cache`, plus an idempotent `_media_migration_ledger`. Constraints and indexes are created idempotently. Forward-only.
- `DrizzleMediaAssetRepository` implements create/get/scope-list/fingerprint/lifecycle and variant/generation writes; scoped reads filter by both household and child profile.
- Fingerprint caching is household/child-scoped: a cache hit never starts a duplicate paid generation, and identical inputs with identical scope return the same asset id with zero cost.
- Migration applied to the configured PostgreSQL (`172.41.42.51:15432`) and re-applied cleanly after the integration test's destructive teardown.

Evidence: `tests/integration/media-asset.repository.test.ts` (4; `MEDIA_TEST_ENABLE_DESTRUCTIVE=true` + reachable PostgreSQL).

---

## 8. Safety and Operations Docs (S15-T06)

- `packages/media/AGENTS.md` codifies the package DOX contract: provider-neutral domain, cost-before-generation, fingerprint idempotency, binary-free PostgreSQL, hard safety/consistency gates, scoped access, no credential/signed-URL logging, and verification commands.
- `docs/07-delivery/lumi/persistence/schemas/media/LUMI-media-and-asset-schema-v1.md` documents the media/asset schema as the persistence authority.
- `scripts/media-migrate.mjs` mirrors the other packages' migration runner (ledger-based, idempotent).

---

## 9. Verification Commands and Results

```powershell
pnpm --filter @lumi/media test        # 6 files, 35 tests PASS
pnpm --filter @lumi/media typecheck   # PASS
pnpm --filter @lumi/media lint        # PASS
# optional, with reachable PostgreSQL:
$env:MEDIA_TEST_ENABLE_DESTRUCTIVE="true"
$env:DATABASE_URL="postgresql://lumi:lumi_local_only@172.41.42.51:15432/lumi"
pnpm --filter @lumi/media test:int    # 1 file, 4 tests PASS
pnpm --filter @lumi/media media:migrate   # migration applied; ledger verified
pnpm build                            # PASS (all packages)
node scripts/check-mojibake.mjs       # PASS
```

---

## 10. Acceptance Criteria Traceability

| Acceptance Criterion | Source Location | Test | Result |
| --- | --- | --- | --- |
| Fake provider ile image/TTS/audio job lifecycle tamamlanır | `ImagePipeline`/`AudioPipeline` | `image/audio/ambient-pipeline.test.ts` | PASS |
| Aynı fingerprint duplicate ücretli generation başlatmaz | fingerprint cache (scope-isolated) | `image-pipeline.test.ts` (cache hit), `ambient-pipeline.test.ts` (idempotent) | PASS |
| Cost limit aşımı generation öncesinde bloke edilir | `MediaPolicyEnforcer` gate | `cost-policy.test.ts`, `image-pipeline.test.ts` | PASS |
| Failed job retry idempotent ve bounded'dır | deterministic fingerprint + cache | `fingerprint.test.ts` | PASS |
| Asset Family Space/Child Profile scope dışında okunamaz | repo scope filters + cache scope keys | `media-asset.repository.test.ts`, `image-pipeline.test.ts` | PASS |
| Character consistency ve safety rejection fixture'ları geçer | `StaticSafetyValidator`/`StaticConsistencyValidator` | `validators.test.ts`, `image-pipeline.test.ts` | PASS |
| Büyük binary PostgreSQL'te saklanmaz; object storage + metadata kullanılır | `media_assets` schema + `ObjectStoragePort` | `media-asset.repository.test.ts` (metadata only) | PASS |
| Child safety validation başarısız asset'i publish etmez | prompt short-circuit + payload gates | `image/audio-pipeline.test.ts` (zero storage) | PASS |
| Provider credential ve ham signed URL loglanmaz | ports boundary; no logging of credentials | code review | PASS |

---

## 11. Known Risks and Out-of-Scope Items

- Only the fake provider is implemented; real image/TTS/audio adapters (`FakeMediaProvider` → production provider) are a follow-up. The port contract is stable and provider-neutral.
- `media_fingerprint_cache`, variants, references, and generation meta are written by the repository but only the cache and metadata paths are exercised end-to-end by the pipelines; full variant/reference usage arrives with the Story Reader UI (out of scope).
- No UI was changed; generation always requires an explicit parent/product policy (never autonomous).
- Sprint 14 hardening completed after this report: `budget-planner.test.ts` was moved into `packages/simulation/tests/application`, worker discovery/composition adapters were connected, and worker freeze/concurrency tests were added.

---

## 12. Rollback / Rollforward Plan

- The new `@lumi/media` package has no runtime consumers yet; it can be removed by deleting the package and the `pnpm-lock.yaml` registration without affecting `@lumi/web` or other packages.
- Migration is forward-only; rollback requires restoring from a pre-migration backup.
- Provider configuration is injected at the composition root, so switching providers or rolling back provider config is possible without changing domain code.
- Failed/unpublished assets never reach `active`; their metadata (if any) is a draft that can be cleaned independently.
