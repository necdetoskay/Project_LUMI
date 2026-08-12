# Story Visual Continuity and Asset Orchestration

Status: canonical implementation plan for Issue #121.

## Core rule

LUMI must never equate an asset category with a concrete visual identity. Two `compass` items may be different physical objects, while one character may have multiple contextual appearances without becoming multiple characters.

The canonical hierarchy is:

`Entity -> Variant -> State -> Style Render`

An **Entity** is the concrete thing. A **Variant** is a contextual appearance of the same entity. A **State** is an operational condition. A **Style Render** is the generated representation under a versioned visual style.

Examples:

- old brass compass and modern plastic compass: two entities, same category
- Mira in desert clothing and Mira in winter clothing: one entity, two outfit variants
- village square by day and in rainy night: one environment entity, two condition variants
- potion full / half / empty: one item entity, three states

## Story Visual Manifest

Every story can own a persistent Story Visual Manifest. New stories produce it during generation/editing; existing stories can receive one through a backfill extractor.

The manifest records concrete entity requirements, identity traits, variants, required operational states, scene usage, visual importance and story-specific illustration requirements. LLM extraction proposes this information, but deterministic domain validation decides whether it is accepted.

The LLM may identify that a story contains two compasses. It must give them separate manifest identities when their physical identities differ. State policy remains governed by the LUMI registry and validation layer rather than free-form LLM output.

## Scene continuity

Each scene binds to exact manifest entities plus optional variant and state. This prevents a brass compass from becoming plastic in a later scene, a character from wearing the wrong outfit, or an environment from silently changing condition.

Character identity and appearance are deliberately separate. Face, age, proportions and canonical identity remain stable while an outfit/context variant changes.

## Story Visual Asset Set

A Story Visual Asset Set is one concrete rendering of a manifest in a selected `styleId + styleVersion`. A story can have multiple sets, for example Storybook and Paper Cut. Creating or activating another set never rewrites the story text and does not destroy older sets.

Style resolution is layered:

`system default -> household/profile -> universe -> story -> asset override`

The resolved style is snapshotted into the asset set so later preference changes do not silently mutate historical story art.

## Reuse and fingerprints

Reuse is allowed only when the concrete entity identity or canonical reference matches and the requested variant, state, style/version and prompt compiler provenance are compatible. Category alone is never sufficient for reuse.

This means two different compass instances can never collapse because both have category `compass`, while the same canonical compass can be reused across multiple stories when the requested representation matches.

## Generation lifecycle

Story generation/editing creates or updates the Visual Manifest. The manifest is validated and resolved against existing entities/assets before generation. Expensive image generation begins after the user commits/saves the story.

Story persistence and image generation are independent transactions. A provider failure must never make a successfully saved story fail or disappear. Visual jobs run asynchronously with retry, idempotency and visible progress.

## Asset Sheet Planner

Missing renders are handed to an Asset Sheet Planner. The planner may pack multiple distinct entities and multiple states into one provider image to reduce cost, but it must retain deterministic cell mapping.

Rules:

- keep all requested states of one entity together when practical
- never merge two concrete entities merely because they share a category
- keep explicit cell -> entity -> variant -> state mapping
- obey provider/model panel and detail limits
- consider target output resolution, visual importance and estimated cost
- fail closed if the output cannot be mapped or validated reliably

A single sheet can therefore contain an old compass, a new compass, a potion and a bag, while still producing separately registered renders for each concrete identity/state.

## Visual Library

The Visual Library becomes a catalog, inspection, repair and override surface rather than the primary place where users manually decide which raw assets to generate.

Target navigation:

- Stories
- Characters
- Items (bags included)
- Environments

Story pages show visual readiness and asset sets. Entity pages show variants, states and style renders. Manual controls remain for repair, regeneration, missing states and alternate styles.

## Delivery sequence

1. Domain foundation: manifest/entity/variant/state/scene-binding/asset-set contracts and invariants.
2. Manifest extraction contract: structured LLM schema, state registry resolution, entity-resolution rules and old-story backfill.
3. Missing asset resolver: exact reuse and missing variant/state/style planning.
4. Asset Sheet Planner: cost-aware deterministic packing and output mapping.
5. Post-save orchestration: async jobs, retries, status and story-save isolation.
6. Multi-style Story Visual Asset Sets and old-story restyling.
7. Visual Library refactor to Stories / Characters / Items / Environments and removal of the separate Bag generation surface.
8. Story Book integration with visual progress, style choice, regeneration and scene bindings.

## Acceptance invariants

- Same category does not mean same entity.
- Entity, variant and state are separate concepts.
- Character outfit changes never create a new character identity.
- Environment condition changes do not require an unrelated environment identity.
- A story may have multiple complete visual sets in different styles.
- Existing stories can be backfilled and restyled.
- Exact matching assets can be reused; missing renders can be batched.
- Story save success is independent from image generation success.
- Every published render has entity, variant, state, style/version and generation provenance.
