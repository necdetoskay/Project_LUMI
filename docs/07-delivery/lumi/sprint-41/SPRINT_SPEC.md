# Sprint 41 — Parent Home & Child Profile Experience

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Transform the authenticated parent entry experience from an implementation/status dashboard into a warm family story hub centered on children, their living worlds, and meaningful next actions.

## Product direction

The parent home must not expose sprint numbers, backend implementation status, technical state labels, XP, levels, quests, or analytics-dashboard language. It should answer three human questions immediately: **Which child? What is happening in their world? What can we do next?**

## Scope

- Redesign `/app` as the parent family-story home.
- Make child profiles the primary visual objects rather than system status cards.
- Preserve household/profile onboarding and character-onboarding routes and contracts.
- Provide graceful empty states when household or profiles do not yet exist.
- Introduce the first structural `Dünyalardan Haberler` surface without inventing simulation events that are not available from canonical state yet.
- Redesign `/app/profiles` into a child-centered profile library using the same visual language.
- Remove corporate/dashboard and implementation/sprint terminology from parent-facing surfaces.
- Preserve accessibility, responsive behavior and reduced-motion friendliness.
- Add S41 ULTEF/E2E UX contract coverage.

## Non-goals

- Character creation redesign belongs to S42.
- Full child profile detail editing and richer interest/development-goal persistence require their canonical domain contracts and are not fabricated in S41.
- `Dünyalardan Haberler` does not invent NPC/world events; until a canonical feed exists it communicates readiness/continuity from real onboarding/profile state only.
- No auth or household isolation rules change.

## Acceptance criteria

1. `/app` presents a narrative parent home, not a technical dashboard.
2. Existing child profiles appear prominently with name and age band and direct continuation actions.
3. No-profile and no-household states lead clearly to onboarding.
4. Parent-facing copy contains no sprint/implementation/backend terminology and no XP/level/quest/stat gamification language.
5. `Dünyalardan Haberler` exists as a calm narrative surface and never fabricates world events.
6. `/app/profiles` uses the same child-centered visual language and removes `Dashboard` terminology.
7. Existing onboarding, profile detail, settings, logout and character-onboarding contracts remain reachable.
8. Mobile and desktop layouts remain usable with semantic headings, focus-visible controls and readable contrast.
9. S41 ULTEF UX contract is green before COMPLETE.

## ULTEF mapping

- UX-PARENT-HOME-001
- UX-CHILD-PROFILE-001
- UX-WORLD-NEWS-TRUTHFUL-001
- UX-RESPONSIVE-002
- NARRATIVE-TECH-LEAK-001
- NARRATIVE-GAME-LEAK-002
- S41-PARENT-HOME-PROFILE-CONTRACT-001

## Delivery sequence

1. Inspect current parent home/profile surfaces and canonical onboarding data.
2. Establish authenticated story-home visual primitives.
3. Redesign `/app` around children and living-world continuity.
4. Redesign `/app/profiles` without changing API contracts.
5. Add truthful empty/news states.
6. Add S41 ULTEF/E2E contract coverage.
7. Run format/lint/typecheck/build/tests/ULTEF and repository regression gates.
8. Record evidence and mark COMPLETE only after green CI.
