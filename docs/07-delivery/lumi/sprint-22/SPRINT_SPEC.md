# Sprint 22 — Story Outcome & World State Commit System

**Sprint ID:** LUMI-S22
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 20 RC approval gate, Sprint 21 load/perf baseline
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/LUMI_Backlog_Story_Outcome_Commit_System.md`

## Goal

Close the Sprint 10 limitation ("story outcome kayıtları canonical world
state'e commit edilmez") by implementing the **Story Outcome & World State
Commit System**: validated, deterministic application of post-story changes to
the living world, in a single transaction, with full traceability and
idempotency.

## Principle

- The LLM (story generator) produces story text + a structured **outcome
  manifest** with evidence. It never writes world state directly.
- The Commit System validates evidence, applies rules, resolves conflicts, and
  commits verified changes to the world in **one transaction**.
- Reuses the existing `@lumi/simulation` effect/idempotency discipline rather
  than inventing a parallel mechanism.

## Existing Foundation (S14 + S10)

- `@lumi/simulation`: `SimulationEffect` domain, `simulation_effects` +
  `simulation_idempotency_ledger` schemas, `EffectApplicator` (stub
  `commitPending`), absence-policy + relevance bubble.
- `@lumi/story`: `story_outcome_candidates`, `story_committed_choices`,
  `story_event_store`, `story_idempotency_ledger` schemas; `committed-choice`,
  `outcome-candidate` domain models; choice/consequence engine (S10).
- Both packages already enforce household+world isolation and idempotency keys.

## In Scope

- **Story Context Snapshot** — capture pre-story world state for validation.
- **Outcome Manifest** — typed, evidence-carrying story outcome record
  (produced by story engine, consumed by commit system).
- **Narrative Event Extraction** — map manifest entries to world events.
- **Story Evidence Validation** — verify manifest claims against snapshot.
- **Rule Engine** — compute world effects from validated narrative events
  (reuse `@lumi/simulation` EffectRule semantics).
- **Conflict Resolution** — deterministic priority for overlapping effects.
- **Transactional World Commit** — single-transaction application of all
  validated effects (NPC state, memory, relationships, inventory, world flags).
- **Event Sourcing** — commit produces append-only world event records.
- **Rollback & Compensation** — idempotency ledger guards duplicate apply;
  forward-fix compensation for irreparable effects.
- **Effect Propagation** — direct + indirect effect cascades.
- **World Versioning** — world state hash/version bump per commit.

## Out of Scope

- NPC Emergent Interaction Engine (backlog, separate sprint).
- Real LLM generation improvements.
- UI changes for outcome display.
- Altering simulation absence-policy or its effect rules.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S22-T01 | Outcome Manifest domain + Story Context Snapshot | `@lumi/story` | unit: manifest validation, snapshot diff |
| S22-T02 | Narrative Event Extraction + Evidence Validation | `@lumi/story` | unit: extraction, evidence mismatch → reject |
| S22-T03 | World Commit Rule Engine (reuse simulation EffectRule) | `@lumi/story` or new `@lumi/commit` | unit: rule firing, conflict resolution |
| S22-T04 | Transactional World Commit + World Versioning | `@lumi/commit` + DB | integration (destructive-guarded): single-tx, hash bump |
| S22-T05 | Event Sourcing (append-only commit records) + Rollback/Compensation | `@lumi/commit` + DB | integration: duplicate apply idempotent, compensation path |
| S22-T06 | End-to-end: story advance → outcome → committed world change | `apps/web` | regression: story reader advance updates world |
| S22-T07 | Backlog validation test plan execution | `docs/08-backlog/` | full scenario matrix green |

## Requirements

- No direct DB writes from story text; only the Commit System writes world state.
- Every commit carries an idempotency key; retries never double-apply.
- Household + world isolation enforced at every boundary (no cross-tenant).
- World version hash increments per commit; snapshot diff is reproducible.
- No real child data in fixtures/tests.

## Acceptance Criteria

- [ ] A story outcome manifest is validated, rules applied, and world state
      committed in a single transaction.
- [ ] Duplicate commit retry is idempotent (same key → no re-application).
- [ ] Conflict between two effects resolves deterministically.
- [ ] World version hash changes exactly once per commit.
- [ ] Append-only event records trace each committed change to its manifest
      + evidence.
- [ ] All source green: `format:check | lint | typecheck | test | build`.
- [ ] Backlog validation test plan (story-outcome-world-state-validation-test-plan.md)
      scenarios pass.

## Risks

- `@lumi/simulation` effect rules are time-phase bound; story outcomes are
  immediate. Rule Engine must define an "immediate" phase or bypass allowedPhases
  for story commits (documented decision).
- Transactional multi-package writes require a shared DB client/transaction
  strategy; may need a small `@lumi/commit` package or extension of `@lumi/world`.
- World versioning touches existing `@lumi/world` scope — coordinate with
  world package owner.

## Validation

- `pnpm --filter @lumi/story test`, `pnpm --filter @lumi/commit test` (if new package).
- Integration tests behind `*_TEST_ENABLE_DESTRUCTIVE=true` guards.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
