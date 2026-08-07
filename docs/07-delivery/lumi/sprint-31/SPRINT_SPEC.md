# Sprint 31 — Quest Seed Automation (template → quest)

**Sprint ID:** LUMI-S31
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 25 (interaction generator), Sprint 27 (story hooks), Sprint 28 (quest aggregate), Sprint 29 (quest templates)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `AGENTS.md` (S30 closeout backlog: *`quest_seed` interaction → quest automation (template → quest)*)

## Goal

Automate the `quest_seed` interaction → quest lifecycle: when a child accepts
a `quest_seed` opportunity, the resulting StoryHook (S27) should carry enough
intent for an automation layer to **instantiate a `QuestTemplate` into a
concrete `Quest`** (S28) and **activate** it — deterministically and
idempotently.

Sprints 25–30 built all the primitives: `quest_seed` opportunity generation
(carrying `evidence.factId`), accepted-opportunity → StoryHook conversion,
quest templates, and quest aggregate lifecycle. This sprint closes the gap by
adding the **automation layer**: a deterministic `factId → templateKey`
resolver, an idempotent quest-seed automation service, a new outbox intent so
the story side can signal intent, and seeded templates so instantiation has
definitions to use.

This is additive; no existing behavior changes.

## Principle

- **Quest automation is a committed, idempotent effect**, not a free-form
  write: one accepted `quest_seed` hook produces exactly one activated quest
  (guarded by `world_idempotency_ledger` keyed `quest-seed:<hookId>`).
- **Template selection is deterministic**: `evidence.factId` (from S25) maps
  to a `templateKey` through a seeded registry — no LLM at instantiation time.
- **The story side only signals intent**: a new outbox intent
  (`quest_seed_automation`) is enqueued by `StoryHookService` when a
  `quest_seed` hook is created; the world-side applicator performs the
  instantiation. Story does not import world (package boundary preserved).
- **Automation ≠ accept flow**: this sprint delivers the automation layer +
  tests. The production accept route / inbox persistence / hook wiring is a
  separate backlog item (see Out of Scope).

## Reused Foundation

- `@lumi/world` `instantiateQuestFromTemplate` (S29) + `createQuestInstance`.
- `@lumi/world` `activateQuest` (S28) — quest lifecycle.
- `@lumi/world` `world_idempotency_ledger` (S14 hardening) — idempotency key.
- `@lumi/world` `QuestTemplate` / `QuestTemplateService` (S29) + migration
  `0007_quest_templates.sql` pattern.
- `@lumi/story` `StoryHookService.createHook` (S27) — hook creation + outbox
  enqueue point.
- `@lumi/story` outbox (`story_outbox`, `OUTBOX_INTENT_TYPES`, S23) —
  intent type registry + applicator pattern (`IndirectEffectApplicator`).

## In Scope

- **`QuestSeedTemplateResolver`** (`@lumi/world` domain): deterministic
  `factId → templateKey` mapping from a seeded registry with a stable fallback.
- **`QuestSeedAutomationService`** (`@lumi/world` application): takes an
  accepted quest-seed signal (householdId, worldId, storySessionId, factId,
  sourceHookId), resolves template, instantiates + activates the quest,
  idempotently (ledger `quest-seed:<hookId>`), returns the persisted quest.
- **Story-side outbox intent**: add `quest_seed_automation` to
  `OUTBOX_INTENT_TYPES` (S23 registry) and enqueue it from
  `StoryHookService.createHook` when `hookType === "quest_seed"` (payload:
  hookId, opportunityId, storySessionId, worldId, householdId, factId,
  sourceNpcId).
- **World-side applicator**: `QuestSeedAutomationApplicator` implementing
  `IndirectEffectApplicator` (validates intent + payload, delegates to
  `QuestSeedAutomationService`, idempotent). It lives in `@lumi/world`; the
  composition (web/worker) injects it into `IndirectEffectPropagator` later.
- **Seeded templates**: migration `0008_quest_seed_automation.sql` seeds a
  small set of `quest_templates` + `quest_template_objectives` rows so the
  resolver has definitions to target (and a seed `fact→template` mapping is
  represented in the resolver registry).
- **Tests**: domain resolver tests, service unit tests, guarded integration
  (real DB: instantiate + activate + idempotent re-run), story-side
  `createHook` intent enqueue test, world applicator test.

## Out of Scope

- Production accept route / opportunity inbox persistence / `respond` →
  `createHook` wiring (separate backlog: full accept flow).
- Wiring `IndirectEffectPropagator` into the worker/web production loop.
- Quest rewards, quest log actions, hook → LLM story generation.
- Template authoring UI/versioning.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S31-T01 | `QuestSeedTemplateResolver` (factId → templateKey) + seeded registry | `@lumi/world` domain | unit: resolver |
| S31-T02 | `QuestSeedAutomationService` (instantiate + activate, idempotent) | `@lumi/world` application | unit: service; guarded integration |
| S31-T03 | Story-side `quest_seed_automation` intent + `createHook` enqueue | `@lumi/story` application | unit: story-hook service |
| S31-T04 | `QuestSeedAutomationApplicator` (world-side) + migration `0008` seed | `@lumi/world` application + db | unit: applicator |
| S31-T05 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-31/` | scenario matrix green |

## Requirements

- `QuestSeedTemplateResolver.resolve(factId)` returns a templateKey
  deterministically (same factId → same key across calls) and only from the
  seeded registry; unknown facts fall back to a stable default key.
- `QuestSeedAutomationService.instantiateFromSeed` resolves the template,
  instantiates the quest (inactive), activates it, and records
  `operationType: "quest_seed_automation"`, `idempotencyKey:
  quest-seed:<sourceHookId>` in `world_idempotency_ledger`. Re-running with
  the same `sourceHookId` returns the same quest without duplicating.
- `StoryHookService.createHook` for a `quest_seed` hook enqueues a
  `quest_seed_automation` outbox row atomically with the hook creation.
- The applicator validates intent type + required payload fields, delegates to
  the automation service, and is idempotent per intent key.
- Migration `0008` seeds N>=2 templates with ordered objectives; resolver
  registry references only seeded keys.

## Acceptance Criteria

- [ ] Resolver: deterministic factId → templateKey; unknown fact falls back.
- [ ] Automation service creates + activates a quest from a seeded template.
- [ ] Re-running the same `sourceHookId` is a no-op (same quest, no duplicate).
- [ ] `createHook` for `quest_seed` enqueues the new intent atomically.
- [ ] Applicator validates and applies idempotently.
- [ ] Migration `0008` applies cleanly on top of `0007` and seeds templates.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Package boundary: story must not import world. Story enqueues intent only;
  the applicator (world) is composed externally. Keep the intent payload plain
  JSON.
- Idempotency correctness: the ledger unique index
  `(household_id, world_id, operation_type, idempotency_key)` must be honored;
  `world_id` must be non-null in the seed record.
- Deterministic mapping vs. DB-seeded templates: keep the resolver registry in
  sync with migration `0008` (document the key list).
- Migration ordering: `0008` inserts into tables created by `0007`; verify on
  top of the clean chain.

## Validation

- `pnpm --filter @lumi/world lint | typecheck | test`
- `pnpm --filter @lumi/story lint | typecheck | test`
- Guarded integration behind `WORLD_TEST_ENABLE_DESTRUCTIVE=true` /
  `STORY_TEST_ENABLE_DESTRUCTIVE=true`.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- `pnpm format:check` green.