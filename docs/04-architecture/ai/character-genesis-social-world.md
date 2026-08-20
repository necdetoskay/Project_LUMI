# LUMI Character Genesis, Social World and Origin Architecture

Status: **Proposed canonical architecture for implementation after Test Lab baseline**

Related work:
- Test Lab Epic: #291
- Prompt Registry & Onboarding AI Management: #199
- Context Assembly Engine: #203
- Genesis / Living World foundation: #240

## 1. Purpose

The current onboarding pipeline can create a character identity, origin, world and location, but a complete LUMI character must enter the first story as someone who already has a life.

This document defines the missing canonical genesis layer between onboarding generation and the first story. The goal is to create a coherent, inspectable and evolvable starting state containing:

- a deep origin narrative;
- structured origin facts;
- Character DNA;
- dynamic emotional state;
- contextual fears and sensitivities;
- preferences, needs and goals;
- home, family and local community;
- important NPCs and directional relationships;
- an initial inventory with provenance and meaning;
- climate, season, weather and day-phase binding;
- memory seeds;
- unresolved origin threads that can generate future stories.

The user must not be forced to read this material during onboarding. The rich state exists primarily to make the universe coherent and story-generative. A short summary can be shown by default, while the full past remains available on demand.

## 2. Core product principle

A newly created LUMI character is not born at the first story.

The first story is the first story the user sees, not the first event in the character's life.

Therefore onboarding must produce two views of the same canonical past:

1. **Operational origin summary** — compact context suitable for UI and frequent LLM use.
2. **Canonical deep origin** — a richer narrative and structured fact set describing the character's pre-existing life.

The deep origin is not decorative lore. It is a reservoir of future story material.

## 3. Canonical genesis sequence

The target conceptual sequence is:

```text
Character Type
  -> Character Identity
  -> World / Region / Home binding
  -> Deep Origin Generation
  -> Structured Origin Extraction
  -> Character DNA Derivation
  -> Dynamic / Contextual State Initialization
  -> Social Genesis
  -> Inventory Genesis
  -> Memory Seed + Origin Thread Extraction
  -> Initial World State binding
  -> Genesis Validation
  -> Canonical Universe Commit
  -> First Story
```

The exact UI order can differ from the internal derivation order when needed, but the committed result must be internally consistent.

## 4. Two-layer origin model

### 4.1 Operational origin summary

A short, stable summary intended for:

- onboarding cards;
- compact character profile views;
- low-cost context assembly;
- search and retrieval metadata.

Typical size: 10–60 words.

Example:

> Miro is a curious young fox who lives with his family in Ağaçköprü, explores old paths with Lina, and carries a brass compass inherited from his grandfather.

### 4.2 Canonical deep origin

A coherent pre-first-story biography written with enough depth to support later narrative reuse.

Target guideline, not a hard token rule:

- light character: 150–250 words;
- normal character: 300–500 words;
- lore-heavy character: 500–800 words when justified.

The system must prefer useful narrative density over arbitrary length.

A good origin should usually contain some combination of:

- family or caregiver context;
- home and community life;
- one or more meaningful relationships;
- formative experiences;
- ordinary routines;
- meaningful places;
- fears or sensitivities with plausible causes;
- early skills or interests;
- meaningful possessions;
- incomplete mysteries or unanswered questions;
- future-facing hooks.

The origin must not resolve every question. Deliberate incompleteness is required for long-horizon storytelling.

## 5. Structured origin representation

The narrative must be accompanied by machine-usable structured state.

Proposed conceptual contract:

```json
{
  "originSummary": "...",
  "originNarrative": "...",
  "originFacts": [],
  "importantPeople": [],
  "importantPlaces": [],
  "pastEvents": [],
  "possessions": [],
  "fears": [],
  "skills": [],
  "preferences": [],
  "unresolvedThreads": [],
  "secrets": [],
  "futureHooks": []
}
```

This structure prevents every later model call from requiring the entire narrative.

The Context Assembly Engine should retrieve only relevant origin fragments when possible.

## 6. Character DNA

Character DNA represents relatively slow-changing behavioral tendencies.

The initial core should remain intentionally small. Adding many sliders without clear downstream use creates false precision and maintenance cost.

Recommended initial core axes:

```text
curiosity
courage
empathy
sociability
patience
imagination
persistence
independence
playfulness
caution
adaptability
```

Possible later additions require evidence from Test Lab that they materially improve generation or simulation.

Each value is normalized to `[0,1]`.

### 6.1 Character DNA must not be pure random

The system should not ask an LLM to invent arbitrary values such as `0.873291` and persist them as truth.

Preferred derivation:

```text
identity + archetype + origin evidence + child/profile constraints + world context
  -> semantic trait estimate
  -> canonical range
  -> deterministic seeded variation
  -> normalized Character DNA
```

Example:

```text
semantic trait: curiosity = high
canonical range: 0.80–0.90
universe-seeded result: 0.86
```

Randomness is used only for bounded diversity, not as the primary source of personality.

### 6.2 Origin must explain DNA

The origin and numeric traits must support each other.

If `courage = 0.35`, the origin should not repeatedly describe a character who fearlessly charges into danger.

The system should preserve evidence linking important trait values to origin facts when practical.

## 7. Dynamic state

Dynamic state is separate from Character DNA.

Examples:

```text
happiness
anxiety
confidence
energy
loneliness
excitement
```

Dynamic values may change significantly across events and stories.

Character DNA should normally move only through long-term learning or accumulated evidence.

This distinction prevents short-term mood from rewriting the character's identity.

## 8. Learned traits and long-term evolution

LUMI characters should be able to grow.

A useful model is:

```text
base trait
+ learned modifier
= effective current trait
```

Example:

```text
base courage      = 0.42
learned modifier  = +0.08
current courage   = 0.50
```

Long-term modifiers should change slowly and require repeated evidence, meaningful milestones or explicit outcome rules.

A single story should rarely cause a large permanent DNA shift.

## 9. Contextual fears, comforts and sensitivities

Fear should not be modeled as a single global opposite of courage.

A character may be generally courageous and still fear deep water.

Conceptual representation:

```json
{
  "fears": {
    "darkness": 0.18,
    "being_alone": 0.62,
    "storms": 0.31,
    "deep_water": 0.74
  },
  "comforts": {},
  "sensitivities": {}
}
```

These values should be created only when justified by origin, species/type, environment or later lived events.

## 10. Preferences, needs and goals

These are separate concepts.

### Preferences

Examples:

```text
likes_exploration
likes_puzzles
likes_social_activity
likes_nature
```

### Needs

Examples:

```text
belonging
recognition
security
autonomy
discovery
```

### Goals

Goals are semantic objects rather than personality sliders.

Examples:

- learn to swim better;
- discover what the old compass points toward;
- visit Yıldız Tepesi with Lina.

Goals can become completed, abandoned, superseded or transformed.

## 11. Social Genesis

Social Genesis runs after enough world/location context exists to place the character into a real community.

It must answer:

- Who does the character live with?
- Who matters to the character?
- Who already knows the character?
- What social roles exist around the character?
- Which relationships already contain affection, trust, rivalry, responsibility or tension?

The first story should not introduce the character into an empty world unless the chosen concept explicitly requires isolation.

### 11.1 Initial NPC count

Do not generate a huge community graph at onboarding.

Recommended initial approach:

- 3–6 significant NPCs;
- lightweight community roles or latent slots;
- generate and canonize additional NPCs only when the story/world needs them.

### 11.2 Social roles

Examples:

```text
family
caregiver
sibling
friend
rival
mentor
neighbor
community_member
authority
merchant
mysterious_stranger
```

Role is not relationship quality.

Two siblings may have high affection and high tension.

## 12. Directional relationship graph

Relationships must be directional.

`Miro -> Lina` and `Lina -> Miro` are separate edges.

Proposed dimensions:

```text
trust
affection
familiarity
respect
tension
dependence
```

Example:

```json
{
  "from": "miro",
  "to": "lina",
  "trust": 0.76,
  "affection": 0.81,
  "familiarity": 0.92,
  "respect": 0.64,
  "tension": 0.08,
  "dependence": 0.31
}
```

These values should evolve through world and story events rather than being rewritten by prose alone.

## 13. NPC personality model

Significant NPCs need enough internal state to behave consistently.

They may use a lighter version of Character DNA rather than the full main-character profile.

Example:

```text
curiosity
courage
empathy
sociability
patience
playfulness
```

The exact reduced schema should be benchmarked in Test Lab before expansion.

## 14. Inventory Genesis

A character should normally begin with a few possessions that imply an existing life.

The inventory must not feel like arbitrary loot.

Recommended initial distribution:

```text
2 ordinary / everyday items
1 personality-related item
1 relationship-related item
0–1 legacy or mystery item
```

Typical total: 3–5 items.

Examples:

- a small water bottle;
- sketchbook;
- blue stone given by a friend;
- old brass compass inherited from a grandfather.

### 14.1 Item provenance

Genesis items should support provenance metadata such as:

```text
origin
givenBy
acquiredAt
emotionalValue
storyPotential
```

An item with historical significance can become a future story hook without being immediately explained.

### 14.2 Inventory is canonical state

Genesis inventory must use the same canonical inventory/item lifecycle used later by stories.

Do not create an onboarding-only parallel item model.

## 15. Memory seeds

The character should start with a small set of memories from before the first user-visible story.

Typical target: 3–5 meaningful memory seeds.

Examples:

- getting lost briefly during a storm;
- meeting a close friend by the river;
- receiving an old compass;
- seeing unexplained lights in the forest.

Memory seeds should be compact, structured and retrievable.

They are not a substitute for the origin narrative; they are retrieval anchors into the past.

## 16. Origin Threads

Unresolved origin material becomes persistent `Origin Threads`.

Examples:

- Where did the grandfather obtain the compass?
- Why does the compass sometimes point toward the mountains?
- Why does a caregiver forbid travel to the northern forest?
- What is the blue stone?

Conceptual representation:

```json
{
  "id": "grandfather_compass",
  "status": "unresolved",
  "visibility": "known_to_character",
  "potential": 0.88,
  "source": "origin"
}
```

Possible statuses:

```text
dormant
unresolved
active
partially_resolved
resolved
abandoned
```

Threads are not mandatory story quests. They are optional narrative opportunities.

The story planner may activate them when relevant to current world state, relationships, season, character goals or long-term arc needs.

## 17. Future story yield

Origin quality must not be judged only by prose quality.

A strong origin should generate reusable material.

Test Lab should eventually score or inspect:

- coherent origin facts;
- meaningful relationships;
- usable memories;
- meaningful items;
- justified traits;
- unresolved threads;
- future hooks;
- contradiction rate;
- duplicate/redundant hook rate;
- child-age suitability;
- continuity potential.

This can be summarized as **future story yield**.

## 18. World, habitat, climate and season

These concepts must remain separate.

### Habitat / region

A relatively persistent place where the character lives.

### Climate

A persistent environmental property of that region.

Examples:

```text
temperate_forest
mountain
coastal
arid
subarctic
fantastical_luminous
```

### Season

A current or slowly changing world-state property.

### Weather

A short-lived world-state property.

### Day phase

A short-lived local world-state property.

The character's home should not be chosen merely because of the current season.

Correct logic:

```text
character identity / species / concept
  -> compatible habitat candidates
  -> selected region/home
  -> region climate
  -> current season
  -> current weather / local conditions
```

A woodland village remains the same village across seasons; its presentation and available events change.

## 19. Real-world calendar vs universe calendar

LUMI should maintain its own canonical universe date/time/season state.

Real-world date may provide a soft initialization signal but must not override world lore.

Priority order:

```text
world lore
> region climate
> universe calendar
> real-world calendar soft preference
```

A snow-world can remain snowy in August. A tropical world may not use four temperate seasons.

Fantasy worlds may define custom seasonal cycles.

Example:

```text
spring
summer
goldenfall
deepglow
```

The season system must support world-specific vocabularies or mappings without breaking canonical environmental semantics.

## 20. User experience

The full genesis process must not overload onboarding.

Default onboarding UI should show concise summaries and selections.

The user may later open deeper views such as:

- Full Past / Origin;
- Family and Friends;
- Important Memories;
- Inventory and item history;
- Character traits;
- unresolved mysteries, where disclosure is appropriate.

Not every secret or hidden thread should be shown to the user if doing so would spoil future discovery.

## 21. Visibility and knowledge boundaries

Origin facts and threads may require visibility metadata.

Examples:

```text
known_to_character
known_to_family
known_to_npc
unknown_to_character
user_visible
system_only
```

This prevents the system from spoiling information the character should discover later.

It also prevents an LLM from narrating hidden facts as if the character already knows them.

## 22. Canonical state versus generated prose

Generated prose is not sufficient as state.

The architecture must preserve this rule:

> Narrative describes state; canonical domain objects own state.

If the origin says Lina is Miro's friend, the relationship graph must contain the canonical relationship.

If the origin gives Miro a compass, canonical inventory must contain the item.

If the origin describes a fear of storms, the contextual trait state must record it.

If the origin mentions an unresolved tower mystery, a canonical Origin Thread should exist when that fact is intended for future reuse.

## 23. Genesis validation

Before commit, the complete genesis package must be validated for cross-domain consistency.

Examples of invalid states:

- origin mentions a sibling who does not exist in social state;
- inventory contains an heirloom whose giver is absent from origin facts;
- DNA says extremely low curiosity while the origin repeatedly defines an obsessive explorer, without a justified exception;
- world is tropical but current environmental state claims ordinary regional snow without lore support;
- a relationship edge references a nonexistent NPC;
- a secret marked unknown_to_character is included in character-facing memory;
- duplicate NPC identities created by origin and Social Genesis;
- future hook contradicts a fact already resolved in the origin.

Validation should prefer deterministic rules for structural invariants and reserve LLM judge use for semantic coherence.

## 24. Commit semantics

Genesis should be staged before canonical commit.

Preferred behavior:

```text
generate candidate package
-> inspect / validate
-> select candidate
-> derive canonical objects
-> cross-check
-> atomic universe commit
```

Partial genesis commits should be avoided unless the existing domain architecture explicitly supports resumable staged onboarding state.

The Test Lab must operate in sandbox state and never mutate production universe state during experiments.

## 25. Test Lab integration

Test Lab is the qualification surface for this architecture.

New or expanded observable stages should include:

1. Origin Generation
2. Structured Origin Extraction
3. Character DNA Derivation
4. Social Genesis
5. Inventory Genesis
6. Initial World/Season State
7. Genesis Validation
8. First Story Context Preview

The exact production implementation can combine calls where cost/latency is justified, but Test Lab should expose enough intermediate state to diagnose failures.

### 25.1 What Test Lab must inspect

For each stage, retain:

- rendered system/user prompt where an LLM is used;
- model and provider;
- token usage;
- API cost;
- latency;
- raw candidate output;
- parsed canonical candidate;
- validation findings;
- selected candidate;
- state diff;
- downstream context generated from the selection.

### 25.2 Origin-specific quality dimensions

Suggested rubric dimensions:

```text
coherence
age_suitability
character_specificity
world_consistency
relationship_depth
past_life_believability
trait_evidence
item_integration
memory_quality
open_thread_quality
future_story_yield
redundancy
contradictions
```

### 25.3 Social Genesis quality dimensions

Suggested checks:

```text
NPC distinctiveness
relationship asymmetry where plausible
role diversity
family/community coherence
absence of unnecessary NPC explosion
relationship-to-origin consistency
usable future interaction potential
```

### 25.4 Inventory quality dimensions

Suggested checks:

```text
mundane grounding
personal relevance
relationship provenance
legacy/mystery restraint
non-randomness
future usability
world compatibility
```

### 25.5 Season/world checks

Suggested checks:

```text
habitat persistence
climate compatibility
season compatibility
weather plausibility
world-lore override correctness
custom-season support
```

## 26. Context Assembly integration

The Context Assembly Engine must not inject the full genesis package into every prompt.

Recommended retrieval layers:

### Always-small identity core

- character summary;
- core traits when relevant;
- current dynamic state;
- current location/world state.

### Relationship-aware retrieval

When an NPC is involved, retrieve:

- directional relationship edge;
- relevant shared memories;
- unresolved threads involving that NPC.

### Item-aware retrieval

When an item is used or mentioned, retrieve:

- item provenance;
- emotional significance;
- previous use/history;
- linked origin threads.

### Origin retrieval

Retrieve only origin facts relevant to the current story intent, location, NPCs, items, fears, goals or active threads.

This architecture should align with #203 rather than introducing a second context system.

## 27. Story engine integration

The story engine may use genesis state as candidate material, not as a requirement to consume every hook.

Useful story opportunity sources include:

```text
active goals
unresolved origin threads
relationship changes
seasonal opportunities
world events
meaningful inventory items
fears / growth opportunities
memory echoes
community needs
NPC emergent actions
```

A story planner should balance new content against callbacks to existing material.

The system should avoid repeatedly reusing the same high-potential hook simply because it scores highly.

## 28. Evolution after stories

After each story, outcome processing may update:

- dynamic state;
- relationship graph;
- inventory;
- memories;
- goals;
- origin thread status;
- learned trait modifiers;
- world state.

The original origin narrative itself should generally remain historical record.

New events should be appended to life history rather than rewriting the past, except for explicit correction/migration workflows.

## 29. Recommended implementation boundaries

Do not implement this as one giant LLM call whose JSON becomes the database.

Prefer separable responsibilities:

```text
Origin Generator
Structured Origin Extractor / normalizer
Trait Derivation Engine
Social Genesis Engine
Inventory Genesis Engine
World Initializer
Genesis Validator
Canonical Commit Service
```

Some steps may share one provider call as an optimization later, but the domain contracts should remain separate and inspectable.

## 30. Determinism and reproducibility

Genesis should support a persisted seed or equivalent provenance so Test Lab can distinguish prompt/model changes from random variation.

Persist sufficient provenance for:

- model/provider;
- prompt revision;
- generation configuration;
- random/selection seed;
- parser/schema revision;
- canonical derivation revision;
- validation revision.

The same input snapshot should be reproducible enough for meaningful comparisons even when exact generative text is nondeterministic.

## 31. Cost discipline

Deep origin and social genesis add LLM work, so cost must remain visible.

Test Lab already exposes per-run token usage/cost; this architecture should use that instrumentation rather than adding a separate accounting path.

Optimization candidates after quality is proven:

- combine tightly coupled generation/extraction calls;
- use smaller models for structured normalization;
- deterministic derivation for numeric DNA;
- cache immutable origin facts;
- avoid regenerating genesis when only a downstream stage changes;
- retrieve origin fragments instead of resending full narrative.

Quality and state correctness take priority over premature call minimization during initial qualification.

## 32. Safety and child suitability

All origin and social generation must follow LUMI child-safety rules.

Deep origin must not become a mechanism for adding inappropriate tragedy merely to create narrative depth.

Depth should come primarily from:

- relationships;
- discovery;
- ordinary life;
- aspirations;
- minor fears;
- misunderstandings;
- mysteries;
- growth;
- community;
- age-appropriate challenges.

## 33. Migration and compatibility

Existing characters may lack deep origin, DNA, social graph, memory seeds or provenance-rich inventory.

Implementation must define a migration/backfill policy separately.

Possible safe modes:

```text
legacy_read_only
lazy_backfill
explicit_upgrade
```

Do not silently invent major historical facts for an established character without a controlled migration rule.

## 34. Initial canonical example

A complete genesis package may conceptually resemble:

```text
Miro
├── Identity
│   ├── young fox
│   └── curious cautious explorer
├── Home
│   └── Ağaçköprü / Yosun Valley
├── Deep Origin
│   └── family, grandfather, lost paths, Lina, storm memory
├── Character DNA
│   ├── curiosity .86
│   ├── courage .46
│   ├── empathy .78
│   ├── imagination .91
│   └── caution .68
├── Contextual State
│   └── storm fear .72
├── Social Graph
│   ├── Mara — caregiver
│   ├── Tavi — younger sibling
│   ├── Lina — close friend
│   └── Piko — older neighbor / mentor
├── Inventory
│   ├── water bottle
│   ├── small rope
│   ├── sketchbook
│   ├── blue stone from Lina
│   └── grandfather's brass compass
├── Memory Seeds
│   ├── storm incident
│   ├── first meeting with Lina
│   └── receiving the compass
├── Origin Threads
│   ├── compass points toward mountains
│   ├── old observation tower
│   └── unknown history of blue stone
└── Initial World State
    ├── autumn
    ├── light rain
    └── cool evening
```

The first story can now begin inside an already meaningful life rather than constructing all context on demand.

## 35. Explicit non-goals for the first implementation

Do not begin with:

- dozens of DNA axes;
- full simulation for every village resident;
- hundreds of NPCs;
- permanent trait changes after every story;
- mandatory user reading of the full origin;
- forcing every origin thread into a future story;
- making every starting item magical or mysterious;
- coupling real-world seasons rigidly to the fantasy world;
- sending the entire origin narrative to every LLM call;
- creating a second relationship/inventory/context system solely for onboarding.

## 36. Delivery strategy

Implementation should proceed in vertical, testable slices.

Recommended order:

1. canonical contracts and schemas;
2. deep origin + structured extraction;
3. Character DNA derivation and contextual state;
4. Social Genesis + directional relationships;
5. Inventory Genesis + provenance;
6. memory seeds + Origin Threads;
7. season/climate/world initialization;
8. Genesis Validator + atomic commit;
9. Context Assembly integration;
10. Test Lab stage expansion and quality rubrics;
11. First Story integration;
12. existing-character migration policy.

Each slice should be qualified in Test Lab before the next layer becomes relied upon by production storytelling.

## 37. Definition of Done

This architecture is implemented when:

- every new character can possess a coherent deep pre-first-story history;
- a short summary and detailed origin derive from the same canonical facts;
- Character DNA is evidence-based and bounded rather than arbitrary random output;
- dynamic state and contextual fears are separated from slow-changing DNA;
- significant NPCs exist before the first story when conceptually appropriate;
- relationships are canonical and directional;
- starting inventory contains meaningful provenance-aware items;
- memories and unresolved Origin Threads can be retrieved independently;
- habitat, climate, season and weather are modeled separately;
- fantasy/custom seasonal systems are supported without breaking environmental semantics;
- hidden knowledge cannot leak into character-visible context;
- Genesis Validation detects cross-domain contradictions before canonical commit;
- Context Assembly retrieves only relevant genesis information;
- the first story consumes the committed genesis state;
- Test Lab can inspect prompts, outputs, structured state, validation, token usage, cost and downstream context;
- quality evaluation includes future story yield, not prose quality alone;
- implementation does not introduce parallel onboarding-only relationship, inventory or context models;
- automated tests and relevant Test Lab qualification scenarios are green.

## 38. Architectural decision summary

The central decision is:

> LUMI onboarding does not merely generate a character description. It performs a controlled genesis process that creates the character's pre-existing life and binds that life into canonical world state before the first story.

This gives the story engine durable material to rediscover, develop and transform across long horizons while preserving inspectability, consistency and cost control.