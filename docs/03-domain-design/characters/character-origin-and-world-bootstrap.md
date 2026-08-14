# Character Foundation, World Compatibility and Bootstrap

**Version:** 2.0.0
**Status:** Canonical
**Owner:** Domain Design
**Tracking:** #181
**Last Updated:** 2026-08-14

## Purpose

This document defines the canonical character-creation foundation flow for Project LUMI.

Character creation is not a cosmetic setup wizard. It creates durable canon that may influence months or years of simulation and stories. The initial character identity, universe membership, world, region, origin, relationships, first mystery and Core Saga must therefore be coherent, original, world-grounded and auditable.

This document replaces the earlier assumption that the first universe/world is created directly from an Origin Package. The new flow explicitly separates Universe, World, Region, Origin and Core Saga while preserving the seeded/validated bootstrap principles.

## Core Product Decisions

### Character onboarding is separate from character management

The child-facing `Karakterler` surface owns:

- active character cards;
- archive/soft-delete;
- opening character detail;
- the single entry point `Yeni Karakter Oluştur`.

Character onboarding must not repeat the character list or show another `Yeni Karakter Oluştur` decision.

The canonical new-character route family begins at:

`/app/profiles/{childProfileId}/characters/new/type`

Each onboarding step should have an explicit route or equivalent durable route-state boundary so resume, deep-linking and testing remain deterministic.

### Multiple creation cycles are allowed

A child profile may have multiple historical character creation cycles.

An existing or archived character must not permanently block a new cycle. Consumed handoffs remain audit/history records.

`Kaldığınız yer` is valid only when a genuinely unfinished character-creation cycle exists. It must offer explicit `Devam et` / `Baştan başla` behavior rather than confusing an existing completed character with an unfinished creation.

### Canonical hierarchy

The creation hierarchy is:

`Universe > World > Region > Location > Home`

- **Universe**: the broad continuity that may contain multiple worlds and stories.
- **World**: a uniquely named world/planet inside a universe with environmental and civilization rules.
- **Region**: a spatially placed macro-area inside one world.
- **Location**: a concrete place inside a region.
- **Home**: the character's initial safe return point.

Character, World, Origin and Core Saga are related but remain distinct aggregates/contracts.

## Approved Onboarding Flow

### Step 1 — Character Type

Question: `Nasıl bir karakter olsun?`

Initial broad kinds:

- İnsan
- Hayvan
- Fantastik
- Sentetik

The selected type constrains later world compatibility, viable origins, movement/life requirements and Core Saga opportunities.

No final Character aggregate is persisted at this step.

### Step 2 — Character Identity Candidates

Question: `Hangi karakter sana daha yakın geliyor?`

Generate 3–5 distinct candidates constrained by the selected broad type and child profile context.

Candidate fields should include at minimum:

- broad kind;
- subtype / concrete kind;
- candidate display name;
- concise identity premise;
- personality hook;
- story promise;
- theme tags;
- novelty markers;
- generation provenance.

Refresh must avoid near-duplicate concepts from the current cycle and, where practical, from existing character history.

The user may edit the final display name without changing the candidate's semantic identity.

### Step 3 — Universe

Question: `Karakter hangi evrende yaşayacak?`

Offer:

- existing active universe(s), favoring the child's living primary universe where applicable;
- `Yeni Evren Oluştur`.

Selecting a universe determines which worlds are available or may be generated next.

Opening or cancelling this step must not create duplicate universes.

### Step 4 — World

Question: `{Character} hangi dünyada yaşayacak?`

Offer together:

- existing worlds in the selected universe;
- 3–5 new high-diversity world candidates;
- `Kendi Dünyamı Oluştur`.

World candidates must be structurally diverse rather than cosmetic renames. Examples include:

- almost entirely aquatic worlds;
- desert worlds;
- ringed planets;
- worlds with many moons;
- frozen surfaces with habitable warm underground systems;
- floating-island or extreme-atmosphere worlds when compatible with safety/design constraints.

Each World has:

- stable id independent from display name;
- unique display name at least within the universe;
- world type;
- habitat/life-medium model;
- climate/environment traits;
- water/land or equivalent composition when relevant;
- sky/orbital traits;
- magic level/rules where applicable;
- technology level/rules where applicable;
- civilization tone;
- safety/danger tone;
- region-generation biases;
- child-facing summary and tags;
- visual brief and asset provenance.

#### Custom world builder

Custom world creation should be semi-structured rather than a free-form prompt.

Useful dimensions include:

- climate / dominant environment;
- sky/orbital feature;
- magic level;
- technology tone;
- civilization tone;
- emotional/adventure tone.

The structured choices become constraints for several coherent generated candidates.

## World ↔ Character Compatibility

Character type and world ecology are coupled. Compatibility must be evaluated before region/origin commitment.

A fully aquatic world naturally favors aquatic-capable life. A robot/construct is not automatically invalid, but the world and origin must explain its habitat support, mobility and purpose.

### Compatibility classes

- `natural` — fits without special explanation.
- `requires_explanation` — viable if a coherent adaptation/origin premise is accepted.
- `low` — technically possible but weak for playability/coherence; should be discouraged or require redesign.
- `incompatible` — violates hard environmental, safety or world rules.

### Compatibility dimensions

At minimum evaluate:

- habitat / life medium;
- atmosphere, pressure and temperature where relevant;
- locomotion and region accessibility;
- biological or synthetic support requirements;
- technology/magic dependencies;
- civilization/social fit;
- child-safety constraints;
- viable homes;
- viable origin patterns;
- viable long-term Core Saga opportunities.

### Meaningful exceptions

Exceptions are encouraged when they create a strong premise instead of incoherence.

Example: a synthetic character on an ocean world may be an old amphibious research or maintenance construct built for underwater infrastructure.

The exception explanation becomes part of the foundation brief and may influence Origin and Core Saga.

## Step 5 — Compatibility Presentation

The child-facing compatibility screen explains *why* the selected world works or requires explanation without exposing numeric vectors or internal rule IDs.

It may summarize:

- life environment;
- sky/world theme;
- origin opportunities;
- Core Saga opportunities;
- any meaningful exception premise.

## Step 6 — Region Selection and Generation

Question: `{World}'da nereden başlayacak?`

The screen offers both:

- existing regions in the selected world;
- 10 new strongly differentiated region candidates.

### Region candidate fields

At minimum:

- name;
- biome/environment type;
- tone;
- mystery/opportunity profile;
- short child-facing description;
- visual brief;
- small thumbnail asset;
- placement constraints/tags;
- generation provenance.

Generated region candidates are not discarded when not selected. They remain reusable according to lifecycle/retention policy.

### Region Blueprint vs World Region Instance

LUMI distinguishes two concepts:

#### Region Blueprint

A reusable creative definition containing:

- semantic region concept;
- biome/environment traits;
- tone;
- lore/visual brief;
- reusable asset references;
- placement constraints;
- novelty/provenance metadata.

#### World Region Instance

The actual canonical region inside one World containing:

- world id;
- blueprint/reference provenance;
- canonical name/display overrides if any;
- map coordinates/cells;
- adjacency;
- traversal relationships;
- discovery state;
- world-specific simulation state.

A reusable blueprint does not imply shared simulation state between different worlds.

## Spatial Placement and Map Topology

The LLM does not own final coordinates.

The system placement engine determines geography/topology using structured world rules and region placement constraints.

Implementation may use a hex/grid-compatible topology or another deterministic coordinate system, but it must support:

- stable coordinates before visit;
- adjacency queries;
- path/travel rules;
- fog-of-war rendering;
- future region expansion without moving established canon;
- deterministic/replayable placement where required.

Placement should consider:

- world biome ratios;
- terrain/environment constraints;
- coast/water/altitude or equivalent relationships;
- climate bands;
- region adjacency rules;
- civilization/logistics constraints;
- special world features such as rings, multiple moons, tides or magic zones.

## Discovery and Fog-of-War

Minimum discovery states:

- `hidden` — canonical location exists but the child has no knowledge of it.
- `rumored` — existence is hinted; map may show a vague silhouette/marker.
- `revealed` — known and visible but not visited.
- `visited` — entered by the character.
- `bonded` / `settled` — optional later state for meaningful long-term attachment.

Unvisited regions may be visually fogged/closed while retaining stable canonical coordinates.

## Step 7 — World-Grounded Origin

Question: `{Character}'ın kökeni nasıl başlasın?`

Origin must be generated *after* World and Region selection. It is not an independent generic biography.

The Origin answers:

> Why does this specific character exist and belong in this specific world and region?

### Origin Package v2

The accepted Origin candidate should contain at minimum:

| Field | Meaning |
| --- | --- |
| character_type | accepted broad kind |
| subtype | concrete kind |
| origin_concept | memorable world-grounded premise |
| world_id | selected canonical world |
| region_id | selected canonical/candidate region instance |
| birthplace_or_arrival | how/where the character began in this world |
| region_relationship | why this region matters to the character |
| home_archetype | initial safe home/shelter |
| home_location_seed | concrete home location candidate |
| community_culture_seed | first social/cultural context |
| nearby_npc_seed | first meaningful relationship candidate |
| first_mystery_seed | initial unresolved curiosity/tension |
| core_strength_seed | initial useful strength |
| core_constraint_seed | limitation/fear/adaptation requirement |
| tone_vector | child-facing/narrative tone hints |
| safety_bounds | inherited safety constraints |
| novelty_markers | anti-generic markers |
| provenance | model/prompt/version/cost metadata |

Generate 3–5 coherent alternatives. The user selects one; refresh avoids near duplicates.

## Step 8 — Core Saga

Question: `{Character}'ın ana hikâye yolculuğu`

Core Saga is the long-running thematic journey of the character. It is not one Adventure and not one Quest.

### Domain distinction

- **Core Saga** — durable long-term arc/theme spanning many stories.
- **Adventure / Story Session** — a bounded story experience that may advance or ignore parts of the Saga.
- **Quest / Objective** — a concrete short- or medium-term goal inside an Adventure or world state.

### Core Saga candidate fields

At minimum:

- memorable title;
- world-grounded premise;
- long-term goal;
- core motivation;
- core need;
- central tension/question;
- themes;
- emotional tone;
- world/region dependencies;
- possible future branches;
- relationship to Origin;
- originality markers;
- generation provenance.

A strong Saga should be difficult to transplant unchanged to a different character/world. It should feel born from the selected identity, world, region and Origin.

## Step 9 — Final Review and Canonical Commit

Question: `{Character} dünyaya hazır`

Before final commit show a child-readable summary of:

- character identity/type;
- Universe;
- World;
- Region;
- Origin;
- Core Saga;
- Home;
- nearby NPC/relationship;
- first mystery.

Primary action: `{Character}'ı Dünyaya Getir`.

Only this final action commits the complete foundation.

Back navigation before final commit must not create duplicate final Characters, Worlds or relationships.

## Character Foundation Package

A committed Character Foundation should include or reference:

- Identity;
- character type/subtype;
- WorldCompatibility result and accepted explanation;
- core traits;
- core motivation;
- core fear/constraint;
- core need;
- Universe membership;
- World membership;
- starting Region;
- Home;
- Origin;
- key initial relationships;
- first mystery;
- Core Saga;
- Saga themes;
- narrative/safety boundaries;
- generation provenance and versioning.

Foundation history is canonical. Later simulation may evolve the character, but must not casually rewrite committed origin/history.

## Character Creation Cycle

The onboarding process should be represented as a durable creation cycle rather than a one-profile-one-handoff lock.

Conceptually:

```text
Child Profile
├── Creation Cycle A -> completed -> Character A
├── Creation Cycle B -> cancelled
└── Creation Cycle C -> in_progress
```

A cycle should support:

- step progression;
- selected candidate references;
- refresh history;
- explicit cancellation;
- resume/restart;
- idempotent final commit;
- audit/provenance.

Existing FirstRunHandoff data should be treated as migration input/history rather than the permanent lifecycle model.

## Foundation Generation Quality Pipeline

The highest-value foundation data must not use a simple one-prompt-to-canon flow.

Recommended pipeline:

1. Resolve child profile, safety and personalization constraints.
2. Resolve accepted type, Universe, World and Region constraints.
3. Build a structured foundation brief.
4. Generate candidate identity/origin/saga content using a strong model.
5. Run world/character compatibility and consistency critique.
6. Run originality/near-duplicate evaluation.
7. Revise candidates that fail quality thresholds.
8. Validate structured schema, world rules and safety.
9. Present candidates to the user.
10. Persist accepted foundation with model/prompt/version/cost provenance.

## Model Routing

Foundation work is low-frequency and high-value. LUMI should route by importance rather than using one model everywhere.

### Tier A — Foundation

Use the strongest justified model for:

- character identity candidates when high creativity is required;
- world concepts;
- Origin;
- Core Saga;
- compatibility critique;
- consistency/originality revision.

### Tier B — World Expansion

Use a cheaper strong model for:

- new Region candidates;
- NPC generation;
- rumors/world events;
- adventure outlines/hooks.

### Tier C — High-Volume Utility

Use inexpensive models for:

- recaps;
- classification;
- metadata extraction;
- short UI copy variants;
- simple state updates where deterministic rules are insufficient.

Each generation should record model, prompt/version, token usage and approximate cost in provenance/cost-ledger data where available.

## Originality Gate

LUMI should explicitly discourage generic repeated foundations.

Compare candidates with:

- existing character concepts;
- existing Origins;
- existing Core Sagas;
- recently rejected/refreshed candidates.

Use semantic fingerprints/embeddings plus structured novelty markers where practical.

The goal is not to ban familiar motifs. It is to avoid near-identical combinations and to ensure the final concept is grounded in its unique world/region context.

## LLM Responsibilities vs System Responsibilities

### LLM may propose

- names;
- structured creative briefs;
- world ecology/traits;
- region concepts;
- lore/short descriptions;
- Origin candidates;
- Core Saga candidates;
- visual briefs;
- compatibility explanations and exception premises.

### Deterministic/domain systems own

- ids;
- uniqueness constraints;
- final coordinates/topology;
- adjacency;
- discovery/fog state;
- canonical state transitions;
- safety enforcement;
- persistence;
- idempotency;
- audit/replay/versioning.

## Candidate vs Canonical Lifecycle

Generating content does not automatically mutate mature simulation state.

World/Region/content candidates should have explicit lifecycle concepts such as:

- `proposed`;
- `accepted`;
- `active`;
- `archived`.

Exact DB representation may differ, but the domain distinction is required.

## Visual Asset Rules

Worlds and Regions shown as onboarding candidates should have visual representation.

Minimum Region visual layers:

- card/selection thumbnail;
- map marker/tile representation;
- larger hero image where available.

Generated assets are stored through the existing asset/storage architecture with provenance and should not disappear simply because the candidate was not selected, subject to future retention/archival policy.

Character appearance generation should not be allowed to invalidate the core foundation transaction. The Foundation may commit first; character/region/world visual generation may complete asynchronously or as an explicit next step.

## UX Rules

- Onboarding never repeats the character-management list.
- `Yeni Karakter Oluştur` enters Step 1 directly.
- Existing completed characters do not trigger `Kaldığınız yer`.
- `Kaldığınız yer` is reserved for an unfinished creation cycle.
- Each step explains what the choice influences.
- Back navigation is allowed before final commit.
- Refresh generates new candidates without deleting history needed for deduplication/audit.
- Opening candidate screens does not create a final Character.
- Child-facing UI never exposes internal ids, lifecycle states, numeric vectors or checkpoint metadata.
- Desktop and 360px mobile layouts are required.

## Implementation Order

Implementation is tracked in GitHub issue #181.

The required order is intentionally incremental:

1. contracts/migration audit;
2. onboarding shell + Character Type screen;
3. Character candidate generation;
4. Universe selection/creation;
5. World catalog/generator;
6. Compatibility Engine;
7. Region persistence/map placement/fog;
8. world-grounded Origin;
9. Core Saga;
10. final Foundation commit;
11. post-create assets;
12. stabilization/E2E.

Do not implement multiple onboarding steps ahead of visual and behavior validation. Each step must pass focused tests and user inspection before the next step becomes canonical.

## Acceptance Criteria

- Character type, World, Origin and Core Saga form one coherent foundation rather than independent random selections.
- Existing characters do not block new creation cycles.
- Worlds have unique names within their Universe and structured environmental rules.
- Compatibility rejects or explains impossible/exceptional combinations.
- Origin is grounded in the selected World and Region.
- Core Saga is grounded in Character + World + Region + Origin and is distinct from Adventure/Quest.
- Region candidates are reusable; world instances own coordinates and discovery state.
- Map placement is system-controlled and deterministic/replayable where required.
- Unvisited regions can be fogged while retaining canonical coordinates.
- Foundation generation passes consistency and originality checks before canonical commit.
- Final commit is idempotent and auditable.
- Visual generation failures cannot destroy a successfully committed Foundation.
