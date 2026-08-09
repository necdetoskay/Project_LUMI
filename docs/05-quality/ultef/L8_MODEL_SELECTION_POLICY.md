# L8 Model Selection Policy — Champion / Challenger

Status: canonical
Evidence basis: corrected L8 three-model live benchmark, run 31273334869

## Purpose

LUMI must not become permanently coupled to a single LLM. Model selection is evidence-driven and must preserve deterministic safety, continuity, world-state, and story invariants before performance or semantic quality can influence ranking.

## Current roles

- Champion: `openai/gpt-4.1-mini`
- Low-latency challenger / preferred fallback: `google/gemini-2.5-flash`
- Secondary challenger: `anthropic/claude-haiku-4.5`

The corrected benchmark produced bounded scores of 92.20, 91.95, and 74.73 respectively. The 0.25-point gap between GPT-4.1 Mini and Gemini 2.5 Flash is not treated as a decisive quality separation.

## Non-negotiable eligibility gates

A model is ineligible to become Champion if any required deterministic hard gate fails. Semantic judge scores, latency, token efficiency, or price cannot rescue a hard-gate failure.

Required hard gates include at minimum:

1. child-safety behavior,
2. known-world boundary preservation,
3. continuity preservation,
4. choice influence / divergence,
5. personality and emotion consistency where applicable,
6. age appropriateness,
7. required structured-output and execution contracts.

A provider/model endpoint that cannot complete the benchmark is also ineligible for promotion.

## Ranking after eligibility

For models that pass all required hard gates, the calibrated bounded scorecard may rank candidates using:

- deterministic quality: 60 points,
- calibrated semantic quality: 10 points,
- latency: 15 points,
- token efficiency: 15 points.

Semantic points are enabled only when the semantic judge is backed by completed human review, passing calibration, and passing stability evidence (`trusted-for-advisory-stable`).

## Champion promotion rule

A Challenger does not replace the Champion merely because of a tiny score advantage in one benchmark run.

Promotion requires all of the following:

1. all deterministic hard gates PASS,
2. at least three repeated benchmark runs per candidate,
3. no material regression in child safety, continuity, or world consistency,
4. calibrated semantic evidence available,
5. operational endpoint availability confirmed,
6. a meaningful advantage in at least one production objective (quality, latency, token/cost efficiency),
7. no unacceptable trade-off in the other production objectives.

As a default guard against benchmark noise, total-score differences below 1.0 point are considered a practical tie unless a clearly material production advantage exists. In a practical tie, retain the existing Champion to avoid unnecessary model churn.

## Runtime routing policy

Default story-generation route:

1. use the Champion when available and within operational limits;
2. use Gemini 2.5 Flash as the preferred fallback / latency-sensitive route while it remains hard-gate eligible;
3. use other challengers only after the same eligibility evidence exists;
4. never bypass deterministic validation because the provider/model is a trusted Champion.

Fallback means provider/model substitution, not validation bypass. Generated output must still pass the same downstream LUMI deterministic contracts.

## Re-evaluation triggers

Re-run the controlled leaderboard when one or more of these occur:

- a materially promising new model becomes available,
- a current model receives a major version/update,
- provider pricing changes materially,
- latency or reliability changes materially,
- LUMI's story prompts or scenario pack changes materially,
- human-review rubric/dataset changes,
- a production incident reveals a model-specific weakness,
- the semantic judge or its calibration changes.

Live provider benchmarks remain manual/cost-controlled and must not be added to ordinary PR CI.

## Evidence retention

Every promotion decision must retain:

- model IDs and provider route,
- benchmark/scenario version,
- repeat count,
- hard-gate results,
- semantic calibration/trust state,
- latency/token measurements,
- bounded scorecard,
- date/run identifier,
- reason for promotion, retention, or demotion.

## Current decision

Retain `openai/gpt-4.1-mini` as Champion.

Keep `google/gemini-2.5-flash` as the primary Challenger and preferred low-latency fallback. Its corrected score is effectively tied with the Champion and its observed latency is lower, while GPT-4.1 Mini currently retains a small overall advantage and lower token use.

Keep `anthropic/claude-haiku-4.5` eligible as a secondary Challenger, but do not select it as the default route on the current evidence because its latency and token profile materially reduce its bounded production score.
