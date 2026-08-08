# Backlog — Character Origin Story Seed System

Status: BACKLOG
Date: 2026-08-08

## Idea

After the user completes all character traits and bootstrap choices, LUMI should generate several alternative origin stories instead of assigning one fixed backstory.

The user selects the preferred origin story. The selected story becomes canonical character history and also acts as an initial future-story seed package.

## Core principle

An origin story must not be decorative biography only.

Every generated origin candidate should contain structured narrative seeds that can produce future stories and continuity:

- past events;
- rumors / unresolved claims;
- meaningful items;
- NPC relationships;
- locations;
- promises or unfinished goals;
- mysteries;
- memories;
- emotional anchors;
- optional future hooks.

These seeds should be persisted as structured canonical state, not extracted later only from prose.

## Proposed creation flow

1. User completes the character definition: identity, traits, interests, temperament, archetype, appearance and other canonical character properties.
2. LUMI generates 3–4 origin-story candidates that all respect the selected character properties but differ meaningfully in narrative direction.
3. Each candidate is shown with a readable short origin story and a compact preview of important consequences/seeds.
4. User selects one candidate.
5. The chosen origin becomes canonical history.
6. Its structured seed package is committed to character/world state.
7. Unselected candidates are discarded or retained only as non-canonical generation evidence; they must never leak into world continuity.

## Candidate differentiation

Origin candidates should not be superficial rewrites of the same plot. They should create genuinely different story possibilities, for example:

- exploration / mystery origin;
- friendship / community origin;
- discovery / lost-item origin;
- nature / unusual-event origin.

All candidates must remain compatible with the same user-selected character traits.

## Example

Character: Arin

Origin candidate: **The Lantern at the Old Bridge**

Readable origin:
Arin once followed a strange light near the old bridge with Mira. They found an old brass compass under a loose stone, but before they could understand why it pointed toward the forest instead of north, an elderly shopkeeper warned them not to follow it after sunset.

Structured seeds:

```text
EVENT
- Arin and Mira discovered a strange light near the old bridge.

ITEM
- Old brass compass
- owner: Arin
- mystery: points toward the forest instead of north

NPC
- Mira: shared discovery / trust anchor
- elderly shopkeeper: knows something about the compass

RUMOR
- bridge lights appear before unusual events

LOCATION
- old bridge
- loose stone hiding place

UNRESOLVED THREAD
- Why does the compass point to the forest?

FUTURE HOOKS
- investigate the bridge lights
- find the shopkeeper again
- follow the compass safely
- discover who previously owned the compass
```

One origin can therefore naturally provide several future stories without inventing unrelated continuity later.

## Suggested data model direction

Treat the selected origin as an `OriginPackage` with both narrative and structured fields, for example:

```text
OriginPackage
- id
- characterId
- candidateId
- narrative
- events[]
- rumors[]
- items[]
- npcRelations[]
- locations[]
- memories[]
- mysteries[]
- promises[]
- futureHooks[]
- generationMetadata
- selectedAt
- canonicalVersion
```

The story text is the human-facing expression; the structured package is the simulation/story-engine contract.

## Important rules

- Origin candidates must obey age/safety rules.
- They must respect all selected character properties.
- Seeds must not contradict bootstrap world state.
- Selecting an origin must be atomic: narrative + all structured seeds become canonical together.
- Unselected candidate seeds must never enter NPC memory, inventory, world state, rumor state or story retrieval.
- Generated items should have narrative value rather than automatically being powerful rewards.
- Not every seed must trigger quickly; some may remain dormant for many stories.
- Future story generation should use relevance/novelty rules so the same origin seed is not repeated constantly.

## ULTEF implications

Future tests should cover at least:

- multiple genuinely distinct origin candidates are generated;
- all candidates preserve selected character traits;
- selected origin becomes canonical;
- unselected origin data does not leak into continuity;
- origin item is persisted in the correct ownership scope;
- origin NPC relationship/memory is persisted;
- origin rumor can later become a story hook;
- a later generated story can use one dormant origin seed without contradicting the original origin;
- L8 real-provider evaluation checks narrative quality and semantic consistency of generated origin candidates.

## Product value

This makes character creation the first meaningful story experience rather than a form followed by an arbitrary biography. More importantly, it creates a coherent reservoir of future narrative material at the exact moment the character enters the universe.
