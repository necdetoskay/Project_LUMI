# `packages/context` — DOX Contract

## Purpose

`@lumi/context` builds deterministic, budgeted, policy-safe narrative context
for LUMI story generation. It selects and packages relevant context from
safety policy, parent policy, working story, emotional state, long-term memory,
knowledge, world state, and origin packages — without generating story text or
calling ORMs.

## Ownership

Owned by the Narrative Engine / Sprint 11 squad. Changes affecting context
priority, token budget semantics, or safety precedence must be reviewed by the
narrative architecture owner.

## Local Contracts

- **No database dependencies.** Adapters delegate to existing services; this
  package only defines ports and provides in-memory test doubles.
- **Determinism.** Same `ContextRequest` + same source snapshots + same
  `TokenBudget` must produce the same `ContextManifest.contentHash`.
- **Safety precedence.** `PolicyGuard` ensures a parent policy can never loosen
  the safety baseline.
- **Budget priority.** Sections are packed in fixed priority order:
  Safety → Parent Policy → Working Story → Emotional State → Long-Term Memory
  → Knowledge → World → Origin Package. Lower-priority items are truncated
  first when budgets are tight.
- **No raw state.** Numeric state and raw engine outputs are translated into
  narrative guidance before inclusion.

## Work Guidance

- Add new context sources as ports in `src/ports/context-sources.ts` and provide
  an in-memory adapter under `src/adapters/`.
- Keep item `text` deterministic and stable; it feeds the token estimator and
  content hash.
- Extend `TokenBudget` only when a new source has a dedicated cap; otherwise use
  the lowest appropriate existing bucket.
- Use `zod` schemas for request and budget validation in `ContextBuilder`.

## Verification

- `pnpm --filter @lumi/context lint`
- `pnpm --filter @lumi/context typecheck`
- `pnpm --filter @lumi/context test`

Required test coverage includes determinism, budget overflow, priority order,
missing/failing sources, and safety override behavior.

## Child DOX Index

No child packages.
