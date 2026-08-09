# Sprint 42 — Character Creation, Origin & Visual Canon

Status: COMPLETE
Date: 2026-08-09

## Goal

Turn the existing character-bootstrap surface into a story-first character creation journey while preserving production contracts and defining a truthful visual-canon boundary.

## Product rules

- Character creation feels like meeting a future story companion, not configuring an AI pipeline.
- Normal parent/child UI must not expose `Dashboard`, model/provider IDs, OpenRouter, backend/bootstrap/handoff/package terminology.
- Existing `generate-archetypes -> handoff -> generate-packages -> consume` semantics remain intact.
- One-character-per-child-profile and household/profile isolation remain intact.
- Origin becomes canonical only through the existing persistence pipeline.
- Four visual candidates must never be faked. If no production image-generation + durable asset path exists, UI must say so truthfully.

## Delivered

1. Story-first character idea selection.
2. Narrative origin/beginning selection.
3. Optional name/subtype refinement using existing consume contract.
4. Warm existing-character continuation state.
5. Truthful visual readiness state; no placeholder is represented as a generated portrait.
6. Canonical visual-canon contract for future four-candidate generation and explicit selection.
7. Responsive, keyboard-accessible UI and Turkish copy cleanup.
8. Dedicated S42 Playwright/ULTEF contract in the repository-standard `tests/e2e` suite.
9. Existing character-bootstrap API endpoints, singleton guard and household/profile boundaries preserved.

## Acceptance criteria

1. Character onboarding no longer reads like a technical bootstrap form. — PASS
2. Technical AI/provider/backend vocabulary does not appear in normal user-facing copy. — PASS
3. Existing five character-bootstrap endpoints remain referenced and protected. — PASS
4. Origin options remain selectable and persist through existing consume semantics. — PASS
5. Existing-character singleton state routes users to continuation rather than duplicate creation. — PASS
6. Visual readiness state clearly says placeholders are not generated images. — PASS
7. Visual canon contract defines tenant isolation, explicit selection, versioning, provenance and idempotency requirements. — PASS
8. CI, Security, Integration, PX and S42 ULTEF gates are green before COMPLETE. — PASS

## ULTEF mapping

- UX-CHARACTER-CREATION-001
- UX-CHARACTER-CHOICE-LOAD-001
- NARRATIVE-CHARACTER-TECH-LEAK-001
- CHARACTER-ORIGIN-CONTINUITY-001
- CHARACTER-VISUAL-CANON-001
- CHARACTER-VISUAL-TRUTHFULNESS-001
- CHARACTER-SINGLETON-GUARD-001
- S42-CHARACTER-CREATION-CONTRACT-001

## Closeout evidence

Verified on clean PR #56 head before this documentation-only closeout commit:

- CI run #827 — SUCCESS; format, lint, typecheck, tests, build and Build Artifact all passed.
- Security Scan run #771 — SUCCESS.
- ULTEF Integration run #545 — SUCCESS.
- ULTEF S42 Character Creation Contract run #39 — SUCCESS.
- ULTEF PX-LUMI run #183 — SUCCESS.
- ULTEF PX-02 Character Continuity run #160 — SUCCESS.
- ULTEF PX-04 Emotional Consistency run #149 — SUCCESS.
- ULTEF PX-05 Story Consequence run #142 — SUCCESS.
- S35/S36/S37/S38/S40/S41 regression workflows — SUCCESS.

The final documentation-only head must also remain green before merge.

## Follow-up boundary

Production four-image character generation, asset storage and candidate selection are intentionally not fabricated in S42. The visual-canon contract is ready; provider-backed visual generation will be implemented only when a real generation/storage path is introduced and can be verified with tenant, idempotency and consistency tests.
