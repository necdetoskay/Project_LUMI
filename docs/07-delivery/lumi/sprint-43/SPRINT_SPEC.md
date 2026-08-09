# Sprint 43 — Current-Life / Şimdi / Child Navigation Shell

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Turn the character detail surface into the canonical **Şimdi** experience: a narrative projection of where the character currently is, what is with them, what world context is known, and where the child can naturally continue next.

## Product direction

The character page is not a database detail screen and not a game character sheet. It represents the character's current life. If the canonical world says the character is in a forest, cave, village or other location, the page must reflect that state rather than always presenting a static room/home metaphor.

The shell should answer four questions without exposing technical state:

1. Where am I now?
2. What is with me?
3. What part of my past/current world matters here?
4. Where can I naturally continue?

## Existing contracts to preserve

- authenticated character detail route
- `GET /api/characters/:id`
- inventory list projection for the canonical character owner
- child-profile world projection and current location
- profile story history/read surfaces
- household/profile/character isolation

## Scope

- Redesign `ProfileCharacterDetailSection` as a story-first `Şimdi` surface.
- Remove `Dashboard`, `originMode`, raw character type/subtype labels, rarity/status pipes and technical explanatory copy from normal child-facing presentation.
- Use canonical current world location when available; fall back truthfully to origin/home only when current location is absent.
- Show carried/canonical inventory as a small narrative summary, not RPG slots/stats.
- Add a coherent child navigation shell linking `Şimdi`, `Hikâyeler`, `Dünyam` and parent/profile context without inventing unavailable relationship/social data.
- Keep story replay/read navigation read-only; S43 must not introduce state mutation when opening old stories.
- Preserve truthful empty states when world/inventory data is absent.
- Add dedicated S43 ULTEF/E2E contract coverage for canonical-location projection, no technical/game leakage and route protection.

## Non-goals

- Full living map redesign belongs to S48/S57.
- Full inventory/object UX belongs to S49/S57.
- Relationships/friends UI belongs to S45/S57 after production relationship evidence exists.
- Memory production belongs to S44.
- Do not fabricate current companions, weather, active story, world events or visual scene art if canonical sources are not yet available.

## Acceptance criteria

1. Character detail reads as `Şimdi`, not a technical character record.
2. Current canonical location is the primary location shown when available.
3. If current location is unavailable, fallback language is explicit and does not imply a fabricated current scene.
4. Inventory is shown narratively without rarity/stat/RPG vocabulary.
5. No `Dashboard`, `originMode`, raw backend/domain labels, XP/level/quest/stat language appears in normal child-facing copy.
6. Navigation to stories/world/profile remains functional and semantically clear.
7. No relationship/friend or world-event claims are fabricated.
8. Opening story history/replay remains read-only by existing contract.
9. Mobile/desktop and keyboard navigation remain usable.
10. S43 ULTEF, CI, Security, Integration and relevant PX regressions are green before COMPLETE.

## ULTEF mapping

- UX-CURRENT-LIFE-001
- UX-CANONICAL-LOCATION-001
- UX-CHILD-NAV-SHELL-001
- UX-INVENTORY-NARRATIVE-001
- UX-REPLAY-READONLY-001
- NARRATIVE-TECH-LEAK-002
- NARRATIVE-GAME-LEAK-003
- S43-CURRENT-LIFE-CONTRACT-001
