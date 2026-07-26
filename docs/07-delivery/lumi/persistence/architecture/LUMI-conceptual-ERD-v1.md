# Project LUMI — Conceptual ERD v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001, Database Domain Map
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the conceptual entity relationships of Project LUMI.

It focuses on:

- major entities;
- ownership paths;
- one-to-one, one-to-many and many-to-many relationships;
- major transactional boundaries;
- high-risk relationship structures;
- conceptual cardinalities.

It intentionally does not yet define every physical column or index.

---

## 2. Conceptual ERD Overview

```text
USER
 ├── owns ──< CHILD_PROFILE
 │              ├── plays_as ──< CHARACTER
 │              ├── starts ──< STORY_SESSION
 │              ├── owns ──< INVENTORY
 │              └── has ──< PARENTAL_CONTROL
 │
 └── has ──< USER_IDENTITY

UNIVERSE
 └── contains ──< WORLD
                  ├── contains ──< REGION
                  │                └── contains ──< LOCATION
                  │                                  ├── hosts ──< CHARACTER
                  │                                  ├── hosts ──< WORLD_EVENT
                  │                                  └── belongs_to ──< SETTLEMENT
                  │
                  ├── contains ──< CHARACTER
                  ├── contains ──< STORY
                  ├── contains ──< WORLD_EVENT
                  └── has ──1 WORLD_CLOCK

CHARACTER
 ├── has ──< MEMORY
 ├── has ──< EMOTIONAL_STATE
 ├── has ──< CHARACTER_GOAL
 ├── participates_in ──< STORY_SESSION
 ├── owns ──< INVENTORY
 ├── related_to ──< CHARACTER_RELATIONSHIP >── CHARACTER
 └── member_of ──< GROUP_MEMBERSHIP >── GROUP

STORY
 ├── has ──< STORY_VERSION
 ├── instantiated_as ──< STORY_SESSION
 └── contains ──< STORY_CHAPTER
                    └── contains ──< STORY_SCENE
                                      └── contains ──< CHOICE_POINT
                                                        └── offers ──< CHOICE_OPTION

STORY_SESSION
 ├── includes ──< STORY_PARTICIPANT >── CHARACTER
 ├── records ──< CHOICE_SELECTION
 ├── creates ──< MEMORY
 ├── changes ──< INVENTORY_ENTRY
 ├── produces ──< DOMAIN_EVENT
 └── uses ──< MEDIA_ASSET

WORLD_EVENT
 ├── affects ──< EVENT_IMPACT
 ├── has ──< EVENT_PARTICIPANT >── CHARACTER
 ├── may_trigger ──< STORY_SESSION
 └── produces ──< DOMAIN_EVENT

GENERATION_REQUEST
 ├── creates ──< GENERATION_RUN
 │                └── produces ──< GENERATION_OUTPUT
 ├── uses ──< CONTEXT_PACKAGE
 └── may_create ──< MEDIA_ASSET
```

---

## 3. Identity and Ownership Relationships

### 3.1 User → Child Profile

**Cardinality:** One-to-many

```text
USER 1 ───────< N CHILD_PROFILE
```

A user may manage multiple child profiles.

A child profile must belong to exactly one owning user in the initial model.

Future family-sharing support may introduce delegated access, but ownership remains singular.

---

### 3.2 User → User Identity

**Cardinality:** One-to-many

```text
USER 1 ───────< N USER_IDENTITY
```

A user may authenticate through one or more identity providers.

Examples:

- email/password;
- Google;
- Apple;
- parent account provider.

Authentication identity and user profile are separate concepts.

---

### 3.3 User → Role

**Cardinality:** Many-to-many

```text
USER N >──────< N ROLE
```

Resolved through:

```text
USER_ROLE
```

Typical roles:

- parent;
- administrator;
- content reviewer;
- support;
- system operator.

---

## 4. Child Profile Relationships

### 4.1 Child Profile → Character

**Cardinality:** One-to-many

```text
CHILD_PROFILE 1 ───────< N CHARACTER
```

A child profile may own multiple playable characters.

Not every character belongs to a child profile. NPCs may exist independently.

Therefore `character.child_profile_id` is conceptually optional.

---

### 4.2 Child Profile → Story Session

**Cardinality:** One-to-many

```text
CHILD_PROFILE 1 ───────< N STORY_SESSION
```

Each story session belongs to one child profile.

Shared multi-child sessions are not part of the initial design.

---

### 4.3 Child Profile → Preferences

**Cardinality:** One-to-one or one-to-many by category

Conceptually:

```text
CHILD_PROFILE 1 ─────── 1 CHILD_PREFERENCE_SET
```

Physical implementation may split preferences into relational and JSONB fields.

---

### 4.4 Child Profile → Parental Control

**Cardinality:** One-to-one

```text
CHILD_PROFILE 1 ─────── 1 PARENTAL_CONTROL
```

Parental control rules include:

- age restrictions;
- content limits;
- media permissions;
- interaction limits;
- data retention consent.

---

## 5. World and Geography Relationships

### 5.1 Universe → World

**Cardinality:** One-to-many

```text
UNIVERSE 1 ───────< N WORLD
```

A universe may contain multiple worlds, planets or planes.

The initial product may use one primary universe, but the schema must not hard-code that assumption.

---

### 5.2 World → Region

**Cardinality:** One-to-many

```text
WORLD 1 ───────< N REGION
```

Each region belongs to one world.

---

### 5.3 Region → Location

**Cardinality:** One-to-many

```text
REGION 1 ───────< N LOCATION
```

A location represents a navigable or narratively relevant place.

Examples:

- forest;
- cave;
- village;
- harbor;
- floating island;
- castle room.

---

### 5.4 Location → Location

**Cardinality:** Many-to-many

```text
LOCATION N >──────< N LOCATION
```

Resolved through:

```text
LOCATION_CONNECTION
```

A connection may represent:

- road;
- river;
- portal;
- tunnel;
- flight path;
- magical route.

Connections may be:

- one-way;
- two-way;
- conditional;
- temporarily blocked.

---

### 5.5 Location → Settlement

**Cardinality:** One-to-many

```text
LOCATION 1 ───────< N SETTLEMENT
```

A location may contain zero or more settlements.

A settlement belongs to one primary location.

---

### 5.6 World → World Clock

**Cardinality:** One-to-one

```text
WORLD 1 ─────── 1 WORLD_CLOCK
```

The world clock tracks:

- world time;
- last simulation timestamp;
- offline progression status;
- freeze state;
- simulation version.

---

## 6. Character Relationships

### 6.1 World → Character

**Cardinality:** One-to-many

```text
WORLD 1 ───────< N CHARACTER
```

Every persistent character belongs to one world.

Cross-world visitors may be handled by travel or presence records rather than changing their identity ownership.

---

### 6.2 Character → Current Location

**Cardinality:** Many-to-one

```text
LOCATION 1 ───────< N CHARACTER
```

A character has one current location at a time in the basic model.

Historical movement is stored separately.

---

### 6.3 Character ↔ Character Relationship

**Cardinality:** Many-to-many, directional

```text
CHARACTER N >──────< N CHARACTER
```

Resolved through:

```text
CHARACTER_RELATIONSHIP
```

The relationship is directional.

Example:

```text
Character A trusts Character B = 80
Character B trusts Character A = 45
```

These are different records or different directional states.

Relationship dimensions may include:

- trust;
- affection;
- fear;
- respect;
- rivalry;
- obligation;
- familiarity;
- influence.

---

### 6.4 Character → Memory

**Cardinality:** One-to-many

```text
CHARACTER 1 ───────< N MEMORY
```

Each memory has one owning character.

A memory may reference multiple other entities through link records.

---

### 6.5 Memory ↔ Referenced Entity

**Cardinality:** Many-to-many, polymorphic concept

```text
MEMORY N >──────< N ENTITY
```

Conceptually resolved through:

```text
MEMORY_ENTITY_LINK
```

The physical implementation must avoid unsafe generic references for integrity-critical links.

Likely explicit links include:

- memory ↔ character;
- memory ↔ location;
- memory ↔ event;
- memory ↔ story session;
- memory ↔ item.

---

### 6.6 Character → Emotional State

**Cardinality:** One current state, many historical states

```text
CHARACTER 1 ─────── 1 CURRENT_EMOTIONAL_STATE
CHARACTER 1 ───────< N EMOTION_HISTORY
```

The current state is optimized for runtime access.

Historical states support analysis and story continuity.

---

### 6.7 Character → Goal

**Cardinality:** One-to-many

```text
CHARACTER 1 ───────< N CHARACTER_GOAL
```

A goal may be:

- active;
- paused;
- achieved;
- abandoned;
- blocked.

Goals may influence autonomous action and utility evaluation.

---

### 6.8 Character ↔ Group

**Cardinality:** Many-to-many

```text
CHARACTER N >──────< N GROUP
```

Resolved through:

```text
GROUP_MEMBERSHIP
```

Membership may include:

- role;
- rank;
- joined_at;
- loyalty;
- visibility;
- active status.

---

## 7. Story Relationships

### 7.1 World → Story

**Cardinality:** One-to-many, optional ownership

```text
WORLD 1 ───────< N STORY
```

A story may belong to a world.

Some templates may be world-independent and instantiated into a world later.

---

### 7.2 Story → Story Version

**Cardinality:** One-to-many

```text
STORY 1 ───────< N STORY_VERSION
```

A story may have multiple immutable versions.

A story session must reference the exact version experienced by the child.

---

### 7.3 Story → Chapter → Scene

**Cardinality:** One-to-many

```text
STORY_VERSION 1 ───────< N STORY_CHAPTER
STORY_CHAPTER 1 ───────< N STORY_SCENE
```

Chapters and scenes have explicit ordering.

---

### 7.4 Story → Story Session

**Cardinality:** One-to-many

```text
STORY_VERSION 1 ───────< N STORY_SESSION
```

A story session is a runtime instance of one specific story version.

---

### 7.5 Story Session ↔ Character

**Cardinality:** Many-to-many

```text
STORY_SESSION N >──────< N CHARACTER
```

Resolved through:

```text
STORY_PARTICIPANT
```

Participant roles may include:

- protagonist;
- companion;
- guest;
- guide;
- observer;
- antagonist-like obstacle character, without combat assumptions.

---

### 7.6 Story Scene → Choice Point

**Cardinality:** One-to-many

```text
STORY_SCENE 1 ───────< N CHOICE_POINT
```

A scene may contain zero or more choice points.

---

### 7.7 Choice Point → Choice Option

**Cardinality:** One-to-many

```text
CHOICE_POINT 1 ───────< N CHOICE_OPTION
```

A choice point must expose at least two valid options for interactive stories.

---

### 7.8 Choice Option → Consequence

**Cardinality:** One-to-many

```text
CHOICE_OPTION 1 ───────< N CHOICE_CONSEQUENCE
```

A choice option may create multiple immediate or delayed consequences.

---

### 7.9 Story Session → Choice Selection

**Cardinality:** One-to-many

```text
STORY_SESSION 1 ───────< N CHOICE_SELECTION
```

A selection records:

- selected option;
- selecting child profile;
- current session;
- timestamp;
- consequence execution status.

A committed selection is append-only.

---

## 8. Inventory and Item Relationships

### 8.1 Inventory Owner

An inventory may belong to one of the following:

- character;
- child profile;
- group;
- location.

The physical design should prefer explicit owner relationships rather than a weak generic owner reference.

Conceptually:

```text
CHARACTER 1 ───────< N INVENTORY
CHILD_PROFILE 1 ───< N INVENTORY
GROUP 1 ───────────< N INVENTORY
LOCATION 1 ────────< N INVENTORY
```

---

### 8.2 Item Definition → Item Instance

**Cardinality:** One-to-many

```text
ITEM_DEFINITION 1 ───────< N ITEM_INSTANCE
```

Examples:

- definition: “Ancient Silver Key”
- instance: the exact key found by a particular child

Not all items need unique instances. Stackable simple items may use quantity-based entries.

---

### 8.3 Inventory ↔ Item

**Cardinality:** Many-to-many through entries

```text
INVENTORY N >──────< N ITEM_INSTANCE
```

Resolved through:

```text
INVENTORY_ENTRY
```

The entry stores:

- quantity;
- acquisition time;
- equipped status;
- availability;
- durability snapshot;
- story restrictions.

---

### 8.4 Item → Capability

**Cardinality:** Many-to-many

```text
ITEM_DEFINITION N >──────< N ITEM_CAPABILITY
```

Capabilities may unlock:

- a choice option;
- a route;
- a dialogue;
- a memory;
- a world interaction.

---

## 9. Simulation and Event Relationships

### 9.1 World → Simulation Run

**Cardinality:** One-to-many

```text
WORLD 1 ───────< N SIMULATION_RUN
```

Each run records:

- input world time;
- elapsed real time;
- selected entities;
- execution strategy;
- resulting world time;
- checkpoint.

---

### 9.2 World → World Event

**Cardinality:** One-to-many

```text
WORLD 1 ───────< N WORLD_EVENT
```

A world event may be local, regional or world-wide.

---

### 9.3 World Event ↔ Character

**Cardinality:** Many-to-many

```text
WORLD_EVENT N >──────< N CHARACTER
```

Resolved through:

```text
EVENT_PARTICIPANT
```

Participation may be:

- direct;
- witness;
- affected;
- responsible;
- informed later.

---

### 9.4 World Event → Event Impact

**Cardinality:** One-to-many

```text
WORLD_EVENT 1 ───────< N EVENT_IMPACT
```

An impact may target:

- character;
- relationship;
- location;
- settlement;
- group;
- inventory;
- world state.

---

### 9.5 Simulation Run → Domain Event

**Cardinality:** One-to-many

```text
SIMULATION_RUN 1 ───────< N DOMAIN_EVENT
```

Domain events represent meaningful changes created by simulation.

---

### 9.6 Domain Event → Outbox Message

**Cardinality:** One-to-zero-or-many

```text
DOMAIN_EVENT 1 ───────< N OUTBOX_MESSAGE
```

Only events requiring asynchronous delivery or integration create outbox messages.

---

## 10. AI Generation Relationships

### 10.1 Generation Request → Generation Run

**Cardinality:** One-to-many

```text
GENERATION_REQUEST 1 ───────< N GENERATION_RUN
```

Retries or provider fallback create multiple runs for one logical request.

---

### 10.2 Generation Run → Generation Output

**Cardinality:** One-to-many

```text
GENERATION_RUN 1 ───────< N GENERATION_OUTPUT
```

Outputs may include:

- story text;
- scene text;
- image;
- audio;
- map;
- summary;
- embedding;
- NPC decision proposal.

---

### 10.3 Generation Request → Context Package

**Cardinality:** Many-to-one or one-to-one by execution

```text
CONTEXT_PACKAGE 1 ───────< N GENERATION_REQUEST
```

A context package may be reused if it is immutable and safe to reuse.

In most story-generation workflows, each request will use a versioned context package.

---

### 10.4 Context Package ↔ Context Item

**Cardinality:** One-to-many

```text
CONTEXT_PACKAGE 1 ───────< N CONTEXT_ITEM
```

Context items reference:

- memories;
- characters;
- events;
- locations;
- inventory items;
- summaries;
- rules.

---

## 11. Media Relationships

### 11.1 Media Asset → Media Variant

**Cardinality:** One-to-many

```text
MEDIA_ASSET 1 ───────< N MEDIA_VARIANT
```

Variants may include:

- thumbnail;
- mobile size;
- print size;
- compressed audio;
- alternate format.

---

### 11.2 Media Asset ↔ Domain Entity

**Cardinality:** Many-to-many

```text
MEDIA_ASSET N >──────< N DOMAIN_ENTITY
```

Resolved conceptually through:

```text
ASSET_LINK
```

Assets may be linked to:

- character;
- world;
- location;
- story;
- scene;
- item;
- map;
- generation output.

Physical design may use dedicated link tables for major entity types.

---

## 12. Audit and Operations Relationships

### 12.1 User → Audit Log

**Cardinality:** One-to-many, optional actor

```text
USER 1 ───────< N AUDIT_LOG
```

System actions may have no user actor but must have a system actor identity.

---

### 12.2 Domain Entity → Audit Log

Conceptually many-to-many through subject references.

Critical domains should use explicit subject identifiers and types.

Audit records must be append-only.

---

## 13. High-Risk Many-to-Many Relationships

The following relationships require special design attention:

1. Character ↔ Character
2. Character ↔ Group
3. Story Session ↔ Character
4. World Event ↔ Character
5. Memory ↔ Referenced Entity
6. Inventory ↔ Item
7. Media Asset ↔ Domain Entity
8. Context Package ↔ Domain Entity
9. User ↔ Role
10. Choice Consequence ↔ Affected Entity

These must not be reduced to uncontrolled JSON arrays when they affect integrity or querying.

---

## 14. Ownership Paths

### 14.1 Child-Owned Story Data

```text
USER
  -> CHILD_PROFILE
      -> STORY_SESSION
          -> CHOICE_SELECTION
          -> STORY_SESSION_STATE
          -> GENERATED_OUTPUT
```

---

### 14.2 Child-Owned Character Data

```text
USER
  -> CHILD_PROFILE
      -> CHARACTER
          -> INVENTORY
          -> MEMORY
          -> EMOTIONAL_STATE
```

---

### 14.3 World-Owned Data

```text
UNIVERSE
  -> WORLD
      -> REGION
          -> LOCATION
              -> SETTLEMENT
      -> CHARACTER
      -> WORLD_EVENT
      -> WORLD_CLOCK
```

---

### 14.4 Shared and Private Data Separation

A child’s private session history must not be confused with shared world state.

Example:

```text
Shared:
WORLD_EVENT = “The bridge collapsed”

Private:
MEMORY = “Lina saw the bridge collapse”
STORY_SESSION = Lina’s experience of the event
```

---

## 15. Conceptual Transaction Boundaries

### 15.1 Choice Commit Transaction

Must atomically include, where applicable:

- create choice selection;
- advance story session;
- update inventory;
- update relationships;
- create memories;
- update current emotional states;
- append domain events;
- create outbox messages.

---

### 15.2 Item Transfer Transaction

Must atomically include:

- validate current ownership;
- remove or decrement source entry;
- add or increment target entry;
- create transfer history;
- append domain event.

---

### 15.3 Simulation Commit Transaction

A simulation run may use multiple smaller transactions.

Each committed simulation unit should atomically include:

- state mutation;
- history record;
- domain event;
- scheduled follow-up effect.

The entire ten-day offline simulation does not need to be one giant transaction.

---

### 15.4 Story Generation Commit

Must distinguish:

- generation attempt;
- validated output;
- published story version;
- session-visible version.

Generated content must not become active before validation completes.

---

## 16. Conceptual Deletion Rules

### Restrict deletion

Use for:

- worlds with active sessions;
- characters referenced by completed stories;
- item definitions with instances;
- story versions used by sessions.

### Archive instead of delete

Use for:

- stories;
- characters;
- worlds;
- child profiles where retention applies;
- prompt templates.

### Cascade only for true dependent records

Potential cascade examples:

- temporary session-state fragments;
- uncommitted generation attempt data;
- disposable cache metadata.

Audit, completed sessions and historical choices must not disappear through uncontrolled cascades.

---

## 17. Conceptual Cardinality Summary

| Parent | Relationship | Child | Cardinality |
|---|---|---|---|
| User | owns | Child Profile | 1:N |
| User | has | User Identity | 1:N |
| User | assigned | Role | N:M |
| Child Profile | owns | Character | 1:N |
| Child Profile | starts | Story Session | 1:N |
| Universe | contains | World | 1:N |
| World | contains | Region | 1:N |
| Region | contains | Location | 1:N |
| Location | connects to | Location | N:M |
| World | contains | Character | 1:N |
| Character | relates to | Character | N:M |
| Character | has | Memory | 1:N |
| Character | has | Goal | 1:N |
| Character | belongs to | Group | N:M |
| Story | has | Story Version | 1:N |
| Story Version | has | Story Session | 1:N |
| Story Session | includes | Character | N:M |
| Scene | contains | Choice Point | 1:N |
| Choice Point | offers | Choice Option | 1:N |
| Choice Option | causes | Consequence | 1:N |
| Inventory | contains | Item | N:M |
| World | has | World Event | 1:N |
| World Event | involves | Character | N:M |
| World | has | Simulation Run | 1:N |
| Generation Request | has | Generation Run | 1:N |
| Generation Run | produces | Output | 1:N |
| Media Asset | has | Variant | 1:N |

---

## 18. Conceptual ERD Decisions

1. User and child profile are separate entities.
2. NPCs and playable characters share a common character root model.
3. Relationships are directional and relational.
4. Story sessions reference immutable story versions.
5. Choices are append-only historical records after commit.
6. Inventory ownership is explicit and transactional.
7. Memories have one owner but may reference many entities.
8. Current emotional state and emotion history are separate concepts.
9. World events and domain events are not the same entity.
10. PostgreSQL remains the authoritative source for all persistent relationships.
11. Media binaries remain outside PostgreSQL.
12. AI generation attempts and accepted outputs are separate.
13. Shared world state and child-private experience data are separate.
14. Full event sourcing is not used.
15. Many-to-many relationships use explicit join entities.

---

## 19. Open Questions for Logical Data Model

The following questions will be resolved in the next design step:

1. Should NPC and playable character specializations use one table or subtype tables?
2. Should current emotional state be embedded in `characters` or use a dedicated table?
3. How many explicit memory link tables are necessary?
4. Should inventories use separate owner-specific tables or a constrained owner abstraction?
5. How should delayed consequences reference multiple target types?
6. Which social relationship dimensions deserve normal columns?
7. Which simulation payloads remain JSONB?
8. Which entities require optimistic concurrency versions?
9. Which history tables require partitioning?
10. Which PostgreSQL schemas will be physically created?

---

## 20. Next Artifact

The next document is:

**Logical Data Model v1**

It will convert this conceptual ERD into:

- logical tables;
- primary keys;
- foreign keys;
- required and optional relationships;
- normalization decisions;
- subtype strategies;
- canonical status values;
- initial JSONB boundaries.
