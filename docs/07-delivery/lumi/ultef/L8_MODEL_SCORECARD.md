# ULTEF L8 — Live Model Scorecard

## Purpose

L8 turns real-provider verification into a controlled model-comparison harness. It answers a practical Project LUMI question: which candidate models preserve story continuity, honor prior child choices, avoid inventing contradictory world facts, and still provide an acceptable latency/token trade-off?

## Cost boundary

L8 is never part of ordinary pull-request CI. It runs only through the manually dispatched `ULTEF Live Provider Evaluation` workflow and requires the explicit confirmation value `RUN_LIVE_PROVIDER`.

A single run accepts one to three comma-separated OpenRouter model ids. Each model executes three live story scenarios, so one run performs 3, 6, or at most 9 paid provider calls. The three-model hard limit prevents an accidental broad paid benchmark.

The scenario evaluator itself is tested on every normal CI run through `pnpm ultef:l8-scenario-selftest` and does not call an external model.

## Core scenario pack

L8 V2 uses three canonical story-quality scenarios:

1. `L8-SCENARIO-CONTINUITY-001` — continuity recall: Bora must naturally retain the prior Mira / bridge-lights / storm rumor.
2. `L8-SCENARIO-CHOICE-001` — choice influence: if the child previously chose for Arin to ask Mira about the lights, the later scene must honor that decision instead of silently switching to the contradictory follow-the-lights branch.
3. `L8-SCENARIO-WORLD-001` — world consistency / hallucination control: when canon says Bora does not know the location of a secret map, the model must not promote that unknown information into a new canonical fact.

All three scenarios retain the basic child-safety lexical boundary.

## Quality gate

A model is eligible to win only when all three core scenarios pass. The generated L8 report contains one assertion per scenario plus an overall hard-gate assertion.

A failed quality gate always produces zero score. Latency or token efficiency cannot compensate for a continuity, choice-influence, world-consistency, or safety failure.

## V2 score

Eligible models receive a score out of 100:

- 70 points: hard quality gate;
- up to 15 points: average latency per scenario, with full points at <= 3 seconds and zero at >= 15 seconds;
- up to 15 points: average total tokens per scenario, with full points at <= 700 tokens and zero at >= 2000 tokens.

Latency and token scores are linearly interpolated between their best and worst bounds. The scorecard also keeps the raw three-scenario quality score (0–100) and total latency/token evidence.

## Evidence

Every evaluated model produces canonical `L8-LIVE-SCENARIO-PACK-001` runtime evidence containing:

- the exact generated narrative for each scenario;
- evaluator gates for continuity, prior-choice influence and world consistency;
- per-scenario latency;
- prompt/completion/total token usage when returned by the provider;
- total latency and token usage across the pack.

The multi-model runner then emits:

- `artifacts/ultef/scorecards/*-L8-MODEL-SCORECARD-001.json`
- `artifacts/ultef/scorecards/*-L8-MODEL-SCORECARD-001.md`

The scorecard stores requested/resolved model id, pass/fail result, hard-gate state, score components, scenario quality score, average and total latency/token evidence, assertion counts, per-scenario gate results, and generated narratives.

## Why monetary cost is not embedded yet

Provider and model prices can change independently of the repository. L8 therefore stores durable token evidence instead of baking mutable prices into historical scores. A later extension may attach a pricing snapshot captured at run time and calculate estimated monetary cost from that snapshot.

## Current limitation

The V2 pack is substantially stronger than the original single-continuity probe, but it is still a small deterministic evaluation set. It does not yet measure model variance, broader age bands, emotion/NPC personality consistency, complex multi-session choice trees, or adversarial child-safety behavior. Those belong to subsequent L8 scenario-pack expansions and repeated-run statistical evaluation.
