# Sprint 21 — T03: Memory / CPU Baseline

**Scope:** S21-T03. Records the runtime memory/CPU baseline for the Next.js web
container executing the story session `advance` path, so the S21-T05
performance regression gate has a reference.

## Method

1. Start the web container (standalone build from S20-T02 reproducibility path)
   against a compose stack (`scripts/infra-up.mjs`), pointed at a seeded
   staging DB with synthetic household/session fixtures (no real child data).
2. Run the S21-T01 load harness at three concurrency levels: low (10),
   medium (50), high (150), 60 s each.
3. Sample container `docker stats` every 5 s during each run.
4. Record p50 / p95 / p99 latency + max RSS / CPU%.

## Baseline (reference run — CI, ubuntu-latest)

> These numbers were captured on the S21-T01 scaffold run (synthetic SIDs, no
> real DB). Production-seeded baselines will be re-recorded at RC smoke and
> stored here.

| Concurrency | p95 latency | max RSS | avg CPU% | 5xx | okRate |
| --- | --- | --- | --- | --- | --- |
| 20 | 79 ms | n/a (node env, no container) | n/a | 0 | 1.00 |

## Target ceiling (S21-T05 gate)

| Metric | Threshold |
| --- | --- |
| p95 latency (`advance`) | < 500 ms |
| max container RSS | < 800 MB |
| avg CPU (web) | < 70% at peak concurrency |
| 5xx rate | 0 |

## Recording

Append new rows here after each baseline run, tagged with the RC commit SHA
(image `rev` label). Do **not** delete history — this file is the
reproducibility anchor for the regression gate.

## Notes

- Baseline must be re-measured whenever `packages/story` or the Next.js
  standalone build changes materially.
- Memory ceiling accounts for Next.js serverless → standalone overhead.
