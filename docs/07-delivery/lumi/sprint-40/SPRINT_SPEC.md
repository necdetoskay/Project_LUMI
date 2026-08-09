# Sprint 40 — Visual UX Foundation & Auth/Public Experience

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Replace the current corporate-dashboard/public-auth presentation with the first production implementation of LUMI's narrative-first visual language while preserving existing auth contracts and responsive accessibility.

## Canonical decisions

Primary: UXD-001..005, UXD-022..024, UXD-059..060.

## Scope

- Establish reusable storybook visual primitives for public/auth surfaces.
- Redesign `/` as a living-story landing experience rather than a product dashboard.
- Give `/login`, `/register`, and `/forgot-password` distinct narrative compositions while keeping their existing POST contracts and error/success semantics.
- Improve global public header/footer language so it no longer presents LUMI as a corporate admin product.
- Preserve keyboard focus, semantic labels, mobile responsiveness, reduced-motion friendliness and readable contrast.
- Add S40 ULTEF/E2E contract coverage for public/auth UX invariants.

## Non-goals

- Parent dashboard redesign belongs to S41.
- Character creation belongs to S42.
- Generated production art assets are not required to close the structural visual foundation; scene illustration slots must support later canonical art without layout redesign.
- Auth backend behavior and security rules are not changed.

## Acceptance criteria

1. Public landing no longer uses dashboard/analytics/product-management language.
2. Login, register and forgot-password are visibly distinct compositions but share a coherent LUMI art direction.
3. Existing form action endpoints, required fields and auth query-state feedback remain intact.
4. Pages remain usable at mobile and desktop widths.
5. No XP/quest/level/stat gamification language appears.
6. Public visual system uses narrative scene surfaces, layered backgrounds, gentle decorative world motifs and clear content hierarchy.
7. Accessibility baseline: labels, focus-visible, landmarks, readable controls and reduced-motion support.
8. S40 ULTEF UX contract test is added and green in CI before COMPLETE.

## ULTEF mapping

- UX-AUTH-001
- UX-RESPONSIVE-001
- UX-MEDIA-OPTIONAL-001
- NARRATIVE-GAME-LEAK-001
- S40-PUBLIC-AUTH-VISUAL-CONTRACT-001

## Delivery sequence

1. Inspect current public/auth implementation.
2. Build storybook public/auth primitives.
3. Redesign landing and auth pages without changing backend contracts.
4. Update global public shell styling.
5. Add ULTEF/E2E contract coverage.
6. Run lint/typecheck/build/tests/ULTEF.
7. Record evidence and mark COMPLETE.
