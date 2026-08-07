# Sprint 27 — Accepted Opportunity → Story Hook Conversion

**Sprint ID:** LUMI-S27
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 26 (NPC-to-NPC rumor propagation), Sprint 25 (remaining interaction types), Sprint 16 (Story Reader)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md` (S25 deferred: accepted opportunity → story hook conversion)

## Goal

When a child accepts an NPC interaction opportunity (rumor, gift, invitation,
warning, quest_seed, social_visit, information_share), the system must
convert that acceptance into a **story hook** — a narrative entry point
that feeds into the story generation pipeline. The hook preserves the
opportunity's context (source NPC, target, world state, payload) and is
persisted as a first-class story event.

## Principle

- An accepted opportunity is a **narrative trigger**, not a world-state
  mutation. The hook describes what happened; the story engine decides
  how to narrate it.
- Hooks are **idempotent**: the same opportunity accepted once produces
  exactly one hook. Re-accepting the same opportunity is a no-op.
- Hooks are **household-scoped**: a child can only trigger hooks from
  opportunities in their own household.
- Hooks are **explainable**: every hook carries the full provenance of
  the opportunity that produced it.

## Reused Foundation

- `@lumi/npc-intelligence` `InteractionOpportunity` domain (S24/S25):
  type, source/target, confidence, evidence, delivery status.
- `@lumi/story` `StorySession` (S16): the session the hook feeds into.
- `@lumi/story` `StoryEvent` (S16): hooks are recorded as story events.
- `@lumi/story` `IndirectEffectPropagator` (S23): idempotent outbox
  pattern for hook delivery.
- `@lumi/story` `RumorSpreadApplicator` (S26): rumor-specific hook
  applicator.

## In Scope

- **Story hook domain model**: `StoryHook` (opportunityId, hookType,
  sourceNpcId, targetNpcId, childProfileId, householdId, worldId,
  payload, constraints, createdAt).
- **Hook creation service**: `StoryHookService` — converts an accepted
  `InteractionOpportunity` into a `StoryHook`, validates idempotency,
  persists the hook, and emits a `STORY_HOOK_CREATED` event.
- **Hook-to-scene mapping**: deterministic mapping from hook type to
  story scene type (e.g., `rumor` → `narrative`, `gift` → `choice`,
  `invitation` → `transition`).
- **Hook persistence**: `story_hooks` table with idempotency key
  (`opportunityId`), household-scoped, indexed by session.
- **Hook delivery**: hooks flow through the existing outbox/propagator
  infrastructure (S23) for downstream consumers.
- **Integration with story advance**: when a session advances and a
  pending hook exists, the hook's scene type influences the next
  scene selection.

## Out of Scope

- Story generation (LLM prompt rendering) — hooks are inputs to the
  generator, not the generator itself.
- Child-facing UI for hook display — that's the Story Reader's job
  (S16).
- NPC-to-NPC rumor propagation chains (S26, done).
- Quest aggregate (separate follow-up).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S27-T01 | `StoryHook` domain model + `StoryHookService` | `@lumi/story` domain + application | unit: domain model, unit: service |
| S27-T02 | Hook-to-scene mapping + persistence schema | `@lumi/story` | unit: mapping, migration |
| S27-T03 | Idempotency guard (same opportunity → one hook) | `@lumi/story` | unit: idempotency |
| S27-T04 | `STORY_HOOK_CREATED` event + outbox integration | `@lumi/story` | unit: event, guarded integration |
| S27-T05 | Hook delivery via existing propagator | `@lumi/story` | guarded integration |
| S27-T06 | Hook influence on scene selection during advance | `@lumi/story` | unit: mapping, guarded integration |
| S27-T07 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-27/` | scenario matrix green |

## Requirements

- A child accepting an opportunity triggers exactly one story hook.
- The hook carries the full opportunity context (type, source, target,
  evidence, payload).
- Hooks are household-scoped; cross-household hooks are forbidden.
- Idempotency: same opportunityId accepted twice produces one hook.
- Hooks do not mutate canonical world state (S26-T06 safety boundary).
- No real child data in fixtures/tests.

## Acceptance Criteria

- [ ] Accepting a rumor opportunity creates a `StoryHook` with
  `hookType: "rumor"` and the rumor's claim as payload.
- [ ] Accepting a gift opportunity creates a `StoryHook` with
  `hookType: "gift"` and itemId in payload.
- [ ] Accepting an invitation opportunity creates a `StoryHook` with
  `hookType: "invitation"` and target location in payload.
- [ ] Re-accepting the same opportunity is a no-op (idempotency).
- [ ] Hooks from different households are rejected.
- [ ] `STORY_HOOK_CREATED` event is emitted on creation.
- [ ] Hook-to-scene mapping is deterministic and type-independent.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Hook-to-scene mapping may need refinement as story types evolve;
  keep mapping versioned and additive.
- Idempotency key collision with existing outbox events — use
  `opportunityId` as the key, distinct from outbox `idempotencyKey`.
- Hook persistence adds a new table migration — keep schema forward-
  only.

## Validation

- `pnpm --filter @lumi/story lint | typecheck | test`
- Integration behind `STORY_TEST_ENABLE_DESTRUCTIVE=true` guard.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.