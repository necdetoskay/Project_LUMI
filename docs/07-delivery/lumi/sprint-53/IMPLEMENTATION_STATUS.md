# Sprint 53 — Implementation Status

Status: IN PROGRESS
Date: 2026-08-10
Branch: `s53/character-visual-canon`

## Objective

Implement the first production visual pipeline for LUMI: existing character data -> reproducible visual brief -> provider generation job -> managed candidate assets -> explicit character visual canon selection.

## Current state

- Sprint 52 playable persistent demo is merged to `main`.
- The canonical demo character Lina exists independently of media generation.
- Story media truthfully remains `not_generated` until a visual candidate is generated and explicitly selected.
- OpenRouter's dedicated image endpoint and `krea/krea-2-medium-turbo` model contract are wired behind a provider-independent port.
- Parent/admin Asset Management is available at `/app/assets` as `Görsel Kütüphanesi` and uses the production generation/select/reject services.

## Workboard

- [x] T01 Sprint 53 canonical visual-canon specification
- [x] T02 Provider-independent persistence schema for generation jobs, assets and character canon
- [x] T03 Migration for character visual persistence
- [x] T04 Deterministic/versioned character visual brief + fingerprint
- [x] T05 Unit coverage for brief determinism and identity-relevant change
- [x] T06 Application service for idempotent generation jobs and candidate persistence
- [x] T07 Provider-independent generation/storage ports and prompt rendering
- [x] T08 Explicit canon selection/replacement/rejection lifecycle
- [x] T09 Minimal parent/admin Asset Management workflow
- [x] T10 OpenRouter/Krea Turbo adapter behind opt-in live-generation boundary
- [x] T11 Dedicated DB-backed fake-provider S53 ULTEF authored
- [ ] T12 Live Krea evidence and final CI/regression matrix

## Implemented foundation

### Persistence

`profile.character_visual_generation_jobs` stores one logical generation request with character-scoped idempotency, versioned visual brief, provider/model metadata, requested candidate count, usage/cost metadata and explicit failure state.

`profile.character_visual_assets` stores durable managed candidates independently of provider URLs. It includes lifecycle state, generation provenance, candidate index and composite/grid lineage through `source_composite_asset_id` plus `crop_metadata`.

`profile.character_visual_canons` stores the character-level canon pointer and visual identity contract separately from generated assets. Selection is explicit and generation never silently replaces canon.

### Reproducible brief

`CHARACTER_VISUAL_BRIEF_VERSION = lumi-character-visual-v1` builds a provider-independent brief from already-existing canonical character data. Stable object-key ordering plus SHA-256 produces an auditable fingerprint so unchanged canonical data yields the same brief identity.

### Production lifecycle

`generateCharacterVisualCandidates` performs authenticated character lookup, idempotent job creation, provider execution, storage handoff, managed candidate persistence, usage/cost provenance and explicit failed-job recording. Provider failure leaves a failed job and no phantom visual asset.

`selectCharacterVisualCanon` makes one candidate canonical and archives the previous canon asset without deleting history. Re-selecting the already-active canon is idempotent and does not increment its version. `rejectCharacterVisualCandidate` refuses to reject the active canon and retains rejected provenance.

### Provider adapter

`OpenRouterCharacterVisualGenerationAdapter` targets the configured image-generation endpoint through the generic generation port. The default S53 model is `krea/krea-2-medium-turbo`; multi-candidate logical jobs fan out at the adapter while remaining one LUMI generation job.

### Asset Management

`/app/assets` lists household characters and their persisted visual candidates, exposes explicit generate/select/reject controls, shows the active canon, and serves image bytes through an authenticated content endpoint rather than exposing arbitrary filesystem paths.

### Test gates

- required S53 CI uses a deterministic fake provider and disposable PostgreSQL;
- the DB-backed S53 lifecycle gate has already passed on an earlier S53 implementation snapshot;
- live Krea execution is isolated in `ULTEF S53 Live Krea Image`;
- the live workflow only executes automatically for a commit carrying `[live-image-test]` or by manual dispatch;
- if `OPENROUTER_API_KEY` is absent, the workflow skips the paid request and uploads a skip-evidence artifact;
- if present, exactly one 1K Lina candidate is generated, persisted in the disposable DB, selected as canon, and uploaded as a GitHub Actions artifact.

## Guardrails

- no generation side effect during character creation;
- no provider URL as the only persisted asset identity;
- no silent canonical-image replacement;
- no live-provider dependency in required CI;
- no cross-household asset visibility;
- no claim that grid generation is production-ready until crop/split provenance is tested;
- no paid generation on ordinary pushes/PR runs;
- the automatic live smoke is capped to one candidate.

## Remaining blockers

1. required S53 fake-provider gate and normal CI must pass on the final production head;
2. the requested live Krea workflow must either produce the real visual artifact or explicitly prove the repository secret is unavailable;
3. final CI / Integration / Security / PX / S35-S52 regressions must be green before COMPLETE.
