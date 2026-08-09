# Sprint 42 — Character Creation, Origin & Visual Canon

Status: IN PROGRESS
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

## Scope

1. Story-first character idea selection.
2. Narrative origin/beginning selection.
3. Optional name/subtype refinement using existing consume contract.
4. Warm existing-character continuation state.
5. Visual-canon contract for future four-candidate generation and explicit selection.
6. Responsive, keyboard-accessible UI and Turkish copy cleanup.
7. Dedicated ULTEF source/runtime contract plus repository regression gates.

## Acceptance criteria

1. Character onboarding no longer reads like a technical bootstrap form.
2. Technical AI/provider/backend vocabulary does not appear in normal user-facing copy.
3. Existing five character-bootstrap endpoints remain referenced and protected.
4. Origin options remain selectable and persist through existing consume semantics.
5. Existing-character singleton state routes users to continuation rather than duplicate creation.
6. Visual readiness state clearly says placeholders are not generated images.
7. Visual canon contract defines tenant isolation, explicit selection, versioning, provenance and idempotency requirements.
8. CI, Security, Integration, PX and S42 ULTEF gates are green before COMPLETE.

## ULTEF mapping

- UX-CHARACTER-CREATION-001
- UX-CHARACTER-CHOICE-LOAD-001
- NARRATIVE-CHARACTER-TECH-LEAK-001
- CHARACTER-ORIGIN-CONTINUITY-001
- CHARACTER-VISUAL-CANON-001
- CHARACTER-VISUAL-TRUTHFULNESS-001
- CHARACTER-SINGLETON-GUARD-001
- S42-CHARACTER-CREATION-CONTRACT-001
