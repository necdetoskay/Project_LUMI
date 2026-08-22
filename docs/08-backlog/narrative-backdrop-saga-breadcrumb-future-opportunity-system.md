# Narrative Backdrop, Saga Breadcrumb & Future Opportunity System

Status: **BACKLOG / DESIGN PREPARED — implementation deferred until LUMI v1 test/stabilization gates are complete.**

Related epic: #391 — World Incubation Engine

## 1. Purpose

LUMI should evolve from producing isolated good stories into a system where stories can leave behind controlled narrative potential that later becomes meaningful world activity, future story opportunities, Saga progress, NPC intentions or narrative items.

Core principle:

> Every story may close its immediate narrative, but it may also leave behind controlled narrative potential.

The important word is **may**. Every story is not required to create a mystery, item, clue or sequel hook.

## 2. Activation gate

Do not implement this design while the current v1 test/stabilization work is still active.

Required gate:

```text
Current v1
  -> functional tests green
  -> story/world consistency tests green
  -> production verification complete
  -> v1 stabilization complete
  -> Narrative Backdrop implementation may begin
```

Until then, this document and the associated GitHub backlog issue are planning artifacts only.

## 3. Target experience

A future opportunity should often feel like something the child has already heard, seen or indirectly experienced in the world rather than a random menu card generated from nowhere.

Example:

```text
Story #12
  "The birds in the north were unusually quiet today."

Story #15
  NPC: "People using the north road have been returning early."

Story #18
  A faint light is seen in the old tower.

Background world process
  -> dormant seed crosses activation threshold

Opportunity surface
  "Something is changing in the Northern Forest..."
```

The visible opportunity is therefore grounded in prior narrative presence.

## 4. Narrative Backdrop

`Narrative Backdrop` is the persistent, mostly hidden narrative state behind the currently active story.

Conceptually:

```text
Character
├── Current State
├── Character DNA
├── Memories
├── Relationships
├── Inventory
├── Saga State
└── Narrative Backdrop
    ├── Dormant Seeds
    ├── Developing Seeds
    ├── Active Opportunities
    ├── Saga Breadcrumbs
    ├── Unresolved Threads
    ├── Narrative Items
    ├── Rumors
    ├── NPC Intentions
    └── World Hooks
```

The complete backdrop must never be blindly injected into the Story Generator context. Context Assembly retrieves only relevant and budgeted elements.

## 5. Story lifecycle

Target lifecycle:

```text
Story Request
    -> Context Builder
    -> Narrative Planner
    -> Breadcrumb Selection
    -> Story Generation
    -> Story Validation
    -> Story Saved
    -> Canonical Outcome Commit
    -> ASYNC Post-Story Narrative Processor
    -> Narrative Backdrop Update
    -> Seed / Saga / Item / NPC / Opportunity updates
```

### Critical boundary

`Story Outcome Commit` and `Narrative Backdrop enrichment` are separate responsibilities.

If narrative enrichment fails after a story has been canonically committed:

- the story remains saved;
- canonical world outcome remains valid;
- the enrichment job may retry safely;
- no duplicate effects may occur.

## 6. Breadcrumbs

Breadcrumbs are small narrative traces placed into a story without turning them into the main plot.

Example dormant seed:

```text
Old Observatory
activation_score = 0.18
```

A future story may include only:

> Through the trees, a brief light flickered from the top of the abandoned tower.

The story does not need to investigate the tower.

### 6.1 Planned Breadcrumb

A deliberate small clue selected before story generation from an existing:

- Saga thread;
- dormant seed;
- NPC intention;
- world development;
- narrative item;
- unresolved thread.

The Story Generator is instructed to use it naturally and subtly without changing the main story goal.

### 6.2 Emergent Breadcrumb

A detail that appears naturally during story generation even though it was not explicitly planned.

Example:

> Strange symbols were carved into several boards of the old bridge.

The Post-Story Narrative Processor may decide that this has useful future-story potential and create a dormant seed.

### Design balance

Both mechanisms are required:

- Planned breadcrumbs provide long-horizon control.
- Emergent breadcrumbs preserve creativity and surprise.

Planned-only behavior becomes mechanical. Emergent-only behavior loses Saga and continuity control.

## 7. Null is a valid result

A narrative analysis must be allowed to produce nothing.

```json
{
  "newSeed": null,
  "sagaUpdate": null,
  "narrativeItem": null,
  "opportunityUpdate": null
}
```

This is a quality requirement, not an edge case.

LUMI must not generate a mysterious key, map, cave, artifact or hidden quest after every story.

## 8. Future Seed model

A `Future Seed` is internal narrative potential that is not yet necessarily visible to the user.

Conceptual contract:

```json
{
  "seedId": "seed_123",
  "type": "location_mystery",
  "sourceStoryId": "story_42",
  "subject": "Old Observatory",
  "state": "dormant",
  "activationScore": 0.18,
  "exposureCount": 1,
  "earliestStoryDistance": 3,
  "earliestWorldTime": null,
  "expiresAt": null
}
```

Exact schema must be finalized only after the existing canonical domains are re-audited at implementation time.

## 9. Seed lifecycle

Recommended lifecycle:

```text
CANDIDATE
  -> DORMANT
  -> DEVELOPING
  -> READY
  -> OPPORTUNITY
  -> RESOLVED
```

Optional exits:

```text
DORMANT -> EXPIRED
DEVELOPING -> ABANDONED
OPPORTUNITY -> IGNORED -> DORMANT
```

## 10. Activation score

Seeds should not become visible opportunities immediately.

Their activation score may increase when:

- the character encounters a breadcrumb;
- an NPC refers to the same subject;
- a related world event occurs;
- a narrative item is found;
- the character visits a relevant region;
- sufficient world time passes;
- a related Saga state changes.

Example:

```text
Story 4      0.18
Story 7      0.28
Story 11     0.41
World event  0.58
Story 14     0.66 -> eligible for opportunity evaluation
```

Thresholds are deterministic policy inputs, not LLM-owned rules.

Crossing a threshold should make a seed eligible for activation, not automatically force activation in all cases.

## 11. Time, distance and cooldown

A seed must support bounded timing rules such as:

- `earliest_story_distance`
- `minimum_world_days`
- `cooldown`
- `maximum_exposure_frequency`
- `expires_at`
- optional season requirement
- optional location requirement
- optional relationship requirement

This prevents the same narrative topic from repeatedly appearing in consecutive stories.

## 12. Saga progression

Saga is a long-horizon character journey, not a single quest.

Suggested stages:

```text
Foreshadowing
  -> Recognition
  -> Discovery
  -> Investigation
  -> Escalation
  -> Convergence
  -> Climax
  -> Resolution
```

### Saga Exposure vs Saga Progress

These must be separate.

Seeing a Saga symbol is not the same thing as progressing the Saga.

Example:

```json
{
  "sagaId": "lost_star_map",
  "stage": "foreshadowing",
  "progress": 0.12,
  "exposureCount": 4,
  "discoveredClues": 1,
  "resolvedClues": 0
}
```

The child may have encountered four hints while still having only one understood clue.

### Saga breadcrumb frequency

Saga must not appear in every story.

Initial configurable direction:

```text
Dormant saga       ~5-10%
Foreshadowing     ~10-20%
Developing        ~20-30%
Active            ~30-45%
Convergence       ~40-60%
Climax            story-driven
```

These are starting configuration ranges, not product constants.

Saga pacing should also consider:

- recent Saga exposure;
- story count;
- current Saga stage;
- location;
- relationships;
- world state;
- previous choices;
- character interests;
- age suitability;
- narrative fatigue.

## 13. Narrative Items

Inventory items may carry different narrative roles.

Recommended classes:

### Ordinary Item
Used only in the current story.

### Persistent Item
Remains in inventory and may matter later.

### Narrative Hook Item
Can strengthen or create a future seed.

### Saga Artifact
Directly tied to the character's long-running Saga and therefore rare.

Example chain:

```text
Broken Compass
  -> Persistent Item
  -> NPC Recognition
  -> Future Seed
  -> Old Mine Opportunity
  -> Story
  -> Saga Breadcrumb
```

The item's full importance does not need to be revealed when it is first found.

## 14. Narrative Loot Policy

The LLM must not freely decide to create persistent or Saga-level items in every story.

Conceptual policy input:

```json
{
  "allowItemDrop": true,
  "probability": 0.15,
  "allowedTypes": ["ordinary", "persistent"],
  "sagaArtifactAllowed": false
}
```

Policy owns limits and eligibility. The model owns creative realization inside those limits.

## 15. Opportunity relationship

Future Seed and Opportunity are different concepts.

```text
Seed
  -> Narrative Presence
  -> Repeated Exposure / World Development
  -> Activation Eligibility
  -> Opportunity
```

Seeds are internal. Opportunities may be shown to the user.

Important principle:

> No important opportunity should appear without first earning narrative presence, unless a defined exception policy applies.

Possible exceptions:

- first-use onboarding opportunities;
- genuine random ambient world events;
- time-sensitive seasonal events;
- safety or system-required events.

## 16. Post-Story Narrative Processor

The background processor runs after canonical story/outcome commit.

### Stage A — Extraction

Extract story-level facts and potential narrative signals:

- locations;
- NPC interactions;
- items;
- unresolved events;
- unusual details;
- promises;
- clues;
- rumors;
- meaningful emotional/relationship changes.

### Stage B — Planned Breadcrumb Validation

Verify whether breadcrumbs requested by the Narrative Planner actually appeared in the generated/accepted story.

### Stage C — Existing Backdrop Matching

Match extracted signals against existing:

- seeds;
- Saga clues;
- NPC intentions;
- world hooks;
- narrative items;
- unresolved threads.

### Stage D — Score / Exposure Update

Apply bounded, deterministic changes to activation and exposure state.

### Stage E — Emergent Candidate Detection

Identify newly created details with useful future narrative potential.

### Stage F — Policy Validation

Reject candidates that are:

- duplicates or near-duplicates;
- canon contradictions;
- age-inappropriate;
- impossible in current world/location state;
- hidden-knowledge leaks;
- Saga-forcing;
- redundant with too many active threads;
- low-value narrative noise.

### Stage G — Commit

Persist only accepted changes to Narrative Backdrop.

## 17. Hot and Cold incubation integration

This design extends #391 rather than replacing it.

### Hot path

Runs after a successful Story Outcome commit.

```text
Story saved
  -> Story Outcome committed
  -> deterministic signal gate
  -> Post-Story Narrative Processor
  -> seed/exposure/backdrop update
  -> optionally prepare near-term opportunity candidates
```

The Story Save request must not wait for an LLM enrichment call.

### Cold path

Runs while the user is away or as bounded periodic world simulation.

```text
Narrative Backdrop
  + NPC intentions
  + world state
  + Saga state
  -> bounded world incubation
  -> seed development / rumor / NPC action
  -> opportunity activation
```

Hot and Cold paths must use the same canonical opportunity domain and provenance rules.

## 18. NPC integration

NPCs may carry future intentions.

Conceptual example:

```json
{
  "npcId": "mira",
  "intent": "investigate_old_bridge",
  "visibility": "hidden",
  "strength": 0.38
}
```

A later background cycle may produce:

```text
Mira investigates bridge
  -> discovers clue
  -> rumor emerges
  -> related seed strengthens
  -> player opportunity becomes eligible
```

This must integrate with the planned NPC Emergent Interaction Engine rather than creating a parallel NPC domain.

## 19. Context Builder integration

The complete Narrative Backdrop may become large over time, so retrieval is mandatory.

Conceptual retrieval:

```text
Current character
+ current location
+ Saga phase
+ current story intent
+ recent exposure
+ relevant NPCs
+ relevant inventory
  -> retrieve/rank
  -> small narrative context set
```

Even if a character has 100 dormant seeds, a normal story may receive zero, one or two relevant breadcrumb candidates.

## 20. Narrative complexity budget

Every story should have an explicit narrative complexity budget.

Conceptual example:

```json
{
  "maxActiveThreads": 2,
  "maxBreadcrumbs": 2,
  "maxNewSeedCandidates": 2,
  "maxSagaBreadcrumbs": 1,
  "maxNarrativeItems": 1
}
```

The exact values should be configurable and age-aware.

## 21. Age-aware policy

Narrative complexity should scale with the child's age/context.

Younger profiles should generally receive:

- fewer simultaneous unresolved threads;
- shorter callback distances;
- clearer relationships between clue and consequence;
- lower narrative ambiguity.

Older profiles may support:

- longer foreshadowing;
- more complex NPC motivations;
- longer Saga arcs;
- more delayed callbacks.

## 22. Deterministic policy vs LLM

Core rule:

```text
LLM proposes
Policy decides
Database commits
```

### Deterministic layer owns

- thresholds;
- cooldowns;
- timing;
- maximum counts;
- Saga stage transition constraints;
- duplicate protection;
- item limits;
- context budgets;
- idempotency;
- hard canonical validation.

### LLM layer assists with

- semantic/narrative relevance;
- natural breadcrumb realization;
- emergent-hook detection;
- clue meaning;
- narrative quality;
- semantic relation.

## 23. Idempotency and concurrency

The Post-Story Narrative Processor must be retry-safe.

Processing the same canonical story twice must not double-increment exposure or create duplicate seeds/items.

Narrative mutations should retain provenance such as:

```text
source_story_id
processor_version
mutation_key
```

Concurrency for the same character/universe must use optimistic versioning, locking or another explicit conflict strategy.

## 24. Failure policy

Canonical story persistence remains fail-closed and authoritative.

Narrative enrichment is retryable and must not endanger canonical story state.

```text
Story generation succeeds
Story validation succeeds
Canonical Story/Outcome commit succeeds
Narrative enrichment fails
  -> story remains valid
  -> enrichment retries independently
```

## 25. Persistence direction

Possible conceptual stores include:

```text
narrative_backdrops
narrative_seeds
narrative_seed_exposures
saga_states / saga_clue extensions
narrative_items / inventory extensions
npc_intentions
opportunity_sources
story_narrative_analysis
narrative_mutations
```

Do not implement these names blindly.

At implementation time first audit the then-current canonical Saga, Inventory, Opportunity, NPC, Story Outcome and Context Builder tables/contracts and extend existing authorities wherever possible.

No duplicate source of truth.

## 26. Prompt Registry integration

Narrative prompts should remain versioned/configurable rather than embedded in source code.

Candidate prompt types:

```text
narrative_planner
breadcrumb_injection
post_story_extraction
future_seed_detection
saga_progress_analysis
narrative_item_analysis
opportunity_activation
```

All AI provenance should record prompt/model/version/cost information through the existing LUMI mechanisms.

## 27. Observability

Each narrative processor run should be inspectable with at least:

- story id;
- character id;
- processor version;
- input seeds;
- selected planned breadcrumbs;
- detected emergent candidates;
- accepted/rejected candidates and reasons;
- score changes;
- Saga exposure/progress changes;
- narrative item mutations;
- generated opportunities;
- model/prompt provenance;
- token usage;
- latency;
- estimated cost.

## 28. Testing strategy

This feature must not be accepted based only on unit tests.

### Layer 1 — Unit

Test:

- scoring;
- thresholds;
- cooldown;
- state transitions;
- limits;
- idempotency;
- deduplication.

### Layer 2 — DB integration

Test:

- seed creation/update;
- exposure persistence;
- Saga mutation;
- item persistence;
- retry;
- optimistic concurrency / locking.

### Layer 3 — Story fixture tests

Examples:

```text
Story -> expected existing-seed exposure
Story -> expected emergent seed
Story -> valid no-seed result
Story -> Saga breadcrumb without Saga progress
Story -> persistent item
```

### Layer 4 — Multi-story simulations

Run synthetic sequences of approximately 20/50/100 stories and inspect:

- Saga pacing;
- repeated hooks;
- opportunity frequency;
- unresolved-thread accumulation;
- dead seeds;
- item inflation;
- context size growth.

### Layer 5 — Golden narrative sequences

Maintain human-reviewed multi-story sequences where expected foreshadowing and callback behavior is known.

### Layer 6 — Adversarial tests

Verify policy blocks or bounds attempts to:

- create a mystery every story;
- create duplicate seeds;
- overproduce persistent items;
- reveal Saga truths too early;
- force Saga endings;
- reactivate resolved/expired threads;
- leak hidden knowledge.

## 29. Evaluation metrics

Operational metrics:

```text
opportunity repetition rate
seed-to-opportunity conversion rate
average breadcrumb distance
Saga exposure frequency
Saga progression rate
narrative item frequency
duplicate thread rate
dead seed count
active thread count
context token overhead
background processing cost
hot incubation signal-gate hit rate
on-demand fallback rate
```

Narrative quality dimensions:

```text
continuity
natural foreshadowing
callback quality
world consistency
character consistency
age appropriateness
surprise without randomness
```

## 30. Suggested future delivery sequence

Do not build the system in one PR.

Recommended sequence after the activation gate:

1. **Domain contracts and feature flags**
2. **Persistence and mutation ledger**
3. **Deterministic Narrative Policy Engine**
4. **Context Builder / Narrative Planner retrieval integration**
5. **Planned Breadcrumb Injection**
6. **Post-Story extraction worker**
7. **Existing seed exposure and reinforcement**
8. **Emergent seed creation + dedupe**
9. **Saga breadcrumb / exposure / progress engine**
10. **Narrative Item integration**
11. **Opportunity activation integration with #391**
12. **NPC intention integration**
13. **Cold/off-session Narrative Backdrop evolution**
14. **Admin/observability tooling**
15. **20/50/100-story Test Lab qualification**
16. **Feature-flagged production rollout**

Each slice must be independently testable and mergeable.

## 31. Feature flags

Candidate flags:

```text
NARRATIVE_BACKDROP_ENABLED
BREADCRUMB_INJECTION_ENABLED
EMERGENT_SEEDS_ENABLED
SAGA_BREADCRUMBS_ENABLED
NARRATIVE_ITEMS_ENABLED
OPPORTUNITY_ACTIVATION_ENABLED
NPC_INTENTIONS_ENABLED
```

This allows individual capabilities to be disabled without disabling the canonical Story Engine.

## 32. Backward compatibility

Existing characters must continue to work without a Narrative Backdrop record.

Preferred behavior:

```text
no backdrop
  -> lazy initialization
  -> valid empty backdrop
```

Do not require mandatory reprocessing of all historical stories.

A historical enrichment job may be considered later as a separate optional capability after forward behavior is proven.

## 33. Definition of Done

The future implementation is complete only when:

- [ ] Narrative Backdrop has one canonical persistence authority.
- [ ] Context Builder retrieves only relevant backdrop state.
- [ ] Planned breadcrumb injection is bounded and natural.
- [ ] A story is allowed to produce no future narrative material.
- [ ] Post-story processing is asynchronous and retry-safe.
- [ ] Existing seeds can be reinforced by later story exposure.
- [ ] Emergent seeds can be created without duplicate/thread explosion.
- [ ] Saga exposure and Saga progress are distinct.
- [ ] Saga pacing is validated across long story sequences.
- [ ] Narrative Items integrate with canonical Inventory.
- [ ] Opportunity activation integrates with the shared #391 opportunity domain.
- [ ] NPC intentions integrate with canonical NPC systems.
- [ ] Off-session world incubation can develop backdrop state safely.
- [ ] Context and narrative complexity budgets are enforced.
- [ ] Age-aware complexity behavior is tested.
- [ ] Prompt/model/provenance/cost data is observable.
- [ ] DB integration and concurrency tests are green.
- [ ] 20/50/100-story simulations meet agreed quality thresholds.
- [ ] Production rollout is feature-flagged and reversible.

## 34. Final design principles

1. **Stories leave potential, not obligations.**
2. **Foreshadow before important activation.**
3. **Saga is earned over time.**
4. **Exposure is not the same as progression.**
5. **LLM proposes; policy decides; database commits.**
6. **Background enrichment must never endanger canonical Story/World state.**
7. **Narrative complexity has a budget.**
8. **The world remembers.**

## 35. Intended product outcome

LUMI should evolve from:

```text
Story 1 -> Story 2 -> Story 3
```

into a controlled living narrative graph:

```text
Story
  -> Memory
  -> Breadcrumb
  -> World Reaction
  -> Seed
  -> NPC Action
  -> Opportunity
  -> Future Story
  -> Saga
```

The intended experience is that the child can sometimes realize:

- "I saw this before."
- "So that object really mattered."
- "This event started several stories ago."
- "The character's Saga has been developing in the background for a long time."

That long-horizon continuity is one of the central behaviors required for LUMI to feel like a **Living Universe** rather than a sequence of independent generated stories.
