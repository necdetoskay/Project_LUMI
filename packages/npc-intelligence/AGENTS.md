# `packages/npc-intelligence` — DOX Contract

## Purpose

`@lumi/npc-intelligence` implements the NPC decision foundation: perception and
belief access, need/goal evaluation, the Decision Context Vector, candidate
action generation, the utility evaluator, and the deterministic selector. It
also persists explainable decision traces and decision events.

## Ownership

Owned by the NPC Intelligence / Sprint 13 squad. Changes affecting perception
access rules, cross-family isolation, or utility/selection semantics must be
reviewed by the NPC architecture owner.

## Local Contracts

- **Determinism.** The same state + policy + seed must produce the same
  candidates, scores, and selection.
- **Information access.** An NPC can never act on facts it does not perceive or
  hold an active belief about; `personal`-sensitivity facts never enter a
  decision window; cross-family facts/beliefs throw `CrossFamilyAccessError`.
- **No LLM-controlled scoring.** Utility weights are a validated, versioned
  policy; no candidate is ever boosted by an LLM.
- **Safety first.** Parent/safety policy filters candidate kinds and marks
  candidates before selection; blocked candidates are eliminated before
  personality evaluation.
- **Explainable traces.** `sanitizeTrace` strips step data to the `SAFE_STEP_KEYS`
  safelist so private child data never leaks through an exposed trace.
- **Persistence boundary.** Domain and application code depend only on ports
  (`src/ports/*`); the drizzle repository in `src/db/` implements the decision
  store. Traces are queried and isolated by household + npc.

## Work Guidance

- Add new decision inputs as ports and provide in-memory test doubles for them;
  do not call ORMs from domain or application code.
- Keep new candidate templates bounded and deterministic; generate a concrete
  candidate only when the NPC perceives the required fact/character.
- Extend the weight policy only as a new version; never mutate past traces.

## Verification

- `pnpm --filter @lumi/npc-intelligence lint`
- `pnpm --filter @lumi/npc-intelligence typecheck`
- `pnpm --filter @lumi/npc-intelligence test`
- `pnpm --filter @lumi/npc-intelligence test:int` (requires
  `NPC_TEST_ENABLE_DESTRUCTIVE=true` and a reachable PostgreSQL)

Required test coverage includes perception access/cross-family, need/goal
dominance, content-hash determinism, personality-boundary elimination, seeded
tie-break determinism, sanitized traces, and DB round-trip/isolation.

## Child DOX Index

No child packages.
