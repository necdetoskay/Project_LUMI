# L8 Semantic Calibration Stability

## Purpose

A single semantic-judge calibration PASS is not enough to establish a stable evaluator. Project LUMI therefore repeats the frozen human-reviewed calibration set and measures run-to-run variation before semantic scores can receive any controlled scorecard weight.

Deterministic continuity, world-consistency and child-safety gates remain authoritative regardless of semantic stability results.

## Canonical reference set

The preferred stability reference is:

`L8-SEMANTIC-CALIBRATION-HUMAN-REVIEWED-BOUNDARY-V1`

It contains the 18 owner-reviewed boundary examples across:

- `choice_influence`;
- `personality_emotion`;
- `age_appropriateness`.

The initial owner-grounded live calibration with `openai/gpt-4.1-mini` produced MAE `0.639`, 100% within-one accuracy and passed all rubric thresholds. Stability evaluation asks whether that result remains consistent across independent provider calls.

## Default stability profile

Default calibration repeats: **3**.

Maximum supported repeats: **5**.

For repeated calibration to be considered stable, all of the following must hold:

- at least two thirds of individual calibration runs pass;
- mean MAE <= `0.75`;
- MAE standard deviation <= `0.15`;
- signed-bias standard deviation <= `0.15`;
- every rubric's mean MAE <= `1.0`.

The stability evaluator records:

- repeat pass rate;
- mean MAE and MAE standard deviation;
- mean signed bias and bias standard deviation;
- mean rubric MAE and rubric MAE standard deviation;
- individual repeat summaries.

## First live stability evidence — 2026-08-08

Judge model: `openai/gpt-4.1-mini`

Reference dataset: `L8-SEMANTIC-CALIBRATION-HUMAN-REVIEWED-BOUNDARY-V1`

Three independent provider calls were executed at temperature `0`. All three produced the same calibration result:

- repeat 1: MAE `0.639`, mean bias `+0.639`, within-one `100%`;
- repeat 2: MAE `0.639`, mean bias `+0.639`, within-one `100%`;
- repeat 3: MAE `0.639`, mean bias `+0.639`, within-one `100%`.

Aggregate stability result:

- stability result: **PASS**;
- calibration passes: **3/3**;
- pass rate: **100%**;
- mean MAE: **0.639**;
- MAE standard deviation: **0.000**;
- mean signed bias: **+0.639**;
- signed-bias standard deviation: **0.000**;
- `choice_influence` mean MAE: **0.833**, standard deviation **0.000**;
- `personality_emotion` mean MAE: **0.500**, standard deviation **0.000**;
- `age_appropriateness` mean MAE: **0.583**, standard deviation **0.000**.

The score-transition pattern was also identical in every repeat. Each run contained zero under-scores, six exact matches and twelve over-scores. The judge is therefore extremely stable on this frozen set, but retains a consistent upward scoring bias rather than random variation.

Provider usage per repeat was `1155` prompt tokens plus `173` completion tokens, or `1328` total tokens. Across the three stability calls the run used `3465` prompt tokens, `519` completion tokens and **3984 total tokens**.

The zero variance is strong evidence for this model/set/temperature configuration, but three calls are still a small sample. This evidence grants stability confidence only for controlled advisory use; it does not justify bypassing deterministic gates.

## Cost isolation

Repeated semantic calibration is never part of normal pull-request CI. Normal CI executes only the deterministic stability self-test and incurs no provider cost.

The manual `ULTEF Live Provider Evaluation` workflow exposes `calibration_repeats` from 1 to 5 and includes those calls in the planned provider-call budget before execution. Three-repeat stability calibration therefore consumes exactly three calibration provider calls.

## Authority rule

Passing stability preserves or earns only `trusted-for-advisory` status. It does not allow semantic judging to override deterministic gates.

Semantic scores may participate in model ranking only after:

1. human-reviewed calibration truth exists;
2. numerical calibration thresholds pass;
3. repeated stability thresholds pass;
4. the scorecard integration uses a deliberately bounded weight;
5. deterministic hard gates remain non-bypassable.

A stability failure returns the judge to advisory-only/no-ranking-authority status until the cause is understood.
