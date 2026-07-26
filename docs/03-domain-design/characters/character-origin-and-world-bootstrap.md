# Character Origin and World Bootstrap

**Version:** 1.0.0
**Status:** Canonical
**Owner:** Domain Design
**Last Updated:** 2026-07-26

## Purpose

This document defines how Project LUMI creates the first playable universe from the initial character origin decision. The character origin is a domain-level input that shapes the first region, home, NPCs, emotional tone and world seed.

## Core Decision

The first universe is character-led.

LUMI must select or generate the character origin before it creates the starting world area. The initial world is not random scenery; it is the natural habitat, contrast, or meaningful exception implied by the chosen character type.

## Origin Package

An Origin Package is the canonical payload accepted at first run.

| Field | Meaning |
| --- | --- |
| character_type | broad type such as human, animal, fantasy, robot, sea creature or sky creature |
| subtype | concrete kind such as fish, fox, dragon, fairy or explorer robot |
| origin_concept | short memorable premise |
| starting_region_archetype | sea, forest, mountain, cloud island, village, laboratory, etc. |
| starting_location | concrete first location |
| home_archetype | home, nest, den, cave, workshop, coral house, cloud home |
| nearby_npc_seed | first companion, neighbor or guide candidate |
| first_mystery_seed | gentle story spark that makes the world feel alive |
| tone_vector | soft tone hints such as wonder, warmth, mystery, humor |
| safety_bounds | constraints inherited from child profile and parent policy |
| novelty_markers | the surprising elements that make the proposal non-generic |

## Type-to-World Affinity

Character type must influence the starting world.

| Character type | Strong affinities | Usually avoid |
| --- | --- | --- |
| Human | village, home, school-like social spaces, forest edge, workshop | inaccessible ocean floor without explanation |
| Land animal | forest, meadow, den, farm, garden, mountain path | deep sea as default |
| Sea creature | ocean, reef, lagoon, river, underwater village | dry desert or mountain as default |
| Sky creature | cloud village, trees, cliffs, floating islands, wind routes | underground cave as default |
| Fantasy creature | magical forest, ancient mountain, crystal cave, portal region | ordinary room with no wonder hook |
| Robot / construct | workshop, observatory, old lab, city, space station | purely wild habitat with no constructed support |

Exceptions are allowed only when the exception is the core premise. For example, a fish may begin inside a floating lighthouse aquarium if the first mystery and home logic explain why the fish can safely live there.

## Bootstrap Sequence

1. Resolve child profile and parent safety policy.
2. Select character type.
3. Choose manual setup or Auto origin generation.
4. Produce candidate Origin Packages.
5. Accept one Origin Package.
6. Create Character aggregate from package fields.
7. Create World aggregate with package-derived seed.
8. Create first Region and Location from affinity rules.
9. Create Home / Nest / Center as the safe return point.
10. Seed nearby NPC candidates and first gentle world event.
11. Persist bootstrap manifest for audit and replay.

## Auto Origin Generator

The Auto Origin Generator creates multiple coherent Origin Packages from the selected character type.

It must optimize for compatibility with selected type, novelty without incoherence, child profile safety, playable first location, meaningful home/center, a gentle first mystery and enough specificity for future story generation.

It must not optimize for pure randomness.

## Refresh Behavior

Refresh is a domain operation that requests a new candidate set. It should keep the selected type and safety constraints but vary the concept, location, NPC, home and mystery. Refresh history may be retained to avoid repeating near-identical ideas in the same first-run session.

## Relationship to World State

The accepted Origin Package becomes part of the initial World Bootstrap Manifest. Later systems may use it to explain why the world started as it did, why the first NPCs exist nearby, and why the first story opportunities are available.

The Origin Package does not directly mutate mature simulation state. It only creates the first consistent state from which simulation can begin.

## Relationship to Character Vectors

The selected type and subtype may initialize trait, need and context vectors, but the child-facing UI must not expose numeric vector values.

Examples:

- a fox may start with high curiosity and cautious trust;
- a fish may start with water-dependence and sound sensitivity;
- a young dragon may start with flight-growth potential and heat affinity.

## Acceptance Criteria

- A new universe requires an accepted Origin Package.
- World bootstrap derives starting region and home from character type affinity.
- Auto generation creates 3-5 distinct candidates.
- Candidate refresh avoids near-duplicates in the same session.
- The bootstrap manifest records the selected package.
- Later sprint implementations treat this document as the canonical first-run character/world creation rule.
