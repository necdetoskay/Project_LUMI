# LUMI Long-Horizon Evidence

This directory is the stable index for persistent live Playwright acceptance evidence from issue #233.

## Evidence format

The current evidence format is **v1**. Every live run writes to its own immutable child directory named by `LUMI_LONG_HORIZON_RUN_ID`; if no run id is supplied, the runner generates one from child age, RNG seed, and timestamp. `run.json` is created with exclusive-create semantics, so an existing run id is never silently reused or overwritten.

Generated run directories are intentionally not committed to Git. GitHub Actions uploads them as retained workflow artifacts, while this README remains the versioned comparison/index contract.

## Required v1 run files

A completed reference run is expected to contain:

- `00-run-summary.md`
- `01-child-profile.md`
- `02-character-foundation.md`
- `03-story-01.md`
- `04-story-02.md`
- `05-story-03.md`
- `06-story-04-item.md`
- `07-story-05-item.md`
- `08-story-06-rumor.md`
- `09-story-07-rumor.md`
- `10-final-world-state.md`
- `11-final-character-state.md`
- `12-final-inventory-bag.md`
- `13-final-npc-state.md`
- `14-final-relationships.md`
- `15-statistics.md`
- `run.json`

Failure or prerequisite-stop runs may contain only the files reached before the stop plus `00-run-summary.md` and `run.json`. Partial evidence is deliberate: expensive live runs must remain diagnosable even when they stop early.

## Comparison contract

The same pack is reusable for exact child ages 4, 5, 6, and 7. Compare runs by observable product outcomes rather than exact generated prose:

- onboarding selections and final character foundation;
- seven-story source distribution and rendered character lengths;
- per-story generation/start duration;
- completed-story persistence and visible player recap;
- final world status, current region/location, and home when exposed by UI;
- final inventory/bag summary;
- visible NPC count and strongest/weakest relationship values;
- continuity findings;
- Context Inspector/token/provider-cost metrics only when the product UI exposes them.

Do **not** compare generated story sentences for deterministic equality. The live model is intentionally generative.

## Persistence and privacy

These runs create real persistent application state and do not clean it up. The live workflow is manual-only and requires explicit acknowledgement because it may incur model cost.

The Playwright live config does not retain trace, video, or screenshot diagnostics. Evidence files are deliberately curated and must never contain the parent password, authentication cookies, tokens, or direct provider credentials.

## Reference-run index

Reference runs should be linked from issue #233 and listed here only after the corresponding live artifact has completed successfully.

| Child age | Run id | Evidence artifact | Status |
| --- | --- | --- | --- |
| 6 | _pending first reference run_ | _not run yet_ | pending explicit live-run authorization |
