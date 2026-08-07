# Sprint 30 — T04: Backlog Validation Evidence

**Source plan:** `AGENTS.md` Sprint 29 closeout backlog (*quest log UI (Story Reader)*)
**Status:** Quest Log UI delivered
**Branch:** `codex/sprint-30-quest-log-ui` → PR (target `main`)

## Summary

Sprint 30 closed the first open backlog item from S29 closeout: a child-facing
**quest log** inside the Story Reader. Sprints 28–29 shipped the quest backend;
the web app had zero quest surface. This sprint added one service exposure in
`@lumi/world`, one household-gated API route, and a localized "Gorev listesi"
panel in the Story Reader — all read-only, spoiler-safe, and additive.

## Deliverables (T01–T03)

- **T01** `getQuestsBySessionId(storySessionId)` — `@lumi/world` application
  wrapper around the existing `QuestRepository.findQuestsBySessionId`, same
  shape as `getQuestsByWorldId`; exported from `application/index.ts`; covered
  by `quest.service.test.ts` (10 → 11 tests).
- **T02** `GET /api/stories/sessions/[sessionId]/quests` — reuses
  `withParent` + `getOwnedHousehold` + `getStorySessionOrForbidden` (same gate
  as the checkpoints route); returns localized quest summaries; 5 web route
  tests in `story-session-quest-api.test.ts`.
- **T03** Story Reader "Gorev listesi" panel — `story-reader-client.tsx`:
  parallel fetch in `loadReader` (optional, warning on failure), quest cards
  with status badge + summary + objective checklist (Material Symbols icons,
  Turkish ASCII copy, existing card recipes).

## Requirements → Coverage Map

| Requirement | Implementation | Coverage |
| --- | --- | --- |
| Quest list for a session via world service | `getQuestsBySessionId` wrapper | `quest.service.test.ts` (lists by session) |
| Household-gated quest API | `getOwnedHousehold` mismatch → 403; missing householdId → 400 | `story-session-quest-api.test.ts` |
| Session access gate | `getStorySessionOrForbidden` → 404 | `story-session-quest-api.test.ts` |
| Localized, spoiler-safe response | status/objective `statusLabel` mapping; no evidence/world internals | route mapping + tests |
| Reader parallel + graceful fetch | quest fetch in `Promise.all`, warning on failure | `story-reader-client.tsx` (typecheck/lint/build) |
| Empty state copy | "Bu oturumda aktif gorev bulunmuyor." | UI render (build) |

## Coverage Summary

- `@lumi/world` unit: **116 tests green** (115 prior + 1 new).
- `@lumi/web` unit: **144 tests green** (139 prior + 5 new).
- `format:check | lint | typecheck | test | build | check-mojibake` green.
- **Partial:** 0 · **Future-backlog:** quest actions from UI, `quest_seed` →
  quest automation, accepted hook → LLM story generation, quest rewards,
  template authoring UI/versioning.

## Exit Criteria

| Criteria | Status |
| --- | --- |
| `getQuestsBySessionId` exposed + tested | ✅ T01 |
| Route returns localized quests; 400/403/404 guards | ✅ T02 |
| Reader shows "Gorev listesi" with quest cards + objective checklists | ✅ T03 |
| Graceful degradation on quest fetch failure | ✅ T03 |
| All source green | `format:check \| lint \| typecheck \| test \| build` |