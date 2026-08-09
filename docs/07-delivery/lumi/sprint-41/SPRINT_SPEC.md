# Sprint 41 — Parent Home & Child Profile Experience

Status: COMPLETE
Date: 2026-08-09

## Goal

Transform the authenticated parent entry experience from an implementation/status dashboard into a warm family story hub centered on children, their living worlds, and meaningful next actions.

## Product direction

The parent home must not expose sprint numbers, backend implementation status, technical state labels, XP, levels, quests, or analytics-dashboard language. It should answer three human questions immediately: **Which child? What is happening in their world? What can we do next?**

## Delivered

- `/app` is now a family story home rather than a technical status dashboard.
- Child profiles are the primary visual objects, with direct continuation and profile-detail actions.
- Household/profile empty states lead naturally to onboarding.
- `Dünyalardan Haberler` is introduced as a truthful structural surface; because a canonical world-event feed does not yet exist, it explicitly avoids inventing NPC/world events.
- `/app/profiles` is redesigned as a child-centered profile library and removes `Dashboard` framing.
- Parent-facing copy no longer exposes sprint/backend/implementation terminology or XP/level/quest framing.
- Existing onboarding, child-profile API, profile-detail and character-onboarding routes remain intact.
- Responsive storybook surfaces reuse the S40 visual foundation.
- Dedicated S41 ULTEF contract and CI workflow were added.

## Deferred / non-goals

- Character creation redesign belongs to S42.
- Rich child interest/development-goal editing will be implemented when its canonical domain contracts are wired; S41 does not fabricate persistence fields.
- Real `Dünyalardan Haberler` world/NPC event data waits for a canonical feed.
- Auth, household isolation and profile backend behavior were not changed.

## Acceptance criteria result

1. `/app` narrative parent home — PASS.
2. Child profiles prominent with name/age/direct actions — PASS.
3. Household/profile empty-state guidance — PASS.
4. No sprint/backend/implementation or gamification leakage — PASS via S41 ULTEF.
5. Truthful `Dünyalardan Haberler` without fabricated events — PASS via S41 ULTEF.
6. `/app/profiles` child-centered and no `Dashboard` terminology — PASS.
7. Existing route/API contracts retained — PASS via contract checks and regression suite.
8. Responsive semantic storybook structure retained — PASS.
9. Dedicated S41 ULTEF green — PASS.

## ULTEF mapping

- UX-PARENT-HOME-001
- UX-CHILD-PROFILE-001
- UX-WORLD-NEWS-TRUTHFUL-001
- UX-RESPONSIVE-002
- NARRATIVE-TECH-LEAK-001
- NARRATIVE-GAME-LEAK-002
- S41-PARENT-HOME-PROFILE-CONTRACT-001

## Evidence

PR validation head before closeout docs: `92261077a150cd0b1037a760b9b8783b78bbcda4`.

Green evidence recorded on that implementation head:

- ULTEF S41 Parent Home Profile Contract — success.
- CI validate — format, lint, typecheck, tests, load smoke and build success.
- CI Build Artifact — success.
- Security Scan — audit, gitleaks, image build and Trivy success.
- ULTEF Integration — DB-backed and long-horizon integration success.
- ULTEF PX-LUMI — success.
- ULTEF PX-02 Character Continuity — success.
- ULTEF PX-04 Emotional Consistency — success.
- ULTEF PX-05 Story Consequence — success.
- S35 Outbox Worker, S36 Quest Reward, S37 Hook Reader, S38 Template Versioning and S40 Public Auth regressions — success.

## Completion note

S41 closes only the parent-home/profile presentation layer and its UX truthfulness contract. It deliberately does not claim that interest/development-goal editing or a live world-news feed exists before their production domain wiring is implemented.
