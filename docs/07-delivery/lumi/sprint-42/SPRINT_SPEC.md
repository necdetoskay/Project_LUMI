# Sprint 42 — Character Creation, Origin & Visual Canon

Status: IN PROGRESS
Date: 2026-08-09

## Goal

Transform the existing character-bootstrap implementation into a child-friendly character creation journey that preserves the canonical bootstrap contracts while establishing a durable visual identity contract for every created character.

## Product direction

Character creation must feel like meeting a future story companion, not configuring an AI pipeline. The child/parent should make a small number of meaningful choices, understand the character's personality and origin through narrative language, and leave the flow with one clearly identified canonical character.

The UI must not expose implementation vocabulary such as `archetype`, `handoff`, model IDs, generation sources, OpenRouter configuration, package IDs, backend state, or bootstrap terminology.

## Existing contracts to preserve

- `/app/character-onboarding?childProfileId=...`
- `POST /api/character-bootstrap/generate-archetypes`
- `POST /api/character-bootstrap/handoff`
- `POST /api/character-bootstrap/generate-packages`
- `POST /api/character-bootstrap/consume`
- `GET /api/character-bootstrap/status`
- one-character-per-child-profile guard
- household/profile isolation
- origin package persistence and world-bootstrap handoff

## Scope

### 1. Character creation journey

- Replace technical `Karakter Başlangıç Akışı` framing with a story-first creation experience.
- Present generated character concepts as human-readable companion choices.
- Reduce perceived choice overload: five backend suggestions may remain available, but the screen must guide selection rather than look like a configuration grid.
- Replace `auto/manual`, `archetype`, `origin package`, AI model and provider wording with parent/child-friendly language.
- Keep regenerate/retry capability but phrase it as asking for different ideas.

### 2. Origin selection

- Present origin packages as alternative beginnings for the same selected character concept.
- Surface starting place, home, nearby companion/NPC seed and first mystery in narrative cards.
- Preserve automatic/manual origin modes internally without leaking implementation vocabulary.
- Allow optional character name/subtype refinement only where the current consume contract supports it.

### 3. Visual canon contract

Sprint 42 establishes the canonical product/domain contract for character visuals.

A character visual canon must be able to record:

- stable character identity / character ID
- selected visual candidate
- immutable or versioned visual reference
- appearance descriptor used for later generations
- provenance/model metadata outside child-facing UI
- creation timestamp and canon version
- future consistency/re-generation linkage

The intended UX is four distinct visual candidates followed by one explicit selection. The selected candidate becomes the character's visual canon for later story illustrations.

If the repository does not yet contain a production image-generation/persistence path, S42 must **not fabricate generated images**. In that case the sprint delivers the visual-canon schema/contract and a truthful UI readiness state; actual provider-backed four-image generation is split into the next implementation slice.

### 4. Existing-character experience

- Existing character state becomes a warm continuation surface.
- Remove technical recovery/world-control wording from normal parent UI.
- Keep routes to character detail and world continuation intact.

### 5. Narrative and accessibility

- Turkish copy uses correct diacritics.
- No `Dashboard`, `AI`, model/provider IDs, backend/bootstrap/handoff/package vocabulary on the normal character creation surface.
- Keyboard selection, visible focus, semantic headings and responsive cards are required.
- Reduced-motion preferences remain respected by shared styles.

## Non-goals

- Do not replace the existing character bootstrap/domain pipeline merely for UI reasons.
- Do not introduce a second character per child profile.
- Do not invent visual URLs, generated portraits, provider responses or image-generation success.
- Do not redesign the complete world screen or story reader.
- Do not weaken household isolation or idempotency guards.

## Acceptance criteria

1. Character onboarding reads as a story/companion creation journey rather than a technical bootstrap form.
2. Parent-facing UI contains no archetype/handoff/package/model/provider/backend/bootstrap terminology.
3. Existing generate-archetypes → handoff → generate-packages → consume contracts remain intact.
4. Character concept selection communicates personality and story promise without exposing canonical type as technical metadata.
5. Origin alternatives are presented narratively and can still be selected/confirmed.
6. Existing-character state offers clear continuation actions without technical repair language.
7. Visual canon has an explicit persisted/domain contract before any UI claims a generated portrait is canonical.
8. If four real image candidates cannot be generated from an existing provider path, UI says so truthfully and does not display placeholders as generated results.
9. Character creation remains usable on mobile and desktop and via keyboard.
10. S42 ULTEF contract, CI, Security, Integration and relevant PX regression suites are green before COMPLETE.

## ULTEF mapping

- UX-CHARACTER-CREATION-001
- UX-CHARACTER-CHOICE-LOAD-001
- NARRATIVE-CHARACTER-TECH-LEAK-001
- CHARACTER-ORIGIN-CONTINUITY-001
- CHARACTER-VISUAL-CANON-001
- CHARACTER-VISUAL-TRUTHFULNESS-001
- CHARACTER-SINGLETON-GUARD-001
- S42-CHARACTER-CREATION-CONTRACT-001

## Delivery sequence

1. Inspect the complete character-bootstrap UI, API and persistence contracts.
2. Identify whether a real image-generation/persistence path already exists.
3. Redesign the current three-step UI without changing backend semantics.
4. Add the visual-canon domain/persistence contract at the smallest canonical layer.
5. Connect real visual candidates only if the provider/storage path exists and is testable.
6. Add S42 ULTEF contract coverage for narrative leakage, route/API preservation, singleton guard and visual truthfulness.
7. Run format, lint, typecheck, tests, build, Security, Integration and PX regressions.
8. Record evidence and mark COMPLETE only after the final head is green.
