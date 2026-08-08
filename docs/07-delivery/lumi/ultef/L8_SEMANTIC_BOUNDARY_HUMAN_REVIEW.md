# L8 Semantic Boundary Human Review

## Purpose

This is the canonical human-review procedure for `L8-SEMANTIC-CALIBRATION-HARD-BOUNDARY-001`.

The proposed scores are architecture/test-design references, not ground truth. The reviewer should change a score whenever an adjacent value feels more accurate. The goal is to create an independently accepted boundary dataset, not to confirm the existing labels.

## Generated review artifact

A hard-boundary live calibration now produces a dedicated review worksheet automatically:

`L8-SEMANTIC-BOUNDARY-HUMAN-REVIEW.md`

The worksheet is written into the same ULTEF run directory as the calibration evidence and therefore travels inside the normal `ultef-live-provider-scorecard-evidence` artifact bundle.

Each of the 18 rows contains:

- the full story text;
- the current architect challenge score;
- the live semantic judge score;
- a blank human score field;
- a blank decision/notes field.

The generated worksheet also includes the live calibration snapshot: overall MAE, within-one rate, mean signed bias, and under/exact/over direction counts when available. This prevents the reviewer from having to reconstruct row-level predictions from raw evidence JSON.

## Review rules

For each example, read the rubric and story text and decide a 0–5 score independently. When practical, make the human decision before using the architect or judge score as an anchor.

The architect score is a challenge reference. The judge score is advisory evidence. Neither is human calibration truth.

Use these decisions when possible:

- `accept` — the current architect score is also the human score;
- `relabel` — the text is useful, but the accepted human score differs;
- `rewrite` — the example is too ambiguous or poorly targeted to serve as a stable boundary reference.

Adjacent disagreement is expected and useful, especially between 2/3 and 3/4.

A dataset may be promoted to `human-reviewed-boundary-v1` only when every row has a human decision and every disputed example has either been relabeled or rewritten and reviewed again.

## Choice influence

Review question: how much must the earlier Mira choice causally change the next story before the score moves from remembered context to meaningful influence?

Expected review rows:

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `choice-boundary-4a` | 4 |  | pending |
| `choice-boundary-4b` | 4 |  | pending |
| `choice-boundary-3a` | 3 |  | pending |
| `choice-boundary-3b` | 3 |  | pending |
| `choice-boundary-2a` | 2 |  | pending |
| `choice-boundary-2b` | 2 |  | pending |

## Personality and emotion

Review question: where does shallow reassurance or mild impatience become sufficiently inconsistent with Bora's calm, supportive and cautious characterization to deserve a lower score?

Expected review rows:

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `personality-boundary-4a` | 4 |  | pending |
| `personality-boundary-4b` | 4 |  | pending |
| `personality-boundary-3a` | 3 |  | pending |
| `personality-boundary-3b` | 3 |  | pending |
| `personality-boundary-2a` | 2 |  | pending |
| `personality-boundary-2b` | 2 |  | pending |

## Age appropriateness

Review question: how much technical vocabulary is comfortable for ages 6–8 when concrete actions and experiments still provide context?

Expected review rows:

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `age-boundary-4a` | 4 |  | pending |
| `age-boundary-4b` | 4 |  | pending |
| `age-boundary-3a` | 3 |  | pending |
| `age-boundary-3b` | 3 |  | pending |
| `age-boundary-2a` | 2 |  | pending |
| `age-boundary-2b` | 2 |  | pending |

The first live boundary evidence makes this rubric especially important because `age_appropriateness` showed the largest upward judge shift relative to the current architect references.

## Promotion procedure

1. Run the hard-boundary calibration and download/open the generated human-review worksheet.
2. Fill all 18 human scores and decision notes.
3. Update the boundary dataset with accepted human labels.
4. Rewrite and re-review any examples marked `rewrite`.
5. Change `humanReview` to `approved`.
6. Assign the versioned status `human-reviewed-boundary-v1`.
7. Freeze that reviewed dataset version.
8. Rerun the same judge against the human-reviewed boundary set.
9. Compare MAE, within-one rate, signed bias, direction counts, rubric metrics, and score transitions.
10. Keep semantic judging advisory until the documented promotion criteria are satisfied.

## Promotion decision

- Human reviewer: pending
- Review date: pending
- All 18 rows reviewed: no
- Disputed rows resolved: no
- Dataset status after review: `architect-challenge-reference`
- Semantic ranking authority: none

Deterministic continuity, world-consistency and child-safety gates remain authoritative regardless of semantic calibration results.
