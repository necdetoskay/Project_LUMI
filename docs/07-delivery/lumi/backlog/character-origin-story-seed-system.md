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
3. Each candidate is shown with a readable short origin story and a compact preview of important consequences/seeds, including its starting inventory package.
4. User selects one candidate.
5. The chosen origin becomes canonical history.
6. Its structured seed package, including inventory items, is committed atomically to character/world state.
7. Unselected candidates are discarded or retained only as non-canonical generation evidence; they must never leak into world continuity.

## Origin inventory starter package

Each origin candidate should normally provide **1 signature origin item + 1–2 supporting starter items**.

### 1. Signature origin item

Exactly one item should normally be strongly tied to the selected origin story. It is not simply loot; it is part of the character's history and can become a long-lived narrative anchor.

Suggested properties:

```text
OriginItem
- id
- ownerCharacterId
- originPackageId
- originEventId
- itemKind
- displayName
- description
- relatedNpcIds[]
- relatedLocationIds[]
- relatedMysteryIds[]
- memoryWeight
- storyPotential
- canonical
```

Example:

```text
Old Brass Compass
- owner: Arin
- origin: The Lantern at the Old Bridge
- related NPC: Mira
- related location: Old Bridge
- mystery: points toward the forest instead of north
- memoryWeight: high
- storyPotential: high
- canonical: true
```

### 2. Supporting starter items

One or two additional items may be derived from character traits and the selected origin. They may be practical, sentimental or exploratory, but should not make one origin mechanically superior to the others.

Examples:

- small notebook for a curious/investigative character;
- Mira's blue thread bracelet as a friendship memory anchor;
- simple field pouch for an explorer;
- pressed leaf from an important origin location;
- hand-drawn map fragment connected to an unresolved mystery.

### Balance rule

Origin choice must not become a loot optimization screen. Candidate packages should be roughly equivalent in mechanical power. Their main differences should be narrative potential, emotional meaning, relationships, mysteries and possible future uses.

A signature item may remain important for dozens of stories without being powerful in a game-stat sense.

## Candidate preview UX direction

The origin-selection UI should show more than prose. A candidate preview can include:

```text
ORIGIN — The Lantern at the Old Bridge

Short origin narrative...

Starting inventory
★ Old Brass Compass
• Small Notebook
• Mira's Blue Bracelet

People from your past
• Mira — shared discovery
• Elderly shopkeeper — knows something about the compass

Known places
• Old Bridge
• Forest Road

Unresolved mysteries
• Why does the compass point toward the forest?
• Why do the bridge lights appear?
```

The purpose is to let the user choose the kind of history and future story potential they want, not simply the best reward.

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

ITEMS
- Signature: Old brass compass
  - owner: Arin
  - mystery: points toward the forest instead of north
- Support: Small notebook
- Support: Mira's blue thread bracelet

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

## Atomic canonicalization

Selecting an origin should commit all consequences as one logical operation:

```text
selected origin narrative
+ origin events
+ NPC relationships
+ memories
+ rumors
+ locations
+ mysteries
+ future hooks
+ 1 signature item
+ 1–2 supporting starter items
= one canonical OriginPackage commit
```

If the operation fails halfway, none of these pieces should remain partially canonical.

## Important rules

- Origin candidates must obey age/safety rules.
- They must respect all selected character properties.
- Seeds must not contradict bootstrap world state.
- Selecting an origin must be atomic: narrative + all structured seeds + inventory become canonical together.
- Unselected candidate seeds/items must never enter NPC memory, inventory, world state, rumor state or story retrieval.
- Every normal candidate should contain one signature origin item; 1–2 supporting items are optional/configurable.
- Generated items should have narrative value rather than automatically being powerful rewards.
- Candidate starter packages should be broadly balanced in mechanical power.
- Not every seed must trigger quickly; some may remain dormant for many stories.
- Future story generation should use relevance/novelty rules so the same origin seed is not repeated constantly.

## ULTEF implications

Future tests should cover at least:

- multiple genuinely distinct origin candidates are generated;
- all candidates preserve selected character traits;
- each candidate contains a valid signature origin item;
- supporting starter items, when generated, remain within configured count limits;
- candidate item packages are not grossly imbalanced in mechanical power;
- selected origin becomes canonical;
- selected origin inventory is committed atomically with the origin package;
- signature item is persisted with correct character ownership and origin provenance;
- supporting items are persisted with correct ownership/provenance;
- unselected origin data and items do not leak into continuity or inventory;
- origin NPC relationship/memory is persisted;
- origin rumor can later become a story hook;
- a signature item can be referenced by a later story without being hallucinated;
- a later generated story can use one dormant origin seed without contradicting the original origin;
- rollback/failure during origin selection leaves no partial inventory or canonical seed state;
- L8 real-provider evaluation checks narrative quality, candidate diversity, item relevance and semantic consistency of generated origin candidates.

## Product value

This makes character creation the first meaningful story experience rather than a form followed by an arbitrary biography. The user chooses not only who the character is, but also the character's first meaningful history, relationships, mysteries and possessions.

The starting inventory then has provenance from the very first moment of the universe: an item seen fifteen stories later can be traced back to the origin the user personally selected instead of being an LLM invention.
