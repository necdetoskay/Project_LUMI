# Story Generation Eval Runbook

**Version:** 1.0.0
**Status:** Sprint 12 deliverable (S12-T06)
**Owner:** AI Architecture / Product Quality

## Purpose

Repeatable evaluation of the story generation pipeline against seeded batches,
motif repetition checks, quality gates and regression sets. Eval artifacts are
kept separate from canonical child data.

## Quality Gates

Every candidate intended for child-facing story flow must pass:

| Metric               |                Minimum |
| -------------------- | ---------------------: |
| Child safety         |                5.0 / 5 |
| Coherence            |                4.0 / 5 |
| Originality          |                4.0 / 5 |
| Richness             |                4.0 / 5 |
| Story potential      |                4.0 / 5 |
| Generic penalty      |       2.0 / 5 or lower |
| Repeated motif ratio | 15% or lower per batch |

Safety is a hard gate: unsafe candidates score zero and are rejected before
approval. The pipeline must never surface unsafe output, regardless of the
repair budget.

## Scoring

`src/evals/quality-eval.ts` implements:

- `calculateOriginQuality(score)` — weighted composite with a safety hard gate.
- `passesQualityGates(score)` — boolean gate check.
- `analyzeMotifs(candidates)` — motif frequency, generic-phrase hits and
  repeated-motif detection.
- `repeatedMotifRatio(report)` — repeated-motif ratio per batch.

## Eval Sets

### Seed batch test

For each supported character kind, generate many deterministic seed cases and
produce at least 300 origin candidates in a normal pre-production run
(1,000+ for a model-selection run).

### Motif repetition test

Extract motif labels from `originConcept` and `subtype`, cluster repeated ideas
and flag generic phrases. Overused motifs reduce novelty. Watch for: chosen one,
magic crystal, lost pearl, evil shadow, generic princess, "brave little".

### Regression safety test

`tests/validation/safety-regression.test.ts` verifies that unsafe provider
output never reaches approval and that usage records never expose story text.

### Quality gate eval

`tests/evals/quality-eval.test.ts` verifies the scoring formula, gate logic and
motif analyzer against the fixtures in `tests/evals/fixtures/origin-batches.ts`.

## Commands

```bash
# Unit tests (all layers)
pnpm --filter @lumi/ai test

# Integration tests (destructive; requires DB)
AI_TEST_ENABLE_DESTRUCTIVE=true pnpm --filter @lumi/ai test:int

# Lint + typecheck
pnpm --filter @lumi/ai lint
pnpm --filter @lumi/ai typecheck
```

Future model-comparison commands (planned, per generation-quality-evaluation.md):

```bash
pnpm eval:origin-quality --model <model-id> --count 300
pnpm eval:story-continuation --model <model-id> --count 120
pnpm eval:model-compare --models <a>,<b>
```

## Model Selection Rule

A model cannot become a production default unless it passes the seed batch eval,
schema validation eval, safety regression eval, motif repetition eval, story
continuation eval and a reviewed human sample.
