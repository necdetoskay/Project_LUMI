# Sprint 43 — Current-Life / Şimdi / Child Navigation Shell

Status: COMPLETE
Date: 2026-08-09

## Goal

Turn the character detail surface into the canonical **Şimdi** experience: a narrative projection of where the character currently is, what is with them, what world context is known, and where the child can naturally continue next.

## Product direction

The character page is not a database detail screen and not a game character sheet. It represents the character's current life. If the canonical world says the character is in a forest, cave, village or other location, the page must reflect that state rather than always presenting a static room/home metaphor.

The shell answers four questions without exposing technical state:

1. Where am I now?
2. What is with me?
3. What part of my past/current world matters here?
4. Where can I naturally continue?

## Delivered

- Reworked `ProfileCharacterDetailSection` into the story-first `Şimdi` surface.
- Canonical world `currentLocation` is the primary location projection.
- Truthful origin/home fallback is used only when current location is unavailable.
- Inventory is presented as a compact narrative summary rather than RPG rarity/stat presentation.
- Added coherent navigation across `Şimdi`, `Hikâyeler`, `Dünyam` and profile context.
- Removed normal child-facing `Dashboard`, raw character type/subtype/origin labels and technical world-state language.
- Preserved existing character, inventory and world read APIs and household/profile/character isolation.
- Kept story-history/replay navigation read-only; S43 adds no mutation path.
- Added dedicated S43 ULTEF Playwright contract coverage.

## Existing contracts preserved

- authenticated character detail route
- `GET /api/characters/:id`
- inventory list projection for the canonical character owner
- child-profile world projection and current location
- profile story history/read surfaces
- household/profile/character isolation

## Non-goals preserved

- Full living map redesign belongs to S48/S57.
- Full inventory/object UX belongs to S49/S57.
- Relationships/friends UI belongs to S45/S57 after production relationship evidence exists.
- Memory production belongs to S44.
- No current companions, weather, active story, world events or visual scene art are fabricated when canonical sources are unavailable.

## Acceptance result

1. Character detail reads as `Şimdi`, not a technical character record — PASS.
2. Current canonical location is primary when available — PASS.
3. Missing-current-location fallback is truthful — PASS.
4. Inventory avoids rarity/stat/RPG vocabulary — PASS.
5. Technical/game leakage is blocked by dedicated contract — PASS.
6. Stories/world/profile navigation remains available — PASS.
7. No fabricated relationship/friend/world-event claims — PASS.
8. Story history/replay remains read-only — PASS.
9. Typecheck/lint/build validate responsive implementation integrity — PASS.
10. Required S43/CI/Security/Integration/PX regressions are green — PASS.

## ULTEF mapping

- UX-CURRENT-LIFE-001
- UX-CANONICAL-LOCATION-001
- UX-CHILD-NAV-SHELL-001
- UX-INVENTORY-NARRATIVE-001
- UX-REPLAY-READONLY-001
- NARRATIVE-TECH-LEAK-002
- NARRATIVE-GAME-LEAK-003
- S43-CURRENT-LIFE-CONTRACT-001

## Closeout evidence

Final implementation candidate before this documentation-only closeout commit:

- ULTEF S43 Current Life Contract — run #4 — SUCCESS
- ULTEF Integration — run #550 — SUCCESS
  - DB integration profile — PASS
  - L6 Golden Headless Journey — PASS
  - L9 deterministic long-horizon state journey — PASS
  - L9 DB-backed ten-session journey — PASS
  - L9 commit/crash/dependency/migration recovery journeys — PASS
  - tenant isolation and household/session negative/idempotency scenarios — PASS
  - PX-LUMI-03 memory coherence — PASS
- ULTEF PX-LUMI — run #188 — SUCCESS
- ULTEF PX-02 Character Continuity — run #165 — SUCCESS
- ULTEF PX-04 Emotional Consistency — run #154 — SUCCESS
- ULTEF PX-05 Story Consequence — run #147 — SUCCESS
- ULTEF S42 Character Creation Contract regression — run #45 — SUCCESS
- ULTEF S41 Parent Home Profile Contract regression — run #51 — SUCCESS
- ULTEF S40 Public Auth Visual Contract regression — run #64 — SUCCESS
- ULTEF S38 Template Versioning regression — run #78 — SUCCESS
- ULTEF S37 Hook Reader regression — run #91 — SUCCESS
- ULTEF S36 Quest Reward regression — run #111 — SUCCESS
- ULTEF S35 Outbox Worker regression — run #121 — SUCCESS
- Security Scan — run #777 — SUCCESS
- CI — run #833 — SUCCESS
  - L8 evaluator/calibration/scorecard selftests — PASS
  - L9 long-horizon continuity — PASS
  - L9 provider failover — PASS
  - format/lint/typecheck/test/build — PASS
  - load smoke/gate — PASS
  - Build Artifact/web image — PASS

The documentation-only closeout commit must also pass the same required PR gates before merge.
