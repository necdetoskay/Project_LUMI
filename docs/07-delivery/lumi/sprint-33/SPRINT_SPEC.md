# Sprint 33 — Quest Rewards (inventory grant via inventory_transaction outcome reuse)

**Sprint ID:** LUMI-S33
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 28 (Quest Aggregate), Sprint 29 (Quest Templates), Sprint 31 (Quest Seed Automation), profiles inventory service (`acquireItem`, `story_reward` origin)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `AGENTS.md` (S32 closeout backlog: *quest rewards (geliştirme: mevcut `inventory_transaction` outcome ile)*)

## Goal

Grant an **item reward** when a quest is completed. Sprints 28–32 built quest
lifecycle, templates, automation, and the LLM pipeline; the inventory side
(`@lumi/profiles.acquireItem`, `originType: "story"` → `story_reward` transfer
label, idempotency ledger) is ready but **nothing connects quest completion to
an inventory grant**. The story commit pipeline already models
`inventory_transaction` outcomes (`inventory_item_moved` event +
`default-inventory` rule), but no consumer applies them — they are audit data.

This sprint delivers the **reward layer**: authored reward definitions on quest
templates, a deterministic reward planner, a story-side completion trigger, and
a world-side idempotent reward applicator behind an `InventoryGrantPort`. The
real `acquireItem` adapter is composed in web later (same pattern as
`QuestSeedAutomationApplicator`).

## Principle

- **Rewards are authored, deterministic, and idempotent**: a quest template
  declares `{ itemDefinitionKey, quantity }`; completing the quest produces
  exactly one grant (ledger key `quest-reward:<questId>`). Re-applying the
  completion never double-grants.
- **Package-safe**: `@lumi/world` (and `@lumi/story`) never imports
  `@lumi/profiles`. The applicator delegates through an injected
  `InventoryGrantPort`; web wires the real `acquireItem` adapter.
- **Reuses the story outbox**: completion enqueues a `quest_reward_grant`
  intent (S23 outbox, plain-JSON payload) consumed by the world-side
  applicator — matching S31 `quest_seed_automation` conventions.
- **Inventory-transaction semantics preserved**: the grant uses the existing
  inventory model's `story_reward` origin/transfer label; this sprint adds the
  missing reward wiring on top of the existing `inventory_transaction` outcome
  infrastructure.

## Reused Foundation

- `@lumi/world` `QuestTemplate` / `Quest` (S28/S29) — reward fields added.
- `@lumi/world` `QuestChangeApplicator` / `applyQuestChange` (S28) — completion
  detection point.
- `@lumi/story` outbox (`story_outbox`, `OUTBOX_INTENT_TYPES`, S23) +
  `IndirectEffectApplicator` pattern.
- `@lumi/story` `inventory_transaction` outcome / `inventory_item_moved` event /
  `default-inventory` rule (S22) — reuse semantics.
- `@lumi/profiles` `acquireItem` + `inventory_idempotency_ledger` +
  `originType: "story"` (inventory service) — the eventual adapter contract.

## In Scope

- **`QuestTemplateReward`** (`@lumi/world` domain): typed reward definition
  (`itemDefinitionKey`, `quantity`, optional `customProperties`).
- **Reward fields**: `QuestTemplate` + `Quest` state carry an optional
  `reward: QuestTemplateReward | null`; `createTemplate` /
  `instantiateQuestFromTemplate` / `instantiateQuestFromSeed` propagate it.
- **Schema**: migration `0009_quest_rewards.sql` adds a nullable JSONB
  `reward` column to `quest_templates` and `quests` (forward-only, additive).
- **`QuestRewardPlanner`** (`@lumi/world` domain): pure function
  `planQuestReward(quest: QuestState): QuestRewardIntent | null` — returns the
  reward only when `status === "completed"` and a reward is defined.
- **Story outbox intent**: add `quest_reward_grant` to `OUTBOX_INTENT_TYPES`;
  `applyQuestChange` enqueues the intent when it auto-completes a quest
  (payload: householdId, worldId, questId, storySessionId, childProfileId,
  reward, evidenceRef).
- **`QuestRewardApplicator`** (`@lumi/world` application): validates the intent
  + reward payload, delegates through `InventoryGrantPort.grant`, idempotent
  per `quest-reward:<questId>`; composed externally.
- **`InventoryGrantPort`** (`@lumi/world` application): injected boundary
  `grant({ householdId, childProfileId, itemDefinitionKey, quantity,
  idempotencyKey })`. Real adapter = `acquireItem` in web (follow-up).
- **Tests**: domain reward tests, planner tests, applicator tests (fake port),
  quest service/automation reward propagation tests, guarded integration.

## Out of Scope

- Real `acquireItem` web adapter / `InventoryGrantPort` implementation (web
  composition follow-up, one file).
- Multi-item / tiered / conditional rewards (single reward def per quest now).
- Reward UI (child-facing toast/notification in Story Reader).
- Wiring the existing `inventory_transaction` WorldChange into a generic
  inventory applicator (separate concern).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S33-T01 | `QuestTemplateReward` + reward fields on template/quest + migration `0009` | `@lumi/world` domain + db | unit: domain, schema |
| S33-T02 | `QuestRewardPlanner` (pure completed-quest → intent) | `@lumi/world` domain | unit: planner |
| S33-T03 | Story `quest_reward_grant` intent + `applyQuestChange` completion enqueue | `@lumi/story` + `@lumi/world` | unit: story-hook/quest-change; guarded integration |
| S33-T04 | `QuestRewardApplicator` + `InventoryGrantPort` (idempotent, fake port) | `@lumi/world` application | unit: applicator |
| S33-T05 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-33/` | scenario matrix green |

## Requirements

- A quest template may declare at most one reward (`itemDefinitionKey` +
  `quantity >= 1`); zero rewards is allowed.
- `instantiateQuestFromTemplate` / `instantiateQuestFromSeed` copy the reward
  onto the quest instance.
- `QuestRewardPlanner.planQuestReward(quest)` returns the reward only for
  `status === "completed"` quests with a defined reward; otherwise `null`.
- Completing the final objective (auto-complete inside `applyQuestChange`)
  enqueues a `quest_reward_grant` outbox intent with the full reward payload.
- `QuestRewardApplicator` validates intent type + reward, calls
  `InventoryGrantPort.grant` once, and is idempotent per
  `quest-reward:<questId>`.
- The applicator never imports `@lumi/profiles`; grant side effects flow
  through the port.

## Acceptance Criteria

- [ ] Template reward declared and validated (quantity >= 1).
- [ ] Quest instances carry the reward after instantiation.
- [ ] Planner returns a reward only for completed quests.
- [ ] `applyQuestChange` auto-complete enqueues `quest_reward_grant`.
- [ ] Applicator grants via the port once; re-apply is idempotent.
- [ ] `@lumi/world`/`@lumi/story` have no `@lumi/profiles` dependency.
- [ ] Migration `0009` applies on `0008`; all source green.

## Risks

- Completion detection: `applyQuestChange` auto-completes inside
  `progressObjective`; enqueue must happen in the same transaction and only on
  the transition to `completed` (not on every progress).
- Cross-package boundary: story enqueues the intent; world applies it via the
  port. Keep payload plain JSON; the applicator is composed externally.
- Idempotency: reuse the inventory ledger contract via the port's
  `idempotencyKey` (`quest-reward:<questId>`); re-running completion is a
  no-op.
- Migration ordering: `0009` only alters `quest_templates` / `quests` from
  `0006`/`0007`; verify on top of the clean chain.

## Validation

- `pnpm --filter @lumi/world lint | typecheck | test`
- `pnpm --filter @lumi/story lint | typecheck | test`
- Guarded integration behind `WORLD_TEST_ENABLE_DESTRUCTIVE=true` /
  `STORY_TEST_ENABLE_DESTRUCTIVE=true`.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- `pnpm format:check` green.