# Sprint 31 — T05: Backlog Validation Evidence

**Source plan:** `AGENTS.md` Sprint 30 closeout backlog (*`quest_seed` interaction → quest automation (template → quest)*)
**Status:** Quest Seed Automation delivered
**Branch:** `codex/sprint-31-quest-seed-automation` → PR (target `main`)

## Summary

Sprint 31 delivered the **automation layer** that turns an accepted `quest_seed`
interaction into a real, activated `Quest`. Sprints 25–30 built every primitive
(quest_seed opportunity carrying `evidence.factId`; accepted-opportunity →
StoryHook; quest templates; quest aggregate lifecycle); this sprint closed the
gap with a deterministic resolver, an idempotent automation service, a story-side
outbox signal, and a world-side applicator — all additive and package-safe
(`@lumi/story` never imports `@lumi/world`).

## Deliverables (T01–T04)

- **T01** `QuestSeedTemplateResolver` (`@lumi/world` domain) — deterministic
  `factId → templateKey` from a seeded registry (`lost-letter-quest`,
  `bridge-repair-quest`) with a stable default fallback;
  `assertKnownQuestSeedTemplateKey` guard. 6 unit tests.
- **T02** `QuestSeedAutomationService.instantiateQuestFromSeed` (`@lumi/world`
  application) — resolves template, instantiates + activates the quest,
  records `world_idempotency_ledger` (`operationType: quest_seed_automation`,
  key `quest-seed:<sourceHookId>`); re-run returns the same quest. 4 service
  unit tests + guarded integration.
- **T03** Story-side `quest_seed_automation` intent — added to
  `OUTBOX_INTENT_TYPES`; `StoryHookService.createHook` enqueues it atomically
  for `quest_seed` hooks (payload: hookId, opportunityId, storySessionId,
  worldId, householdId, factId, sourceNpcId). 3 new story-hook service tests.
- **T04** `QuestSeedAutomationApplicator` (`@lumi/world`) — validates the
  intent + payload, delegates to `instantiateQuestFromSeed`, idempotent;
  composed externally into the story propagator. 4 applicator tests. Migration
  `0008_quest_seed_automation.sql` seeds the registry templates + objectives.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| quest_seed → quest automation (template → quest) | Resolver + automation service instantiate + activate from an authored template | `quest-seed-template-resolver.test.ts` + `quest-seed-automation.service.test.ts` + guarded integration |
| Deterministic template selection | factId → templateKey (seeded registry, stable default, no LLM) | resolver tests (determinism, fallback) |
| Idempotency (one accepted hook → one quest) | `world_idempotency_ledger` keyed `quest-seed:<sourceHookId>` | service re-run test + guarded integration |
| Package boundary (story does not import world) | story enqueues plain-JSON `quest_seed_automation` intent only; applicator lives in world, composed externally | `story-hook.service.test.ts` (intent payload) + applicator tests |
| Seeded authored templates | migration `0008` seeds `lost-letter-quest` + `bridge-repair-quest` | migration file; registry sync test |

## Coverage Summary

- `@lumi/world` unit: **130 tests green** (116 prior + 14 new).
- `@lumi/story` unit: **115 tests green** (112 prior + 3 new).
- `format:check | lint | typecheck | test | build | check-mojibake` green.
- Guarded integration behind `WORLD_TEST_ENABLE_DESTRUCTIVE=true`:
  `quest-seed-automation.integration.test.ts`.
- **Partial:** 0 · **Future-backlog:** production accept route / opportunity
  inbox persistence / `respond`→`createHook` wiring; worker/web outbox
  propagator loop; quest rewards; hook → LLM story generation.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| Resolver deterministic; unknown fact falls back | ✅ T01 |
| Service creates + activates a quest from a seeded template | ✅ T02 |
| Re-run same `sourceHookId` is a no-op (no duplicate) | ✅ T02 + integration |
| `createHook` enqueues `quest_seed_automation` for quest_seed hooks | ✅ T03 |
| Applicator validates + applies idempotently | ✅ T04 |
| Migration `0008` seeds templates; applies on `0007` | ✅ T04 |
| All source green | `format:check \| lint \| typecheck \| test \| build` |