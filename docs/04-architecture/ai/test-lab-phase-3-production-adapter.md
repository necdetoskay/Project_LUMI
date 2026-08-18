# LUMI Test Lab Phase 3 — Production Onboarding Adapter

Status: implementation / validation
Date: 2026-08-18
Parent: #294

## Goal

Phase 3 connects Test Lab experiments to the same Character Onboarding generation path used by production without letting experiments mutate canonical production state.

## Production path reused

A supported Test Lab onboarding phase uses the production-owned chain:

1. Generation Context construction
2. Context assembly
3. Prompt Registry active revision resolution
4. OpenRouter/model gateway
5. output-schema validation
6. onboarding suggestion parsing

The Test Lab supplies its selected sandbox parent state through the creation-state override seam. Production selection/finalization writes are not called by the Test Lab execution path.

## Supported character-first phases

The Phase 3 adapter currently supports these production generation operations:

- `character_first_identity_suggestions`
- `world_suggestions`
- `compatibility`
- `region_suggestions`
- `origin_suggestions`
- `core_saga`

World-first continuation is intentionally not presented as complete. The canonical production gap is tracked by #303 and must be solved there rather than simulated inside Test Lab.

## Run and candidate boundary

One provider/model invocation creates exactly one `TestRun`.

A validated production response may contain many suggestions. Each suggestion becomes a separate `TestRunCandidate` and separate candidate `StateSnapshot`:

```text
Production call
  -> TestRun
       -> Candidate A -> State A
       -> Candidate B -> State B
       -> Candidate C -> State C
```

Token usage, price snapshot, latency and provider-call provenance belong to the single `TestRun`; they are not duplicated for every suggestion.

Only an explicit `TestSelection` can make one candidate the downstream parent. Non-selected candidate states remain immutable alternatives and never merge into the canonical sandbox path.

## Immutable execution provenance

Each production-backed `TestRun` can persist an `executionSnapshot` containing:

- production operation name
- prompt key
- prompt version
- rendered prompt fingerprint
- context fingerprint

The run separately persists the exact requested model slug, immutable pricing snapshot and available usage snapshot.

The generic `ProductionTestRunner` rejects a production adapter response when the returned model slug differs from the requested/priced model slug. This prevents usage from being recorded against the wrong price snapshot.

## Composition boundary

`@lumi/profiles` owns the real Character Onboarding generation adapter.

`@lumi/ai` owns Test Lab session/run/candidate/state persistence and the generic `ProductionTestRunner`.

`@lumi/web` is the composition layer that adapts the production onboarding service to the generic Test Lab `ProductionScenarioAdapter` contract. This avoids introducing a circular package dependency between the AI experiment domain and Profiles production domain.

## Cost behavior

The web composition normalizes available production token counts through the Test Lab pricing snapshot. Provider-reported actual cost is stored only when the underlying production gateway exposes it. The current Profiles gateway exposes estimated cost but not a provider-reported actual cost, so Test Lab must keep actual cost `null` rather than inventing a value.

## Validation required before Phase 3 completion

- format
- lint
- typecheck
- unit tests for multi-candidate production runs and model mismatch rejection
- repository persistence test including migration `0005_test_lab_execution_provenance.sql`
- full workspace test suite
- build
- existing onboarding/browser/security/ULTEF gates

Phase 3 does not include Prompt Workspace UI or prompt draft/promotion UX; those belong to the following Test Lab phase.
