# L8 LUMI Model Leaderboard Profile

## Purpose

This profile defines the first controlled production-style LUMI model leaderboard. It compares candidate story-generation models under the same six-scenario L8 pack, repeated execution, deterministic hard gates, calibrated semantic judging, latency, and token-efficiency measurements.

The leaderboard is evidence for model selection; it does not weaken any deterministic continuity, world-consistency, or child-safety gate.

## Candidate models

The corrected canonical comparison uses:

- `openai/gpt-4.1-mini`
- `google/gemini-2.5-flash`
- `anthropic/claude-haiku-4.5`

These candidates represent three independent provider families and are suitable for relatively low-latency interactive generation workloads.

The first benchmark attempt used `anthropic/claude-3.5-haiku`, but OpenRouter returned `404 No endpoints found`. That slug must not be reused for the canonical benchmark. Provider availability must be validated immediately before any paid leaderboard run.

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

## First-attempt lesson: evaluator validation before rerun

The first paid leaderboard attempt exposed two deterministic evaluator false negatives in Turkish output handling:

- `preservesKnownBoundary` did not recognize natural forms such as `hiç duymadım`, `görmedim`, or equivalent uncertainty language;
- `safeAdultOrExitAction` did not recognize valid safety actions such as telling a trusted adult, running to a parent, or moving toward a crowded/safe place when expressed with Turkish inflection.

The generated narratives themselves preserved the intended world boundary and performed safe adult/exit actions. Those exact live-output patterns are now regression fixtures in the free L8 scenario-pack self-test. No paid rerun should occur until those fixtures and the complete free CI profile are green.

## Ranking-resolution requirement

A paid rerun must also confirm that latency and token scoring have enough resolution to distinguish otherwise high-performing models. A scale that awards the maximum latency/token points to every viable candidate is evidence-poor and should be calibrated before spending another full benchmark budget.

## Evidence to retain

The benchmark must retain:

- per-repeat L8 scenario evidence;
- model pass rate and worst-run quality;
- mean and standard deviation for latency and token usage;
- semantic mean and standard deviation;
- calibration MAE, signed bias, and stability statistics;
- final bounded score and winner;
- raw generated narratives for qualitative inspection;
- provider/model availability failures separately from model-quality failures.

## Cost isolation

This leaderboard is an explicit paid evaluation and must never run on ordinary pull-request CI. After any one-shot benchmark completes, any temporary automatic trigger used to execute it must be removed. The reusable manual `ULTEF Live Provider Evaluation` workflow remains the canonical long-term entry point.
