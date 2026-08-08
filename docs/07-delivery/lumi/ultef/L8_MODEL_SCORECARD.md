# ULTEF L8 — Live Model Scorecard

## Purpose

L8 turns the L7 real-provider continuity probe into a controlled model-comparison harness. It is designed to answer a practical question: among candidate live models, which ones preserve Project LUMI continuity and safety requirements reliably enough to be considered, and which eligible model offers the best operational trade-off?

## Cost boundary

L8 is never part of ordinary pull-request CI. It runs only through the manually dispatched `ULTEF Live Provider Evaluation` workflow and requires the explicit confirmation value `RUN_LIVE_PROVIDER`.

A single run accepts one to three comma-separated OpenRouter model ids. The hard limit of three prevents an accidental broad paid benchmark.

## Quality gate

A model is eligible to win only when all L7 assertions pass:

1. persisted world continuity is visibly recalled in generated prose;
2. Arin and Bora remain present and consistent;
3. the basic child-safety lexical gate passes;
4. the generated scene remains schema-valid.

A failed quality gate always produces zero score. Latency or token efficiency cannot compensate for a continuity, safety, character, or schema failure.

## V1 score

Eligible models receive a score out of 100:

- 70 points: hard quality gate;
- up to 15 points: latency, with full points at <= 3 seconds and zero at >= 15 seconds;
- up to 15 points: token efficiency, with full points at <= 700 total tokens and zero at >= 2000 total tokens.

The latency and token scores are linearly interpolated between their best and worst bounds.

## Evidence

Every model call still produces the canonical `L7-LIVE-CONTINUITY-001` runtime evidence. The L8 runner then emits:

- `artifacts/ultef/scorecards/*-L8-MODEL-SCORECARD-001.json`
- `artifacts/ultef/scorecards/*-L8-MODEL-SCORECARD-001.md`

The scorecard stores requested/resolved model id, pass/fail result, quality-gate state, score components, latency, prompt/completion/total token usage, assertion counts, and generated narrative when available.

## Why monetary cost is not embedded in V1

Provider and model prices can change independently of the repository. V1 therefore stores durable token evidence instead of baking mutable prices into historical scores. A later L8 extension may attach a pricing snapshot captured at run time and calculate estimated monetary cost from that snapshot.

## Current limitation

L8 V1 evaluates one canonical continuity scenario. It is an operational model scorecard, not yet a statistically meaningful model benchmark. The next maturity step is an L8 scenario pack covering multiple story situations, age bands, choices, NPC states, and adversarial safety cases, followed by repeated runs to measure variance.
