# L8 Boundary Confusion Analysis

## Purpose

This document records how Project LUMI interprets semantic-judge errors on the hard-boundary calibration set. The goal is not to tune thresholds until a judge passes. The goal is to expose whether errors are random, systematically lenient/strict, rubric-specific, or concentrated on particular adjacent score transitions.

The hard-boundary labels remain `architect-challenge-reference / human-review pending`. They are not human calibration truth and must not be silently rewritten to match a model.

## First live hard-boundary observation — 2026-08-08

Judge model: `openai/gpt-4.1-mini`

Observed aggregate result:

- overall MAE: `0.778` — FAIL against `<= 0.75`;
- within-one accuracy: `100%`;
- choice influence MAE: `0.833`;
- personality/emotion MAE: `0.500`;
- age appropriateness MAE: `1.000`.

The dominant direction was upward: borderline outputs were often scored one point more generously than the architect challenge labels. The model never missed by more than one point in this run. The result therefore looks like adjacent-score calibration bias rather than broad rubric misunderstanding.

## Confusion instrumentation

`evaluateSemanticCalibration()` now emits the following diagnostic fields in addition to the existing eligibility metrics:

- `meanBias`: mean of `predictedScore - referenceScore`;
- `directionCounts.under`: number of predictions below the reference;
- `directionCounts.exact`: exact-score matches;
- `directionCounts.over`: number of predictions above the reference;
- `transitions`: counts such as `2->3`, `3->4`, `4->5`;
- the same bias, direction and transition metrics separately for each rubric;
- `signedError` for every individual row.

Positive `meanBias` means the judge is more generous than the current reference labels. Negative `meanBias` means it is stricter.

The deterministic calibration self-test includes an intentional all-`+1` boundary case and verifies exactly six `2->3`, six `3->4` and six `4->5` transitions. These diagnostics do not alter MAE thresholds, eligibility, hard gates or model-ranking authority.

## Interpretation rules

1. Never lower the MAE threshold merely because a preferred judge narrowly fails.
2. Never promote architect challenge labels to human truth without explicit human review.
3. Treat a strong directional bias as a calibration signal, not automatically as model error.
4. Review adjacent boundary examples before changing either the rubric wording or the reference score.
5. Keep deterministic continuity, world-consistency and child-safety gates authoritative regardless of semantic-judge calibration.
6. A future human-reviewed boundary set should be evaluated with both aggregate MAE and the confusion diagnostics in this document.

## Human review priority

The current evidence suggests this order:

1. `age_appropriateness` — largest observed MAE and strongest apparent leniency;
2. `choice_influence` — second-largest observed MAE;
3. `personality_emotion` — strongest current adjacent-score discrimination.

For each pair, the reviewer should compare the text itself rather than the current numeric label and answer whether the neighbouring score better represents the intended LUMI quality standard.

## CI flake discovered during this work

A separate `StoryReaderClient` UI test failed once while waiting for the text `Patika daha sakin ve golgelidir.` after clicking `Nazik ipucu`. The same CI validate job was re-run against the same commit without code changes and then passed `pnpm test`, load smoke and build. The component and the relevant hint-reset effect are also present on `main`, so this was classified as a reproducible-evidence gap / timing flake rather than an L8 regression.

No product or test expectation was weakened to make the run pass. If this failure recurs, it should be stabilized as a dedicated UI timing issue rather than hidden with retries.

## Next evidence milestone

After explicit human review, freeze the corrected `human-reviewed-boundary-v1` labels and run the same frozen judge outputs against them. Then compare:

- MAE;
- within-one accuracy;
- mean bias;
- under/exact/over distribution;
- transition matrix;
- rubric-specific bias;
- repeated-run variance.

Only after that should semantic scores be considered for any controlled contribution to model ranking. They remain advisory-only today.
