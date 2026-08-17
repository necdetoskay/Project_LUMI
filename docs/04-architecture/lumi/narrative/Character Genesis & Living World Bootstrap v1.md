# Character Genesis & Living World Bootstrap v1

Status: Canonical architecture proposal  
Epic: #240  
Related: #159, #163, #203, #208, #233

## 1. Purpose

LUMI must not treat character creation as the creation of an isolated avatar. A committed character needs a coherent **life condition** before the first story begins: where it came from, what it currently needs, what it believes, what remains unknown, what kind of social/ecological environment surrounds it, and what long-horizon tension can sustain many future stories.

This architecture defines the canonical bridge:

```text
character concept
  -> genesis
  -> saga foundation
  -> final foundation commit
  -> living-world bootstrap
  -> initial opportunities
  -> first story
```

The goal is not to pre-write a fixed series. The goal is to establish a durable, surprising and internally coherent starting state from which many different stories can emerge.

## 2. Core principle: life condition, not species template

Character type/species is an input, never a social-topology rule.

Forbidden design:

```text
if human => mother + father + sibling + neighbour
if robot => creator
if dragon => dragon family
```

Canonical design:

```text
Character + World + Accepted Onboarding Facts
  -> Genesis
  -> Current Situation
  -> Required Social/Ecological Roles
```

Examples:

- a human may be rooted in a family, lost, adopted, exiled, memoryless, or alone;
- a dragon may hatch alone, belong to a clan, or be protected by another species;
- a robot may have a creator, a household, a colony, a facility AI, fragmented inherited memories, or no known origin;
- an aquatic character may live in a pod/school, symbiotic reef community, migratory group, or isolated deep-sea habitat.

The system therefore models **how this life began**, not just **what kind of creature this is**.

## 3. Canonical pipeline

```text
Child Context
    |
    v
Character Concept
    |
    v
World Fit / accepted world facts
    |
    v
Genesis Concept Expansion
    |
    v
Creative Divergence
    |
    v
Cliche + Coherence + Long-Horizon Evaluation
    |
    v
Final Genesis
    |
    +--> Current Situation
    +--> Social Ecology intent
    +--> Immediate Need
    +--> Medium-term direction
    |
    v
Core Tension
    |
    v
Saga Foundation / Truth Ledger
    |
    v
Final Review
    |
    v
Foundation Commit
    |
    v
Living World Bootstrap
    |
    +--> canonical NPC identity/runtime
    +--> initial relationships
    +--> home/local-area facts
    +--> world-event seeds
    +--> rumor/clue seeds
    +--> opportunity seeds
    |
    v
Child Dashboard / New Adventure
```

The bootstrap runs only after a successful final foundation commit.

## 4. Character Genesis

Character Genesis is the structured answer to:

- Who am I?
- Where did I come from?
- Why am I here now?
- What do I currently need?
- What do I want in the medium term?
- What do I believe about myself/world?
- What important things do I not know?
- What emotional or existential tension can sustain long-term growth?

Genesis must reuse accepted onboarding facts and may not silently rewrite them.

A conceptual contract may contain:

```ts
interface CharacterGenesis {
  version: number;
  archetypes: GenesisArchetype[];
  publicPremise: string;
  originCondition: string;
  currentSituation: string;
  immediateNeeds: string[];
  mediumTermDesires: string[];
  currentBeliefs: string[];
  importantUnknowns: string[];
  socialEcologyIntent: SocialEcologyIntent;
  growthPotential: GrowthPotential;
  provenance: GenerationProvenance;
}
```

Exact persistence types must be finalized only after auditing existing profile/world/story authorities.

## 5. Genesis Archetypes

Genesis Archetype describes the **mode of beginning**, not species.

Initial vocabulary may include:

- `rooted`
- `lost`
- `awakened`
- `hatched`
- `exiled`
- `arrived`
- `adopted`
- `hidden`
- `last_known`
- `created`
- `escaped`
- `chosen_by_accident`

Archetypes are composable.

Example:

```text
artificial being
+ awakened
+ lost memory
+ abandoned facility
```

is structurally different from:

```text
artificial being
+ created
+ loving household
+ dense city
```

No archetype should become a mandatory trope template.

## 6. Creative Divergence Pipeline

Foundation-critical ideas must not accept the first plausible model response.

Canonical pipeline:

```text
1. Concept Expansion
   -> 8-12 structurally distinct Genesis concepts

2. Divergence Pass
   -> identify concepts that collapse onto the same trope
   -> push them apart structurally

3. Cliche/Trope Analysis
   -> detect generic chosen-one, lost-prince, last-of-kind, prophecy, etc.
   -> trope presence is not automatic rejection; untransformed cliche is penalized

4. Long-Horizon Evaluation

5. Top-k Selection

6. Synthesis / Mutation
   -> only when it creates a stronger coherent concept

7. Final Genesis Validation
```

### 6.1 Evaluation dimensions

At minimum:

- Originality
- Internal Coherence
- Child Suitability
- World Compatibility
- Emotional Depth
- Mystery Potential
- Relationship Potential
- Growth Potential
- Reveal Potential
- Adventure Diversity
- Long-Horizon Potential
- Cliche Risk
- Narrative Yield

### 6.2 Narrative Yield

Narrative Yield asks:

> How many meaningfully different kinds of stories can naturally emerge from this Genesis?

A strong Genesis should support more than one repeated mystery pattern. It should naturally allow combinations of exploration, friendship, humour, loss, discovery, small daily problems, conflict, world change, failure, success and long-term growth.

### 6.3 Long-horizon proxy test

Do not generate one hundred full stories.

Generate a structured potential map such as:

- 5 early adventures
- 5 medium-term arcs
- 5 meaningful reveals
- 5 relationship developments
- 5 world consequences

Then evaluate repetition, exhaustion risk and expansion space.

## 7. Impact-aware model routing

LUMI selects model strength by **future decision impact**, not output length.

### Tier S — Foundation Critical

Use the strongest configured model class for:

- Character Genesis
- Creative Divergence
- Core Tension
- Core Saga
- Truth Ledger
- long-horizon/Narrative Yield evaluation

These calls are relatively rare but may shape tens or hundreds of future stories.

### Tier A — Important Generative Work

Use a strong but more economical model for:

- Social Ecology expansion
- initial NPC design
- important world-event seeds
- rumor/clue seeds
- important local details

### Tier B — High-volume Operational Work

Use cheaper/faster models for:

- teasers
- recaps
- ordinary NPC dialogue
- short display text
- formatting
- classification/extraction/summarization

### 7.1 Authority rule

A lower-tier generation may elaborate protected higher-tier canon but may not silently rewrite it.

```text
Tier S canon:
"Arin is not the character's biological parent."

Tier A/B may elaborate Arin's behaviour,
but cannot turn Arin into the biological parent.
```

Model/provider choices must remain configurable through canonical LLM Settings / Prompt Registry / gateway mechanisms. No Genesis subsystem may hard-code a provider.

## 8. Core Tension and time scales

LUMI separates three narrative time scales.

### Immediate need

One or a few stories:

- find food
- find shelter
- make a first friend
- repair a damaged component

### Medium-term direction

Several stories or an arc:

- recover memory fragments
- understand a nearby ruin
- earn trust in a community
- find a route home

### Core Saga

Long-running background force:

- Why did my kind disappear?
- Why was my memory erased?
- Why does this symbol appear across unrelated places?
- Why is the world slowly changing?

The Core Saga is not required to advance in every story.

## 9. Saga Foundation and Truth Ledger

Core Saga must not be stored only as one attractive paragraph.

LUMI separates durable canon from evolving character knowledge.

### Saga Canon

Conceptually:

```ts
interface SagaCanon {
  centralQuestion: string;
  deepTruth: string;
  longTermDesire: string;
  fundamentalFear: string;
  stakes: string[];
  hiddenForces: string[];
  possibleTransformations: string[];
  revealLayers: RevealLayer[];
  forbiddenEarlyReveals: string[];
}
```

### Saga Progression

```ts
interface SagaProgression {
  knownFacts: string[];
  currentBeliefs: string[];
  revealedClues: string[];
  falseLeads: string[];
  unresolvedQuestions: string[];
  revealStage: number;
}
```

Critical invariant:

```text
deepTruth != characterKnowledge != currentBelief
```

A story may change knowledge or belief without changing protected truth.

## 10. Reveal safety

Hidden saga truth must not automatically enter ordinary provider context.

Context Builder should expose only a reveal-safe projection:

```text
public saga premise
+ current known facts
+ current beliefs
+ unresolved questions
+ clues currently eligible for reveal
```

Protected truth and forbidden future reveals remain outside normal story-generation context unless explicit reveal policy unlocks them.

Every progression/reveal change requires provenance and validated state transition.

## 11. Social Ecology

Social Ecology models meaningful roles around the character.

It is not a fixed list of human relationships.

Possible roles include:

- caregiver
- sibling/peer
- friend
- rival
- mentor
- neighbour
- rescuer
- first neutral contact
- predator/threat
- symbiotic creature
- facility AI
- maintenance drone
- clan member
- local guide
- distant unknown kin signal

Genesis/current situation determines which roles are meaningful.

Examples:

### Rooted human child

Could legitimately bootstrap caregiver(s), peer/friend, neighbour/local adult, and a local community event.

### Lone hatchling

Could legitimately bootstrap **no family** and instead create shelter/ecology constraints, one neutral creature, one threat, an ancient clue and perhaps a distant observer.

### Memoryless traveller

Could bootstrap the rescuer/current caregiver, low initial trust, unknown family state and a clue tied to the character's possessions or markings.

### Awakened machine

Could bootstrap a facility AI, damaged maintenance unit, hostile security process, ruined local environment and unknown creator clues.

## 12. Living World Bootstrap

Living World Bootstrap materializes the minimum meaningful initial world after foundation commit.

It may create/reuse canonical state for:

- NPC identities
- NPC runtime state/goals/needs
- relationships
- home/local-area links
- local facts
- world-event seeds
- rumors/clues
- Opportunity Inbox entries

### 12.1 No filler population

No entity is created merely to make the world look populated.

Every initial entity/event should serve at least one of:

- identity
- immediate need
- relationship potential
- current situation
- mystery
- growth
- world coherence
- Core Saga potential

A small meaningful ecology is preferred over a large random cast.

### 12.2 Bootstrap size

There is no universal NPC quota.

A rooted character may naturally begin with several close entities. A lone hatchling may begin with zero family and only one meaningful social contact. The bootstrap should generally stay small enough that all materialized state has narrative purpose.

### 12.3 Idempotency

Bootstrap must have a versioned manifest and be exactly-once/retry-safe.

Partial failure must not duplicate:

- NPCs
- relationships
- opportunities
- world facts

The committed character/world foundation must not be corrupted by a retry.

## 13. New Adventure relationship

New Adventure is a consumer of the living world, not the primary generator of fake world state.

Initial source families remain:

- `world_event`
- `rumor`
- `inventory_item`
- `npc_call`

But source availability must be semantically honest.

Examples:

- a lone hatchling may have no `npc_call` at first;
- a rooted social character should usually have plausible NPC opportunities;
- inventory hooks require actual eligible items;
- world events and rumors should trace to real world/bootstrap state.

The candidate system must implement source-family-aware discoverability. A valid world event must not disappear simply because it was appended after many inventory/opportunity rows.

`Başka maceralar göster` should not merely rotate the same flat array by one position. It should track seen candidates and may ask canonical world/NPC opportunity services for refreshed eligible opportunities when policy permits.

## 14. Relationship to Narrative Planner

Genesis/Saga Foundation does not replace the existing Narrative Planner & Long-Term Story Arc Engine.

Responsibilities:

```text
Genesis/Saga Foundation:
"What long-term life tension and protected truth exist?"

Narrative Planner:
"Which arcs/plotlines should advance now, and at what pace?"

Story Planner/Generation:
"What happens in this specific adventure?"
```

Saga Foundation provides durable constraints and possibilities. Narrative Planner decides when and how they become active narrative arcs.

## 15. Existing-character compatibility

Characters created before Genesis v1 cannot be forced through a newly invented history.

Legacy backfill must:

- reuse existing world/story/NPC/inventory/relationship facts
- derive conservatively
- distinguish `legacy-derived` provenance
- mark uncertainty instead of fabricating certainty
- avoid destructive story/session migration
- support idempotent dry-run/report mode

Established canon always outranks a new speculative Genesis.

## 16. Observability and provenance

Foundation-critical generation should record:

- generation intent
- model tier
- model/provider
- prompt/version
- input context manifest/hash where safe
- latency
- token usage
- approximate cost
- evaluator scores
- selected candidate/rejected-candidate metadata where safe
- retry/failure state

Bootstrap should record:

- created entities
- reused entities
- skipped roles
- unavailable opportunity-family reasons
- bootstrap version

Saga progression should record each reveal/belief/knowledge transition.

## 17. Testing strategy

### Domain/unit

- schema validation
- truth/knowledge/belief separation
- forbidden-reveal validation
- species-template prohibition
- idempotency
- lower-tier canon mutation prevention

### Golden generation/evaluation

Include at least:

- rooted human
- lost/memoryless human
- magical creature/lone hatchling
- artificial being/awakened machine
- aquatic/non-human social ecology

### Integration

- Genesis -> Saga -> commit
- commit -> bootstrap
- bootstrap -> canonical NPC retrieval
- bootstrap -> real Opportunity Inbox
- opportunity -> New Adventure
- story commit -> saga progression

### Browser E2E

Preserve the canonical 9-stage onboarding and verify public foundation output plus bootstrap-visible state.

### Live long-horizon

Issue #233 remains the reference UI-only persistent acceptance path. After this architecture is implemented, rerun it to validate seven-story continuity, real opportunity provenance and final living-world state.

## 18. Delivery phases

- #241 canonical contracts and persistence
- #242 impact-aware model routing
- #243 Creative Divergence and long-horizon evaluator
- #244 Core Tension / Saga Foundation / Truth Ledger
- #245 onboarding integration and foundation commit
- #246 Living World Bootstrap social ecology materialization
- #247 initial events/rumors/opportunities and New Adventure diversity
- #248 saga progression / Context Builder / reveal safety
- #249 legacy/backwards compatibility
- #250 E2E/live acceptance, observability and quality gates

Primary chain:

```text
#241
  -> #242 / #243
  -> #244
  -> #245
  -> #246
  -> #247
  -> #248
  -> #250
```

#249 must be complete before general rollout to existing characters.

## 19. Definition of Done

Character Genesis & Living World Bootstrap v1 is complete when:

- the final character foundation is more than an isolated character record;
- Genesis is structured, original, coherent and evaluated for long-horizon yield;
- model strength is configurable by decision impact;
- Saga Canon and Saga Progression are separated;
- hidden truth cannot leak before reveal eligibility;
- final commit triggers a retry-safe Living World Bootstrap;
- social ecology follows Genesis/current situation rather than species stereotypes;
- canonical NPC/relationship/world authorities contain the meaningful initial life state;
- New Adventure consumes real discoverable opportunities with source diversity;
- old characters have a conservative compatibility path;
- browser/live evidence confirms the lifecycle through real application mechanisms.
