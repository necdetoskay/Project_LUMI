# Sprint 28 — Quest Aggregate

**Sprint ID:** LUMI-S28
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 22 (World Commit System), Sprint 23 (Outbox), Sprint 27 (Story Hooks)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/LUMI_Backlog_Story_Outcome_Commit_System.md` (quest ve world event değişiklikleri), `docs/08-backlog/lumi/story-outcome-world-state-validation-test-plan.md` (Quest: yalnızca kanıtlanan hedef veya durum ilerler)

## Goal

Introduce a first-class **Quest aggregate** so that story outcomes can
progress quests deterministically. A quest is a multi-step narrative
objective (e.g. "find the owner of the lost letter") whose state lives
in the canonical world and advances only when the World Commit System
applies a proven, evidence-backed `quest_state_update`. This closes the
last outstanding world-state entity gap referenced repeatedly since
S22/23 (NPC / relationship / inventory / memory / world flag / location
/ environment / scheduled event all have outcome types; quest did not).

## Principle

- A quest is an **aggregate root**: lifecycle transitions are guarded by
  the domain, not by free-form writes.
- Quests progress **only through the commit system**: an outcome manifest
  with `quest_state_update` produces a narrative event → rule engine →
  world change, applied inside the same transaction as the story advance
  (S22-T06 atomicity). No direct quest mutation from routes or other
  packages.
- Quests are **household-scoped** and **deterministic**: same inputs →
  same progression. Free-form LLM text cannot advance a quest.
- Quests are **evidence-bound**: every progression carries an
  `evidenceRef` and is validated against the story context snapshot.

## Reused Foundation

- `@lumi/story` `OutcomeManifest` / `OutcomeType` (S22): new
  `quest_state_update` type added alongside the eight existing types.
- `@lumi/story` `NarrativeEventExtractor` (S22): new
  `quest_objective_progressed` event type.
- `@lumi/story` `WorldCommitRuleEngine` (S22): default rule for quest
  progression.
- `@lumi/story` `WorldCommitService` / `commitOutcomeWithTx` (S22-T06):
  atomic commit with story advance.
- `@lumi/story` `EvidenceValidator` (S22): snapshot-scope check for
  quest entities.
- `@lumi/story` `StoryHook` (S27): `quest_seed` hooks may seed new
  quests (out of scope for this sprint — see Out of Scope).

## In Scope

- **Quest domain model**: `Quest` aggregate root with lifecycle
  (`inactive` → `active` → `paused`/`completed`/`abandoned`), ordered
  objectives, deterministic progression, household scope, evidence.
- **Quest persistence**: `quests` + `quest_objectives` tables
  (household-scoped, indexed by world/session), forward-only migration
  `0006_quests.sql`.
- **Quest application service**: `QuestService` —
  `createQuest` / `activate` / `progressObjective` / `completeObjective`
  / `pause` / `resume` / `abandon`, plus repo port + Drizzle impl.
- **Outcome integration**: `quest_state_update` outcome type,
  `quest_objective_progressed` narrative event, default rule, evidence
  validation.
- **Commit integration**: `WorldCommitService` applies quest changes
  transactionally; quest read model updated within the same tx as the
  story advance.

## Out of Scope

- `quest_seed` interaction → `Quest` creation automation (S27 hook →
  quest seeding is a follow-up; this sprint exposes the domain only).
- Quest UI / child-facing quest log (Story Reader follow-up).
- Quest templates / authored quest definitions (design-time authoring
  tooling — future).
- Quest rewards / inventory grants (handled by existing
  `inventory_transaction` outcome).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S28-T01 | `Quest` domain model + lifecycle + objectives | `@lumi/world` domain | unit: domain model |
| S28-T02 | Quest persistence schema + migration `0006` | `@lumi/world` db | migration, schema |
| S28-T03 | `QuestService` + repo port + Drizzle impl | `@lumi/world` application | unit: service |
| S28-T04 | `quest_state_update` outcome type + narrative event + default rule | `@lumi/story` domain | unit: extractor + rule engine |
| S28-T05 | Quest evidence validation (snapshot scope) | `@lumi/story` domain | unit: validator |
| S28-T06 | Transactional quest commit via existing `WorldCommitService` | `@lumi/story` + `@lumi/world` | guarded integration |
| S28-T07 | Backlog validation evidence | `docs/07-delivery/lumi/sprint-28/` | scenario matrix green |

## Requirements

- A quest has a stable id, householdId, worldId, optional storySessionId,
  ordered objectives, and a status from
  `{ inactive, active, paused, completed, abandoned }`.
- Only `active` quests accept objective progression; `inactive` must be
  activated first; `paused` rejects progression until resumed.
- Completing the final objective auto-transitions the quest to
  `completed`; `abandon` is always allowed from non-terminal states.
- `quest_state_update` outcomes produce a `quest_objective_progressed`
  narrative event mapped to a `set` world change on the objective
  state field.
- Quest entities referenced by an outcome must be present in the story
  context snapshot (evidence gate, S22-T02).
- All transitions are deterministic and carry an `evidenceRef`.

## Acceptance Criteria

- [ ] Creating a quest persists it in `inactive` status with ordered
  objectives.
- [ ] Activating an `inactive` quest moves it to `active`.
- [ ] Progressing an objective on an `active` quest updates its state
  and bumps the quest version.
- [ ] Completing the final objective auto-completes the quest.
- [ ] Progression on a `paused` or `inactive` quest is rejected.
- [ ] `quest_state_update` outcome → `quest_objective_progressed` event
  → committed world change, atomically with story advance.
- [ ] Quest entities not in the context snapshot are rejected by the
  evidence validator.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Quest state vs. quest *definition*: this sprint stores quest
  instances only; authored templates are deferred. Keep the schema
  additive so templates can layer on later.
- Cross-package commit: the rule engine lives in `@lumi/story`, the
  quest read model in `@lumi/world`. The commit writes the `WorldChange`
  (entityKind-agnostic); the world-side applicator updates the quest
  table. Keep the applicator idempotent per `questId::objectiveId`.
- Quest progression semantics (objectives vs. free-form fields): use a
  typed `objectiveIndex` + `state` payload, not free-form field paths.

## Validation

- `pnpm --filter @lumi/world lint | typecheck | test`
- `pnpm --filter @lumi/story lint | typecheck | test`
- Integration behind `STORY_TEST_ENABLE_DESTRUCTIVE=true` /
  `WORLD_TEST_ENABLE_DESTRUCTIVE=true` guards.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.