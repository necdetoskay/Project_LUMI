# LUMI Test Lab Phase 3 — Production Onboarding Adapter

Status: implemented / validated
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

The Phase 3 adapter supports these production generation operations:

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

Each production-backed `TestRun` persists an `executionSnapshot` containing:

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

## Thin Settings shell

Phase 3 includes the first operational Settings shell at `/app/settings/test-lab`.

The shell is deliberately small but exercises the real architecture:

1. enter the household and child-profile context;
2. enter an exact OpenRouter model slug;
3. create an isolated sandbox session from an editable initial JSON state;
4. choose a production-backed Character Onboarding phase;
5. run the production pipeline;
6. inspect run usage, pricing and execution provenance;
7. compare every candidate returned by the single provider call;
8. explicitly choose `Sonraki aşamada kullan` for exactly one candidate;
9. use only that candidate's state as the parent for the next phase.

The shell never promotes data to the production LUMI state. Promotion remains a later explicit feature.

## Sandbox ownership isolation

Every shell-created sandbox state carries reserved ownership metadata bound by the authenticated server route:

- parent ID
- household ID
- child profile ID

User-supplied ownership metadata is overwritten during session creation. The production adapter preserves parent sandbox state when creating candidate states, so ownership follows every branch automatically.

Before a production-backed run, the route verifies that the requested parent state belongs to the authenticated parent and the same household/profile context. Before a candidate selection, it verifies the run's parent sandbox belongs to the authenticated parent. A leaked or guessed Test Lab UUID therefore cannot be used by another authenticated parent to advance or select that sandbox.

Ownership guard regression tests cover owner overwrite, valid owner access, cross-parent rejection and household/profile-context rejection.

## Cost behavior

The web composition normalizes available production token counts through the Test Lab pricing snapshot. Provider-reported actual cost is stored only when the underlying production gateway exposes it. The current Profiles gateway exposes estimated cost but not a provider-reported actual cost, so Test Lab keeps actual cost `null` rather than inventing a value.

## Validation evidence

The Phase 3 branch passed the repository gates after the operational shell and ownership guard were added:

- frozen lockfile install
- ULTEF L8/L9 self-tests
- Prettier format check
- ESLint
- TypeScript typecheck
- full workspace test suite
- load smoke and load gate
- production build
- Security Scan
- ULTEF PR Gates
- Character Onboarding M7 Browser E2E
- Stories UX v2 Browser E2E

The Test Lab-specific suite includes multi-candidate lineage, model mismatch rejection, immutable provenance persistence, production composition mapping and sandbox ownership isolation.

Phase 3 does not include Prompt Workspace draft/promotion UX; that belongs to #295. Stateful multi-story Test Lab sessions belong to #296.
