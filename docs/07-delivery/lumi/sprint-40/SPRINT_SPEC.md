# Sprint 40 — Visual UX Foundation & Auth/Public Experience

Status: COMPLETE
Date: 2026-08-09

## Goal

Replace the current corporate-dashboard/public-auth presentation with the first production implementation of LUMI's narrative-first visual language while preserving existing auth contracts and responsive accessibility.

## Canonical decisions

Primary: UXD-001..005, UXD-022..024, UXD-059..060.

## Delivered

- Reusable storybook public/auth primitives and layered narrative background system.
- `/` redesigned around living-world, memory and narrative-first product identity.
- `/login` redesigned as a return-to-story composition while preserving `/api/auth/login` contract.
- `/register` redesigned as a first-page/universe-beginning composition while preserving `/api/auth/register` contract.
- `/forgot-password` redesigned as a calm return-path composition while preserving `/api/auth/forgot-password` contract.
- Global header/footer wording and styling moved away from corporate dashboard framing.
- Responsive and reduced-motion CSS baseline added.
- S40 Playwright ULTEF contract added and wired into GitHub Actions.

## Non-goals

- Parent dashboard redesign belongs to S41.
- Character creation belongs to S42.
- Generated production art assets are not required to close the structural visual foundation; scene illustration slots support later canonical art without layout redesign.
- Auth backend behavior and security rules were not changed.

## Acceptance evidence

1. Public landing no longer uses the previous dashboard/analytics framing — PASS.
2. Login, register and forgot-password are distinct narrative compositions — PASS.
3. Existing form actions and required auth fields preserved — PASS via S40 E2E contract.
4. Mobile narrow viewport contract — PASS.
5. XP/quest/level language leakage check — PASS after removing public copy leakage.
6. Narrative scene surfaces, layered backgrounds and coherent hierarchy — DELIVERED.
7. Semantic labels/focus baseline/reduced-motion support — DELIVERED; deeper accessibility sweep remains S59.
8. S40 ULTEF public/auth visual contract — 5/5 PASS.

## Required gate evidence

Validated on PR #53 clean head `96fa6d1a2bbc5cbb5eb690e37fc8d0baf0fa1ec9` before this closeout-only documentation commit:

- ULTEF S40 Public Auth Visual Contract — PASS.
- CI validate: L8 evaluators, L9 continuity/failover, format, lint, typecheck, unit tests, load soft gate and build — PASS.
- Security Scan: dependency audit collection, gitleaks, web image build and Trivy — PASS.
- ULTEF Integration DB-backed suite — PASS.
- PX-LUMI — PASS.
- PX-02 Character Continuity — PASS.
- PX-04 Emotional Consistency — PASS.
- PX-05 Story Consequence — PASS.
- S35 Outbox Worker — PASS.
- S36 Quest Reward — PASS.
- S37 Hook Reader — PASS.
- S38 Template Versioning — PASS.

## ULTEF mapping

- UX-AUTH-001
- UX-RESPONSIVE-001
- UX-MEDIA-OPTIONAL-001
- NARRATIVE-GAME-LEAK-001
- S40-PUBLIC-AUTH-VISUAL-CONTRACT-001

## Closeout

Sprint 40 is COMPLETE. The next implementation boundary is Sprint 41 — Parent Home & Child Profile Experience.
