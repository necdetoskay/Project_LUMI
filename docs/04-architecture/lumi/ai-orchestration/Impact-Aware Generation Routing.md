# Impact-Aware Generation Routing

Status: Phase 2 contract for #242 / parent epic #240.

## Principle

LUMI selects model strength by **future decision impact**, not by output length. A short Genesis decision may shape hundreds of future stories, while a long recap may be operational and reversible.

## Tiers

### Tier S — foundation-critical

- `character_genesis`
- `genesis_divergence`
- `genesis_evaluation`
- `saga_foundation`

Defaults: high reasoning, larger output budget, no tier downgrade. Generator and evaluator have distinct task types so they may use different models.

Tier S fails closed when an explicit household task setting is disabled. If no household setting exists, deployments must configure `LUMI_TIER_S_DEFAULT_MODEL` or an explicit `LUMI_DEFAULT_OPENROUTER_MODEL`. Tier S never silently falls back to LUMI's built-in economical model.

### Tier A — important generative work

- `social_ecology_generation`
- `living_world_bootstrap`
- `adventure_opportunity_generation`

These tasks expand or materialize an already protected foundation. They may use a balanced model and may fall back according to policy.

### Tier B — high-volume operational work

- `adventure_teaser`
- `story_recap`

These tasks may use a fast economical model. They can write presentation output only and cannot mutate protected Genesis or Saga Canon.

## Configuration order

For every intent:

1. household-scoped `profile.llm_task_model_settings` entry for that task type
2. tier environment default (`LUMI_TIER_S_DEFAULT_MODEL`, `LUMI_TIER_A_DEFAULT_MODEL`, `LUMI_TIER_B_DEFAULT_MODEL`)
3. explicit deployment-wide `LUMI_DEFAULT_OPENROUTER_MODEL`
4. built-in economical OpenRouter model only for Tier A/B

The provider credential continues to use the existing household-scoped OpenRouter settings and server fallback. Genesis services must call the canonical routing/gateway boundary and must not embed provider/model ids.

## Prompt Registry relationship

Model routing and prompt selection are independent configuration axes:

```text
generation intent
  -> impact-aware model route
  -> prompt key/version from Prompt Registry
  -> canonical gateway
  -> AI generation trace
```

A stronger model does not get permission to alter prompt governance. A prompt version does not decide its own model.

## Mutation authority

The routing policy carries explicit mutation targets:

- Tier S Genesis generation may mutate `genesis` only where the phase owns that mutation.
- Saga foundation may mutate `saga_canon` and initial `saga_progression`.
- Genesis evaluator is read/evaluate-only even though it is Tier S.
- Tier A bootstrap work may mutate bootstrap/materialization state according to its phase contract.
- Tier B may mutate `presentation` only.

Callers must use `assertGenerationIntentMayMutate` before applying model-produced state changes.

## Telemetry

The existing AI generation trace remains canonical. Each routed call can attach `buildGenerationTraceRoutingMetadata(route)` to trace input metadata, providing:

- generation intent
- criticality tier
- route source
- model id
- reasoning level

The existing trace already records provider, prompt key/version, token usage, estimated cost and latency. This avoids a duplicate telemetry table.

## Evaluator separation

`genesis_evaluation` is a distinct task type from `character_genesis` and `genesis_divergence`. Admin settings can therefore choose a different evaluator model without code changes.

## Failure policy

Tier S quality failure is preferable to silently accepting an unintended low-impact model. Missing or explicitly disabled critical routing is an actionable configuration error. Tier A/B may use configured safe fallbacks because their outputs are more reversible and bounded.

## Database change

Migration `0072_genesis_generation_task_types.sql` extends the existing task-type check constraint. It creates no parallel settings table.

## Follow-on use

Phase 3 Creative Divergence will consume `character_genesis`, `genesis_divergence` and `genesis_evaluation` routes. Phase 4 will use `saga_foundation`; Phase 6/7 will consume Tier A routes. Operational UI copy may use Tier B routes without canon write authority.
