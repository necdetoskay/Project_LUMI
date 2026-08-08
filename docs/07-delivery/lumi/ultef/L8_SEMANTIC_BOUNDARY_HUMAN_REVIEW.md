# L8 Semantic Boundary Human Review

## Purpose

This checklist is the human-review surface for `L8-SEMANTIC-CALIBRATION-HARD-BOUNDARY-001`.

The proposed scores are architecture/test-design references, not ground truth. The reviewer should change a score whenever an adjacent value feels more accurate. The goal is to create an independently accepted boundary dataset, not to confirm the existing labels.

## Review rules

For each example, read only the rubric and story text first. Decide a 0–5 score before looking at the proposed score when practical. Adjacent disagreement is expected and useful, especially between 2/3 and 3/4.

A dataset may be promoted to `human-reviewed-boundary-v1` only when every row has a human decision and any disputed examples have either been relabeled or rewritten.

## Choice influence

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `choice-boundary-4a` | 4 |  | pending |
| `choice-boundary-4b` | 4 |  | pending |
| `choice-boundary-3a` | 3 |  | pending |
| `choice-boundary-3b` | 3 |  | pending |
| `choice-boundary-2a` | 2 |  | pending |
| `choice-boundary-2b` | 2 |  | pending |

Review question: how much must the earlier Mira choice causally change the next story before the score moves from remembered context (3) to meaningful influence (4)?

## Personality and emotion

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `personality-boundary-4a` | 4 |  | pending |
| `personality-boundary-4b` | 4 |  | pending |
| `personality-boundary-3a` | 3 |  | pending |
| `personality-boundary-3b` | 3 |  | pending |
| `personality-boundary-2a` | 2 |  | pending |
| `personality-boundary-2b` | 2 |  | pending |

Review question: where does shallow reassurance or mild impatience become sufficiently inconsistent with Bora's calm, supportive and cautious characterization to deserve a 2 rather than a 3?

## Age appropriateness

| ID | Proposed | Human | Decision |
| --- | ---: | ---: | --- |
| `age-boundary-4a` | 4 |  | pending |
| `age-boundary-4b` | 4 |  | pending |
| `age-boundary-3a` | 3 |  | pending |
| `age-boundary-3b` | 3 |  | pending |
| `age-boundary-2a` | 2 |  | pending |
| `age-boundary-2b` | 2 |  | pending |

Review question: how much technical vocabulary is acceptable for ages 6–8 when concrete actions and experiments still provide context?

## Promotion decision

- Human reviewer: pending
- Review date: pending
- All 18 rows reviewed: no
- Disputed rows resolved: no
- Dataset status after review: `architect-challenge-reference`
- Semantic ranking authority: none

After review, update the JSON labels to the accepted human scores, change `humanReview` to `approved`, assign a versioned human-reviewed dataset status, and rerun the hard-boundary judge calibration. The deterministic continuity, world-consistency and child-safety gates remain authoritative regardless of semantic calibration results.
