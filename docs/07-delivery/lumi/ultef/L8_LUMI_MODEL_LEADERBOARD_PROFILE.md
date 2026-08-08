# L8 LUMI Model Leaderboard Profile

## Purpose

This profile defines the first controlled production-style LUMI model leaderboard. It compares candidate story-generation models under the same six-scenario L8 pack, repeated execution, deterministic hard gates, calibrated semantic judging, latency, and token-efficiency measurements.

The leaderboard is evidence for model selection; it does not weaken any deterministic continuity, world-consistency, or child-safety gate.

## Candidate models

The first canonical comparison uses:

- `openai/gpt-4.1-mini`
- `google/gemini-2.5-flash`
- `anthropic/claude-3.5-haiku`

These candidates represent three independent provider families and are all suitable for relatively low-latency interactive generation workloads.

## Execution profile

- Models: 3
- Repeats per model: 3
- L8 scenarios per repeat: 6
- Story provider calls: 54
- Semantic judge: enabled
- Semantic judge calls: 9
- Judge model: `openai/gpt-4.1-mini`
- Calibration set: `human-reviewed-boundary-v1`
- Calibration repeats: 3
- Calibration provider calls: 3
- Planned total provider calls: 66

## Ranking authority

A model is ranking-eligible only when its deterministic L8 stability gate passes in at least two thirds of repeats.

Semantic ranking weight is enabled only when the same benchmark job also proves:

1. human-reviewed calibration truth is present;
2. calibration thresholds pass;
3. repeated semantic-judge stability passes;
4. usable semantic samples exist for the candidate model.

When all conditions hold, the bounded 100-point ranking is:

- deterministic quality: 60 points;
- calibrated semantic quality: 10 points;
- latency: 15 points;
- token efficiency: 15 points.

A deterministic hard-gate failure always remains ineligible and receives no rescuing semantic authority.

## Evidence to retain

The benchmark must retain:

- per-repeat L8 scenario evidence;
- model pass rate and worst-run quality;
- mean and standard deviation for latency and token usage;
- semantic mean and standard deviation;
- calibration MAE, signed bias, and stability statistics;
- final bounded score and winner;
- raw generated narratives for qualitative inspection.

## Cost isolation

This leaderboard is an explicit paid evaluation and must never run on ordinary pull-request CI. After the one-shot benchmark completes, any temporary automatic trigger used to execute it must be removed. The reusable manual `ULTEF Live Provider Evaluation` workflow remains the canonical long-term entry point.
