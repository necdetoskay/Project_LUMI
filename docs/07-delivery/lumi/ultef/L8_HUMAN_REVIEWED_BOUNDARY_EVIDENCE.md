# L8 Human-Reviewed Boundary Calibration Evidence

Date: 2026-08-08

Dataset: `L8-SEMANTIC-CALIBRATION-HUMAN-REVIEWED-BOUNDARY-V1`

Judge model: `openai/gpt-4.1-mini`

Result: **PASS**

The semantic judge was rerun against the project owner's completed 18-example human-reviewed boundary dataset. This replaces the architect-only boundary labels as the authoritative comparison for this calibration evidence.

## Metrics

- Overall MAE: **0.639** (threshold `<= 0.75`)
- Within-one accuracy: **100%** (threshold `>= 85%`)
- Mean signed bias: **+0.639**
- Direction counts: **0 under / 6 exact / 12 over**
- Choice influence MAE: **0.833**
- Personality/emotion MAE: **0.500**
- Age appropriateness MAE: **0.583**
- Prompt tokens: **1155**
- Completion tokens: **173**
- Total tokens: **1328**
- Live test duration: approximately **3.9 seconds**

## Interpretation

The earlier architect-only hard-boundary run produced MAE `0.778` and failed the `0.75` gate. After independent owner review, several strong examples received higher accepted scores, and the same judge family now passes against the human-reviewed reference at MAE `0.639`.

The judge still has a systematic generous bias: 12 of 18 predictions are above the human reference and none are below it. This means the judge is calibrated well enough for **trusted-for-advisory** semantic analysis under the current numerical thresholds, but it must remain subordinate to deterministic continuity, world-consistency and child-safety hard gates and must not independently select a production model.

## Rubric observations

- `choice_influence`: MAE `0.833`; 1 exact and 5 upward predictions. This is the weakest human-reviewed rubric and should receive further adjacent-score examples.
- `personality_emotion`: MAE `0.500`; 3 exact and 3 upward predictions. This is the strongest current boundary rubric.
- `age_appropriateness`: MAE `0.583`; human review materially reduced the apparent disagreement seen in the architect-only set. The previous conclusion that age judging was the weakest dimension was therefore partly caused by overly strict architect seed labels.

## Authority

Status after this run: **trusted-for-advisory**.

Semantic judge scores may be displayed alongside deterministic ULTEF evidence and used as a secondary quality signal. They do not override deterministic hard gates and are not yet authorized to change model ranking without an additional stability/repeat-run calibration milestone.
