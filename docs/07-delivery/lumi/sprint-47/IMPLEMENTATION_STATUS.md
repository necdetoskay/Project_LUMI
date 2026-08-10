# Sprint 47 — Implementation Status

Status: COMPLETE

## Completed production slice

- Added bounded canonical-memory influence to deterministic NPC utility scoring.
- Kept memory downstream of caller/domain candidate generation; memory cannot invent executable actions.
- Preserved existing safety and personality elimination in `DecisionSelector`.
- Added explicit structured decision provenance tags instead of interpreting free-form memory summaries.
- Applied lifecycle-aware effective memory salience and confidence to bounded memory influence.
- Added exact household + world + child profile + NPC scope for decision-memory retrieval.
- Added canonical `MemoryAwareDecisionService` as the single application seam for base utility, scoped memory evidence, bounded adjustment and deterministic selection.
- Added unit coverage for no-memory/relevant-memory/forbidden-candidate/safety/determinism behavior.
- Added DB-backed `PX-LUMI-S47-MEMORY-NPC-DECISION-001` ULTEF L9 evidence proving exact-profile isolation and deterministic replay.
- Added dedicated `ULTEF S47 Memory NPC Decision` CI gate.

## Final merge evidence

Verified on PR #61 final head `a3ef3ed7a96d049ce14bfb0f07ddbf34c134bb31` before merge:

- CI validate: PASS
- Build Artifact: PASS
- ULTEF Integration: PASS
- Security Scan: PASS
- ULTEF S47 Memory NPC Decision: PASS
- ULTEF S44 Memory Production: PASS
- ULTEF S45 Memory Lifecycle: PASS
- ULTEF S46 Memory Story Production: PASS
- PX-LUMI and relevant PX regression gates: PASS

PR #61 merged to `main` as `81f46fe97cdf26f0ddbca0ae839c44c3e9ccff34`.

## Explicit follow-up

The background worker still uses `EmptyNpcSourceAdapter`; the repository does not yet expose a canonical production NPC snapshot persistence/source suitable for replacing it safely. Do not fabricate snapshots. The next production sprint should establish canonical NPC snapshot persistence/source and then wire the worker through the single `MemoryAwareDecisionService` seam with replay-safe decision commit evidence.
