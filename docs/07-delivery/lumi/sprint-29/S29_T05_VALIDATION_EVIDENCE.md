# Sprint 29 — T05: Backlog Validation Evidence

**Source plan:** `AGENTS.md` Sprint 28 closeout backlog (*quest templates (authored quest definitions)*) + `docs/08-backlog/LUMI_Backlog_Story_Outcome_Commit_System.md`
**Status:** Quest Templates delivered
**Branch:** `codex/sprint-29-quest-templates` → PR (target `main`)

## Summary

Sprint 29 added the **design-time quest definition layer** on top of the S28
Quest aggregate. A `QuestTemplate` is an authored, versioned quest *definition*
(stable `templateKey`, display content, ordered objective definitions); it is
definition-time only and is instantiated into a concrete `Quest` (bound to
household / world / optional session) via an additive `instantiateQuestFromTemplate`
bridge. No quest *instance* semantics changed — runtime state/status/versioning
stays entirely in the S28 `Quest` aggregate.

This closes the first open backlog step from S28 closeout and keeps the S28
schema additive so authored definitions layer cleanly onto instances.

## Backlog Required Validation (mapped)

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Authored quest definitions (templates) | `QuestTemplate` domain aggregate: keyed, N>=1 ordered objective defs; key/objective-key validation; additive-only (create + read) | `quest-template.test.ts` (7) — no-objectives reject, invalid keys, round-trip, defensive copy |
| Template persistence (definition-time, not household-scoped) | `quest_templates` + `quest_template_objectives` Drizzle schema + unique `template_key` + forward-only migration `0007_quest_templates.sql` | migration file + schema types |
| Reusable definition -> instance production | `createQuestTemplate` / `getQuestTemplateByKey` / `listQuestTemplates` | `quest-template.service.test.ts` (create/read/list/missing) |
| Duplicate authored template rejected | domain + service duplicate `templateKey` guard (`QUEST_TEMPLATE_KEY_EXISTS`) | `quest-template.service.test.ts` + guarded integration |
| Instantiate template -> Quest via existing S28 path | `instantiateQuestFromTemplate` maps template objectives -> `Quest.create`, persists through `QuestService`/`QuestRepository` (unchanged) | `quest-template.service.test.ts` + guarded `quest-template.integration.test.ts` |
| Definition-only (no runtime status in template layer) | Template objective defs carry key + title only; all status/lifecycle lives in `Quest` | schema/domain shape + tests |

## Deliverables (T01–T04)

- **T01** `QuestTemplate` domain aggregate + `CreateQuestTemplateInput`,
  objective definitions, `validateTemplateKey` / `validateObjectiveKey`:
  `@lumi/world` `domain/quest-template.ts` + `domain/world-types.ts` +
  `domain/validation.ts` — 7 unit tests.
- **T02** Template persistence: `quest_templates` +
  `quest_template_objectives` Drizzle schema + relations + forward-only
  migration `0007_quest_templates.sql`.
- **T03** `QuestTemplateService` (create/read/list) + `QuestTemplateRepository`
  port + `DrizzleQuestTemplateRepository` impl — 7 service tests.
- **T04** `instantiateQuestFromTemplate` (template -> S28 Quest wiring) —
  service test + guarded `quest-template.integration.test.ts`.

## Coverage Summary

- `@lumi/world` unit: **115 tests green** (11 files) — 101 prior + 14 new
  (7 domain + 7 service); `format | lint | typecheck | test | build` green per
  package.
- Guarded integration behind `WORLD_TEST_ENABLE_DESTRUCTIVE=true`:
  `quest-template.integration.test.ts`.
- **Partial:** 0 · **Future-backlog:** template authoring UI/versioning,
  `quest_seed` interaction -> template -> quest automation, quest rewards,
  template-to-LLM story generation.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| Create template persists unique `templateKey` + ordered objective defs | ✅ T01/T02 + service test |
| Duplicate `templateKey` rejected (domain + DB guard) | ✅ service + integration |
| Zero-objective template rejected | ✅ domain test |
| Listing/getting templates returns definitions | ✅ service test |
| Instantiate -> one `Quest` in `inactive` with matching objectives | ✅ T04 + integration |
| Instantiation persists through existing `QuestRepository`; no lifecycle in template layer | ✅ code-review + integration |
| All source green | `format:check \| lint \| typecheck \| test \| build` green |