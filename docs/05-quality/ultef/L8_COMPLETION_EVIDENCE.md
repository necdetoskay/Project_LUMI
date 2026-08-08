# L8 Completion Evidence and Exit Criteria

Status: CLOSED
Scope: Project LUMI ULTEF L8 — semantic quality, live model evaluation, calibrated judging, and model-selection evidence

## Purpose

This document is the canonical closure checklist for L8. L8 is not considered closed merely because a live LLM returned plausible stories. Closure requires deterministic story constraints, human-reviewed semantic truth, calibrated and stable semantic judging, repeated live-provider comparison, and an explicit production model-selection policy.

## Exit criteria

### 1. Deterministic L8 scenario pack

PASS criteria:

- continuity recall is verified,
- prior child choice influence is verified,
- canonical world boundaries are preserved,
- NPC personality/emotion behavior is preserved,
- prose remains appropriate for the target child age band,
- adversarial secrecy/isolation prompts are safely redirected.

Status: PASS.

The scenario evaluator has dedicated self-tests and includes regression fixtures derived from real Turkish live-model outputs. These fixtures specifically protect against false negatives caused by Turkish morphology and natural phrasing such as explicit lack-of-knowledge statements and safe adult-seeking behavior.

### 2. Real story generation rather than mock-only evaluation

PASS criteria:

- live provider calls generate real scenario narratives,
- the same deterministic scenario pack evaluates those outputs,
- raw narratives are retained in evidence for qualitative inspection.

Status: PASS.

Corrected live leaderboard evidence was produced by GitHub Actions run `31273334869`.

### 3. Human-reviewed semantic reference set

PASS criteria:

- semantic boundary examples exist,
- reference labels are independently human-reviewed,
- fractional human scores are preserved rather than rounded,
- review completeness is machine-readable.

Status: PASS.

The canonical dataset contains 18/18 completed human reviews across age appropriateness, personality/emotion consistency, and choice influence.

### 4. Semantic judge calibration

PASS criteria:

- judge is evaluated against the human-reviewed boundary dataset,
- MAE is within the accepted threshold,
- ±1 agreement is within threshold,
- rubric-level errors are within threshold,
- systematic bias is measured and retained.

Status: PASS.

Observed human-grounded calibration for `openai/gpt-4.1-mini` judge:

- MAE: `0.639`,
- within ±1: `100%`,
- signed mean bias: `+0.639`,
- choice-influence MAE: `0.833`,
- personality/emotion MAE: `0.500`,
- age-appropriateness MAE: `0.583`.

The positive bias is treated as a known judge characteristic, not ignored.

### 5. Semantic judge stability

PASS criteria:

- calibration is repeated independently,
- at least two thirds of repeats pass,
- MAE and bias variance remain inside stability thresholds,
- rubric means remain inside accepted bounds.

Status: PASS.

Three repeated live calibrations produced the same observed metrics:

- pass rate: `3/3`,
- MAE mean: `0.639`,
- MAE standard deviation: `0`,
- bias mean: `+0.639`,
- bias standard deviation: `0`,
- within ±1: `100%`.

Judge trust status: `trusted-for-advisory-stable`.

### 6. Semantic authority is bounded by deterministic gates

PASS criteria:

- semantic scoring cannot rescue a deterministic hard-gate failure,
- safety/world/continuity gates remain authoritative,
- semantic ranking weight is disabled when human review, calibration, stability, or usable semantic samples are missing.

Status: PASS.

Bounded production-style score:

- deterministic quality: 60 points,
- calibrated semantic quality: 10 points,
- latency: 15 points,
- token efficiency: 15 points.

### 7. Performance score has useful resolution

PASS criteria:

- realistic candidate models do not all saturate latency/token points,
- fixed scoring boundaries are covered by self-tests,
- speed and token trade-offs can affect ranking without overriding hard gates.

Status: PASS.

Current fixed profile:

- latency full-score / zero-score region: 1500 ms / 6000 ms,
- token full-score / zero-score region: 300 / 900 mean tokens per scenario.

### 8. Corrected multi-model live leaderboard

PASS criteria:

- at least three provider-family candidates are evaluated,
- each candidate runs three repeated six-scenario packs,
- hard-gate stability is measured,
- calibrated semantic judging is enabled,
- latency and token use are measured,
- endpoint failures are treated as ineligibility rather than silently ignored.

Status: PASS.

Canonical corrected leaderboard run: `31273334869`.

Observed bounded ranking:

| Rank | Model | Score | Hard-gate repeats | Semantic | Mean latency | Mean tokens |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| 1 | `openai/gpt-4.1-mini` | 92.20 | 3/3 PASS | 100.00% | 2905 ms | 425 |
| 2 | `google/gemini-2.5-flash` | 91.95 | 3/3 PASS | 97.78% | 2441 ms | 488 |
| 3 | `anthropic/claude-haiku-4.5` | 74.73 | 3/3 PASS | 97.78% | 5583 ms | 758 |

The GPT-4.1 Mini vs Gemini gap is only 0.25 points and is explicitly treated as a practical tie rather than decisive superiority.

### 9. Champion / Challenger policy

PASS criteria:

- production selection is not permanently tied to one model,
- promotion/demotion rules are explicit,
- practical ties do not trigger unnecessary model churn,
- fallback does not bypass downstream validation,
- re-evaluation triggers are documented.

Status: PASS.

Current roles:

- Champion: `openai/gpt-4.1-mini`,
- primary Challenger / preferred low-latency fallback: `google/gemini-2.5-flash`,
- secondary Challenger: `anthropic/claude-haiku-4.5`.

Canonical policy: `docs/05-quality/ultef/L8_MODEL_SELECTION_POLICY.md`.

### 10. Cost isolation

PASS criteria:

- paid live-provider evaluation does not run in ordinary PR CI,
- one-shot paid probes are removed after evidence collection,
- ordinary ULTEF regression remains provider-cost-free.

Status: PASS.

The normal `.github/workflows/ultef-integration.yml` contains only provider-cost-free regression/integration steps after the corrected live benchmark was collected.

### 11. Repository regression health

Required closure state:

- Security Scan: PASS,
- ULTEF Integration: PASS,
- CI: PASS.

Closure head `9657073d9397acf74cf557b575a13a2f41128979` on 2026-08-08:

- Security Scan #456: PASS,
- ULTEF Integration #279: PASS,
- CI #512: PASS.

Status: PASS.

## Invalidated historical evidence

The first three-model attempt using `anthropic/claude-3.5-haiku` must not be used for model-quality decisions because:

1. the Haiku endpoint was unavailable in that run, and
2. the then-current deterministic evaluator produced false negatives on valid Turkish world-boundary and child-safety responses.

Those defects were corrected and protected by regression tests before the canonical corrected leaderboard run.

## L8 closure decision

**L8 is CLOSED.**

All functional, evidence, calibration, stability, model-selection, cost-isolation, security, integration, and CI closure gates are satisfied. No paid live-provider probe remains in ordinary PR CI.

## Deferred beyond L8

The following are intentionally not L8 blockers and should continue in later ULTEF levels / production-readiness work:

- broader long-horizon/end-to-end production simulation,
- production traffic reliability/SLO measurement,
- periodic champion/challenger re-benchmarking,
- additional human-review samples as the story domain grows,
- price-aware routing and provider-reliability routing,
- production incident feedback loops,
- larger adversarial/red-team packs.
