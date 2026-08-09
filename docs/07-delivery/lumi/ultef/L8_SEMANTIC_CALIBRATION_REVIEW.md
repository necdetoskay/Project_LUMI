# L8 Semantic Calibration Review

## Baseline status

- Baseline dataset: `L8-SEMANTIC-CALIBRATION-SEED-001`
- Baseline example count: 18
- Rubrics: `choice_influence`, `personality_emotion`, `age_appropriateness`
- Review status: **architect/AI review completed; owner-human approval pending**
- Ranking authority: **none**
- First live calibration status: **eligible-seed-unreviewed**

This review does not claim human approval. The seed labels remain advisory until a human owner explicitly reviews and accepts them.

## First live baseline calibration evidence — 2026-08-08

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

## Hard-boundary challenge set

A second dataset now exists as `L8-SEMANTIC-CALIBRATION-HARD-BOUNDARY-001`.

Its purpose is different from the baseline set. The baseline intentionally spans clearly strong and clearly weak examples over the full 0–5 range. That makes it useful for verifying broad rubric understanding, but it can make a perfect score easier than real production judging. The hard-boundary set therefore concentrates entirely on adjacent middle-band scores where evaluator disagreement is more likely.

Hard-boundary structure:

- 18 total examples;
- 6 examples for each rubric;
- only scores **2, 3 and 4**;
- exactly two examples for every rubric/score combination;
- deliberately reduced use of explicit meta-language that reveals the intended score;
- subtle differences in causal choice influence, emotional attunement and age-level complexity.

The challenge set is currently **`architect-challenge-reference` / human-review pending**. Its labels were prepared during architecture/test design and are **not human calibration truth**. A judge may be tested against them, but passing the boundary challenge cannot grant ranking authority.

### First live hard-boundary evidence — 2026-08-08

Judge model: `openai/gpt-4.1-mini`

The first real hard-boundary run deliberately used the same numerical thresholds as the baseline calibration. The judge **did not pass the overall MAE gate**, even though every prediction remained within one point of the current architect reference label:

- overall MAE: **0.778** — threshold `<= 0.75`, therefore **FAIL**;
- within-one accuracy: **100%**;
- `choice_influence` MAE: **0.833**;
- `personality_emotion` MAE: **0.500**;
- `age_appropriateness` MAE: **1.000**;
- prompt tokens: **1155**;
- completion tokens: **173**;
- total tokens: **1328**;
- live test duration: approximately **3.4 seconds**.

The detailed pattern is informative rather than catastrophic. The model never missed by more than one point. Its dominant tendency was to score borderline outputs **one point higher** than the current architect labels. Examples labelled 4 were commonly predicted as 5; several 3s became 4s; several 2s became 3s. `personality_emotion` was the strongest of the three rubrics, while `age_appropriateness` showed the largest systematic upward shift.

This is exactly why the hard-boundary set exists: the baseline `MAE=0` result alone would have overstated judge precision. The current evidence says that `gpt-4.1-mini` understands the broad rubric very well, but its adjacent-score discrimination is not yet precise enough to satisfy our strict threshold on the unreviewed boundary labels. It therefore remains **advisory-only** and receives no ranking authority.

Because the hard-boundary labels are still human-review pending, this result must not be interpreted as proof that the judge itself is wrong. A human review may confirm some current labels or move them toward the model's adjacent scores. The correct next comparison is human-reviewed labels versus the frozen live predictions, not silently changing thresholds to make the model pass.

### Why the boundary set is separate

The original 18-example baseline is frozen because it already has real provider evidence attached to it. Replacing or silently expanding that file would make the historical `MAE=0` result ambiguous. Keeping the datasets separate gives us two stable measurements:

1. **baseline agreement** — broad rubric understanding across 0–5;
2. **boundary discrimination** — ability to distinguish nearby quality levels around 2/3/4.

The live-provider workflow supports selecting either `seed` or `hard-boundary` for an optional single paid calibration call. Boundary evidence is written under `L8-SEMANTIC-CALIBRATION-BOUNDARY-001`, so it cannot be mistaken for the baseline calibration used by scorecard trust annotation.

## Baseline review findings

The 18 baseline examples cover the full 0–5 score range for each rubric and preserve monotonic quality progression from clearly strong to clearly contradictory/unsuitable outputs.

### Choice influence

The labels are internally consistent. Scores 5 materially develop the prior Mira choice; score 3 remembers the choice but only weakly connects it to the next action; score 2 mentions the branch but lets it have little causal effect; scores 1–0 contradict or erase the prior choice.

### NPC personality / emotion

The labels are internally consistent. Scores 5 preserve Bora's calm, supportive and cautious canon; score 3 is helpful but emotionally shallow; score 2 introduces impatience while retaining some support; scores 1–0 introduce mockery or reckless abandonment that conflicts with canon.

### Age appropriateness

The labels are internally consistent for the 6–8 age band. Scores 5 use short, concrete and warm language; score 3 introduces one mildly technical concept while remaining understandable; score 2 becomes substantially technical; scores 1–0 use clearly adult/academic abstraction.

## Human-review priority

Human review should begin with the hard-boundary set and especially compare adjacent pairs within the same rubric. The reviewer should not try to preserve the current numeric labels; if an example feels like a different adjacent score, the human label should replace the architect challenge label.

Recommended review order:

1. `choice-boundary-*` — decide how much remembered context is required before a prior choice materially changes the next story;
2. `personality-boundary-*` — decide where mild impatience or shallow reassurance crosses from acceptable characterization into inconsistency;
3. `age-boundary-*` — decide how much vocabulary/scientific abstraction remains comfortable for the 6–8 age band when concrete action still supports comprehension.

The first live boundary result makes the third group especially important: the judge systematically scored the age examples one point more generously than the current architect labels.

## Promotion rule

The baseline dataset may be promoted from `seed-human-reference` to `human-reviewed-v1` only after explicit human-owner approval. The hard-boundary challenge may become `human-reviewed-boundary-v1` only after its examples are independently reviewed and corrected as needed.

Even after human promotion, a semantic judge must meet all calibration thresholds before its status can become `trusted-for-advisory`:

- overall MAE <= 0.75;
- within-one accuracy >= 85%;
- every rubric MAE <= 1.0.

For stronger future authority, these basic thresholds should be supplemented with repeated-run stability, adjacent-score confusion analysis and a larger human-reviewed sample before semantic scores can participate in model ranking.

Semantic judging must always remain subordinate to deterministic continuity, world-consistency and child-safety hard gates.
