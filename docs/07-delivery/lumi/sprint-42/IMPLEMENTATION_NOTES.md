# Sprint 42 Implementation Notes

## Repository findings

The existing character bootstrap already provides a production persistence path for character concepts and origin state:

`generate-archetypes -> handoff -> generate-packages -> consume -> LumiCharacter`

The current `lumi_characters` record persists origin concept, starting region/location, home archetype, nearby NPC seed, first mystery seed, universe seed, lifecycle state and household/child scope.

No production image-generation + durable character asset persistence path was found in the current bootstrap surface. S42 therefore treats four-candidate visual generation as a truthful follow-up integration rather than fabricating placeholder output.

## Implemented in S42

- Character onboarding rewritten as story-first `Karakterinle tanış` journey.
- Technical implementation copy removed from the normal creation surface.
- Generated concept API semantics preserved internally.
- Origin packages reframed as alternative past/beginning stories.
- Existing-character state reframed as continuation rather than repair/debug state.
- Visual canon product/domain contract documented with tenant/idempotency/continuity invariants.
- UI explicitly distinguishes visual-canon readiness placeholders from real generated assets.
- S42 source and runtime ULTEF contracts added.

## Deferred production slice

Provider-backed visual candidate generation requires a real image provider adapter plus durable/referenceable asset storage. That wiring must deliver one generation batch containing four candidate references, explicit selection, persisted visual canon and later illustration conditioning. It must not be simulated in UI before those boundaries exist.
