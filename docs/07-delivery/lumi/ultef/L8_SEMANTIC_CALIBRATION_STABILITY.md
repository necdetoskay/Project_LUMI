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
