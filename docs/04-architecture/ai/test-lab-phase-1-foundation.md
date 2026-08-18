# LUMI Test Lab — Phase 1 Foundation

Status: implemented in PR #301
Date: 2026-08-18
Parent: #291
Phase issue: #292

## Repository audit

Phase 1 is implemented inside `@lumi/ai` rather than as a new workspace package.

Existing production boundaries identified for later adapters:

- text generation gateway: `apps/web/lib/ai/text-generation`;
- Prompt Registry and validation: `packages/prompts` plus `apps/web/lib/prompts` adapters;
- Context Assembly: `packages/context`;
- canonical onboarding/foundation commits: `apps/web/lib/character-onboarding`;
- AI usage/cost persistence: `packages/ai/src/usage` and `ai.generation_usage`;
- story/world/NPC owners remain in their existing packages and are not duplicated by Test Lab.

Test Lab therefore acts as experiment orchestration, not as a second generation or state engine.

## Implemented module boundary

```text
packages/ai/src/test-lab/
  domain/
  application/
  ports/
  infrastructure/
```

Public package export: `@lumi/ai/test-lab`.

## State-selection invariant

The implementation enforces:

```text
Generate many candidates
  -> candidate states remain isolated
  -> select exactly one candidate for a branch/phase
  -> only selected state may parent the next phase
```

Changing an earlier selection does not overwrite the existing selection. It requires a new branch, preserving old downstream runs and state history.

## Persistence decisions

Phase 1 introduces these PostgreSQL tables in the existing `ai` schema:

- `test_lab_sessions`;
- `test_lab_branches`;
- `test_lab_state_snapshots`;
- `test_lab_runs`;
- `test_lab_selections`.

The database enforces exactly one selection per `(session_id, branch_id, phase_id)` with a unique constraint. Service and in-memory repository behavior enforce the same rule.

`test_lab_sessions.active_branch_id` is intentionally a navigation pointer rather than canonical history. Canonical history lives in append-only branch, run, state and selection records.

## State diff

Each candidate can be compared with its parent through the normalized `StateDiff` contract, currently separating top-level keys into:

- added;
- removed;
- changed.

The contract can later be extended with domain-aware nested diffs without changing the selection invariant.

## Verification

Phase 1 includes:

- deterministic in-memory tests for candidate isolation;
- selected-state propagation proof;
- branch preservation proof on reselection;
- state diff unit test;
- opt-in destructive PostgreSQL integration test;
- direct database proof that a second selection for the same branch/phase is rejected.

## Deferred to later phases

Phase 1 does not implement:

- OpenRouter model profiles/pricing (#293);
- production onboarding adapters (#294);
- Prompt Workspace (#295);
- stateful Story Lab (#296);
- evaluator/judge engine (#297);
- Prompt Optimizer (#298);
- Automated Journey (#300);
- production promotion/full Settings UX (#299).
