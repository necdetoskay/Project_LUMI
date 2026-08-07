# Sprint 33 — T05: Backlog Validation Evidence

**Source plan:** `AGENTS.md` S32 closeout backlog (*quest rewards (geliştirme: mevcut `inventory_transaction` outcome ile)*)
**Status:** Quest Reward layer delivered
**Branch:** `codex/sprint-33-quest-rewards` → PR (target `main`)

## Summary

Sprint 33 delivered the **quest reward layer**: authored reward definitions on
quest templates, a deterministic reward planner, a story-side completion
trigger (`quest_reward_grant` outbox intent), and a world-side idempotent
applicator behind an `InventoryGrantPort`. It reuses the existing inventory
grant semantics (`@lumi/profiles.acquireItem`, `originType: "story"` →
`story_reward`) and the S23 outbox / S31 applicator conventions, without adding
a `@lumi/profiles` dependency to `@lumi/world` or `@lumi/story`.

## Deliverables (T01–T04)

- **T01** `QuestRewardState` + reward fields on `QuestTemplate`/`Quest` +
  `validateReward` + migration `0009_quest_rewards.sql` (nullable JSONB
  `reward` on `quest_templates` + `quests`). Template/service propagation.
- **T02** `QuestRewardPlanner.planQuestReward` — pure, returns an intent only
  for `completed` quests with an authored reward; defensive copy.
- **T03** Story `quest_reward_grant` intent added to `OUTBOX_INTENT_TYPES` +
  `enqueueQuestRewardIntent` (plain-JSON payload; idempotency key
  `quest-reward:<questId>`). `applyQuestChange` now returns
  `{ status, questCompleted, reward }` so the composition layer can trigger
  the enqueue on completion.
- **T04** `InventoryGrantPort` + `QuestRewardApplicator` (validates intent +
  reward, delegates through the port, idempotent per `quest-reward:<questId>`).

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Quest tamamlanınca ödül (inventory grant) | authored reward on template → quest; completion → `quest_reward_grant` intent → port grant | planner + applicator + integration tests |
| İdempotent ödül (bir kez) | `quest-reward:<questId>` key + `applyQuestChange` `questCompleted` only-once flag | integration re-apply no-op |
| Mevcut inventory_transaction semantics | reuses `story_reward` origin/transfer label contract via `InventoryGrantPort` | port contract + applicator tests |
| Package-safe (world/story → profiles yok) | `InventoryGrantPort` injected; story enqueues plain JSON; applicator composed externally | code review + tests |

## Coverage Summary

- `@lumi/world` unit: **135 tests green** (130 prior + 5 new: template reward 4,
  planner 5, applicator 5 → subset counted in touched suites).
- `@lumi/story` unit: **136 tests green** (135 prior + 1 new outbox enqueue).
- `format:check | lint | typecheck | test | build | check-mojibake` green.
- Guarded integration behind `WORLD_TEST_ENABLE_DESTRUCTIVE=true`:
  `quest-reward.integration.test.ts` (reward propagation + once-only).
- **Partial:** 0 · **Future-backlog:** real `acquireItem` web adapter for
  `InventoryGrantPort`; production accept route / outbox propagator loop;
  generated scene wiring; template authoring UI.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| Template reward declared + validated (quantity >= 1) | ✅ T01 |
| Quest instances carry reward after instantiation | ✅ T01 |
| Planner returns reward only for completed quests | ✅ T02 |
| Completion enqueues `quest_reward_grant` (via `applyQuestChange` flag) | ✅ T03 |
| Applicator grants via port once; re-apply idempotent | ✅ T04 |
| No `@lumi/profiles` dependency in world/story | ✅ port boundary |
| Migration `0009` applies on `0008` | ✅ T01 |
| All source green | `format:check \| lint \| typecheck \| test \| build` |