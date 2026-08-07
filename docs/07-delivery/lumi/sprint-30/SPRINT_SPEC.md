# Sprint 30 — Quest Log UI (Story Reader)

**Sprint ID:** LUMI-S30
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 28 (Quest Aggregate), Sprint 29 (Quest Templates)
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `AGENTS.md` (Sprint 29 closeout backlog: *quest log UI (Story Reader)*)

## Goal

Surface active/completed quests to the child inside the **Story Reader**.
Sprints 28-29 delivered the quest backend (aggregate + templates + services);
the web app has **zero** quest surface today. This sprint adds a child-facing
"Gorev listesi" (quest log) panel to `apps/web/components/story/story-reader-client.tsx`
backed by a new household-gated API route, following the existing reader
card/list conventions (no new component library, no tabs).

This is purely additive on the web side: one `@lumi/world` service exposure
(`getQuestsBySessionId`), one API route, and a UI panel. No quest behavior
changes.

## Principle

- **Quest data is child-facing but household-gated**: the route reuses the
  existing `getStorySessionOrForbidden(sessionId, householdId)` gate — the same
  authorization boundary the reader, choices, and checkpoints routes use.
  A child cannot see another household's quests.
- **Read-only surface**: this sprint renders quests only; no pause/abandon or
  status mutation from the reader. All lifecycle stays on the commit pipeline.
- **Spoiler-safe presentation**: labels are localized (Turkish, ASCII-ized per
  codebase convention); no evidence refs or raw world IDs leak into the UI.
- **Graceful degradation**: quest fetch is parallel + optional — if it fails,
  the reader still loads and an auxiliary warning is shown, matching the
  choices-history / checkpoint pattern.

## Reused Foundation

- `@lumi/world` `QuestRepository.findQuestsBySessionId` (S28, already in the
  repo port, previously unwrapped) → new application `getQuestsBySessionId`.
- `@lumi/world` `QuestState` / `QuestObjectiveState` (S28 domain types).
- `@lumi/story` `getStorySessionOrForbidden` (S19 gate).
- Web patterns: `withParent`, `getOwnedHousehold`, `observeHandler`,
  `handleStoryError`, `story-reader-client.tsx` fetch orchestrator,
  card/list recipes (`rounded-xl border border-outline-variant
  bg-surface-container-low p-4/p-5`), `InfoTile`, Material Symbols icons,
  Turkish ASCII copy.

## In Scope

- **`@lumi/world` application exposure**: `getQuestsBySessionId(storySessionId)`
  wrapping the existing repo method (same shape as `getQuestsByWorldId`).
- **API route**: `GET /api/stories/sessions/[sessionId]/quests` —
  household-gated (`withParent` + `getOwnedHousehold` + `getStorySessionOrForbidden`),
  returns localized `{ quests: [{ id, title, summary, status, statusLabel,
  objectives: [{ index, title, status, statusLabel }] }] }`.
- **Story Reader UI**: "Gorev listesi" panel in `story-reader-client.tsx` —
  quest cards (title + status badge + summary + objective list with
  completed/incomplete icons). Loaded in `loadReader`'s parallel fetch with
  optional failure warning.
- **Tests**: web route tests (localization, household gate, empty list,
  not-found) + `@lumi/world` service test for `getQuestsBySessionId`.

## Out of Scope

- Quest actions from the UI (pause/resume/abandon/progress) — read-only.
- Quest progress animation / toasts / confetti.
- Quest log as a separate route/page (only the reader panel this sprint).
- `quest_seed` interaction → quest automation, story-hook → LLM integration,
  quest rewards (separate backlog).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S30-T01 | `getQuestsBySessionId` service exposure + export | `@lumi/world` application | unit: service |
| S30-T02 | `GET /api/stories/sessions/[sessionId]/quests` route | `apps/web` api | web route tests |
| S30-T03 | Story Reader "Gorev listesi" panel + fetch | `apps/web` components | typecheck + lint + build |

## Requirements

- `getQuestsBySessionId` returns `QuestState[]` for a story session, ordered by
  creation, each with its objectives.
- The quests route requires `householdId` (400 if missing), validates UUID
  params, rejects mismatched households (403), and 404s on inaccessible
  sessions via `getStorySessionOrForbidden`.
- The response is localized: `statusLabel`/`objective statusLabel` map to
  Turkish labels; no raw evidence refs or IDs beyond `quest.id`/`objective.index`.
- The reader loads quests in parallel with history/checkpoint; a failure sets
  an auxiliary warning and does not block the reader.
- An empty quest list renders "Bu oturumda aktif gorev bulunmuyor.".

## Acceptance Criteria

- [ ] `@lumi/world` exposes `getQuestsBySessionId` and it is tested.
- [ ] `GET /api/stories/sessions/{sessionId}/quests` returns localized quests
  for an owned session.
- [ ] Household mismatch → 403; missing `householdId` → 400; inaccessible
  session → 404.
- [ ] Story Reader shows the "Gorev listesi" panel with quest cards, status
  badges, and objective checklists.
- [ ] Quest fetch failure degrades gracefully (warning, reader still loads).
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- Auth boundary reuse: reuse `getStorySessionOrForbidden` exactly like the
  checkpoints route — do not invent a new gate.
- UI copy/encoding: use Turkish ASCII text matching the rest of the reader
  (no mojibake — `check-mojibake` gate).
- Leaking evidence/world internals: the route deliberately strips
  `evidenceRef`, `worldId`, and raw statuses beyond the localized labels.
- Reader size: the panel is additive; keep it a stack card, do not refactor
  the existing layout.

## Validation

- `pnpm --filter @lumi/world lint | typecheck | test`
- `pnpm --filter @lumi/web lint | typecheck | test`
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
- `pnpm format:check` green.