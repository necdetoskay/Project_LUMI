# L8 Semantic Calibration Seed Review

## Status

- Dataset: `L8-SEMANTIC-CALIBRATION-SEED-001`
- Example count: 18
- Rubrics: `choice_influence`, `personality_emotion`, `age_appropriateness`
- Review status: **architect/AI review completed; owner-human approval pending**
- Ranking authority: **none**
- First live calibration status: **eligible-seed-unreviewed**

This review does not claim human approval. The seed labels remain advisory until a human owner explicitly reviews and accepts them.

## First live calibration evidence — 2026-08-08

Judge model: `openai/gpt-4.1-mini`

The first real OpenRouter calibration run evaluated all 18 seed examples in one batch and met every numerical threshold:

- overall MAE: **0.000**;
- within-one accuracy: **100%**;
- `choice_influence` MAE: **0.000** (6/6 within one);
- `personality_emotion` MAE: **0.000** (6/6 within one);
- `age_appropriateness` MAE: **0.000** (6/6 within one);
- prompt tokens: **962**;
- completion tokens: **137**;
- total tokens: **1099**;
- provider-call latency: approximately **3.15 seconds**.

All 18 predicted integer scores exactly matched the seed reference scores. This result proves the judge is numerically compatible with the current seed set, but **does not** prove independent human agreement because the seed labels have not yet received explicit owner-human approval. The judge therefore remains advisory-only and must not affect deterministic hard gates or winner selection.

## Review findings

The 18 examples cover the full 0–5 score range for each rubric and preserve monotonic quality progression from clearly strong to clearly contradictory/unsuitable outputs.

### Choice influence

The labels are internally consistent. Scores 5 materially develop the prior Mira choice; score 3 remembers the choice but only weakly connects it to the next action; score 2 mentions the branch but lets it have little causal effect; scores 1–0 contradict or erase the prior choice.

### NPC personality / emotion

The labels are internally consistent. Scores 5 preserve Bora's calm, supportive and cautious canon; score 3 is helpful but emotionally shallow; score 2 introduces impatience while retaining some support; scores 1–0 introduce mockery or reckless abandonment that conflicts with canon.

### Age appropriateness

The labels are internally consistent for the 6–8 age band. Scores 5 use short, concrete and warm language; score 3 introduces one mildly technical concept while remaining understandable; score 2 becomes substantially technical; scores 1–0 use clearly adult/academic abstraction.

## Boundary examples to watch

The most calibration-sensitive examples are the middle-band labels (`choice-3a`, `choice-2a`, `personality-3a`, `personality-2a`, `age-3a`, `age-2a`). A future human review should focus on these first because adjacent-score disagreement is most likely there.

## Promotion rule

The dataset may be promoted from `seed-human-reference` to `human-reviewed-v1` only after explicit human-owner approval. Even after promotion, a semantic judge must meet all calibration thresholds before its status can become `trusted-for-advisory`:

- overall MAE <= 0.75;
- within-one accuracy >= 85%;
- every rubric MAE <= 1.0.

Semantic judging must remain subordinate to deterministic continuity, world-consistency and child-safety hard gates.
