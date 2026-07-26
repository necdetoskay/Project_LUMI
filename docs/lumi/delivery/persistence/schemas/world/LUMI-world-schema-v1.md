
# Project LUMI — World Schema v1

- **Document Type:** Persistence Schema Specification
- **Status:** Accepted
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Shared Database Types v1, Child Profile Schema v1

---

## 1. Purpose

This document defines the persistent PostgreSQL data model for LUMI worlds.

The World domain stores the stable, evolving universe state that belongs to a child profile.

It includes:

- world identity;
- ownership;
- regions;
- locations;
- settlements;
- world clock;
- season and environmental state;
- active world state;
- world lifecycle;
- simulation metadata.

---

## 2. Aggregate Strategy

`World` is an aggregate root.

The aggregate directly owns:

- world metadata;
- world clock;
- active world state;
- lifecycle state;
- simulation cursor.

Large substructures such as regions, locations and settlements are persisted as related entities with explicit ownership rules.

A complete world must not be fully hydrated for every operation.

---

## 3. Core World Table

### `worlds`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Primary identifier |
| child_profile_id | uuid | yes | Owning child profile |
| name | text | yes | User-facing world name |
| slug | text | yes | Stable scoped identifier |
| description | text | no | Short world description |
| world_type | text / enum | yes | fantasy, oceanic, sky, mixed, space, etc. |
| lifecycle_status | text / enum | yes | draft, active, paused, archived |
| active_region_id | uuid | no | Current primary region |
| active_location_id | uuid | no | Current child-facing location |
| world_clock_id | uuid | no | Current clock record |
| current_state_version | integer | yes | World state concurrency version |
| simulation_enabled | boolean | yes | Enables background simulation |
| last_simulated_at | timestamptz | no | Last completed simulation point |
| simulation_frozen_at | timestamptz | no | Time at which world was frozen |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Last update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

---

## 4. World Ownership

A world belongs to exactly one child profile.

Rules:

- `worlds.child_profile_id` is mandatory;
- one child may own multiple worlds;
- a world cannot change owner;
- active world selection is stored on the child profile;
- child deletion triggers archive/anonymization workflow, not immediate world deletion.

Foreign key behavior:

```text
child_profiles.id
    1
    ↓
worlds.child_profile_id
    N
```

Recommended delete behavior:

```text
ON DELETE RESTRICT
```

Archival is managed explicitly.

---

## 5. World Slug

`slug` provides a stable identifier within one child profile.

Unique constraint:

```text
UNIQUE (child_profile_id, slug)
```

The slug is not globally unique.

It must not be used as the primary key.

---

## 6. Region Table

### `world_regions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Region identifier |
| world_id | uuid | yes | Owning world |
| parent_region_id | uuid | no | Optional hierarchy |
| name | text | yes | Region name |
| slug | text | yes | Scoped stable identifier |
| region_type | text / enum | yes | forest, island, mountain, sky, sea, etc. |
| description | text | no | Region summary |
| climate_profile | jsonb | no | Dynamic climate attributes |
| ecology_profile | jsonb | no | Dynamic ecology attributes |
| cultural_profile | jsonb | no | Dynamic culture attributes |
| danger_level | smallint | yes | Relative narrative danger |
| discovery_status | text / enum | yes | hidden, discovered, visited |
| is_active | boolean | yes | Operational state |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Concurrency version |

Unique constraint:

```text
UNIQUE (world_id, slug)
```

---

## 7. Region Hierarchy

Regions may optionally contain subregions.

Example:

```text
Northern Continent
└── Whispering Forest
    └── Moonlit Grove
```

Rules:

- parent region must belong to the same world;
- a region cannot be its own parent;
- cycles are prohibited;
- hierarchy depth should remain limited operationally;
- location hierarchy must not be overloaded into region hierarchy.

Cycle detection is enforced in application logic and validated by persistence tests.

---

## 8. Location Table

### `world_locations`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Location identifier |
| world_id | uuid | yes | Owning world |
| region_id | uuid | yes | Parent region |
| parent_location_id | uuid | no | Optional location hierarchy |
| name | text | yes | Location name |
| slug | text | yes | Region-scoped stable identifier |
| location_type | text / enum | yes | cave, village, harbor, tower, path, etc. |
| description | text | no | Location summary |
| coordinates | jsonb | no | Abstract map coordinates |
| environmental_state | jsonb | no | Current local conditions |
| access_state | text / enum | yes | open, restricted, hidden, sealed |
| discovery_status | text / enum | yes | hidden, discovered, visited |
| narrative_importance | smallint | yes | Story relevance weight |
| simulation_priority | smallint | yes | Background simulation weight |
| is_active | boolean | yes | Operational state |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Concurrency version |

Recommended uniqueness:

```text
UNIQUE (region_id, slug)
```

---

## 9. Location Ownership Rules

- every location belongs to one world;
- every location belongs to one region;
- region and location world IDs must match;
- parent location must belong to the same region or follow an explicitly approved cross-region rule;
- archived regions cannot receive new active locations;
- active world location must belong to the same world.

A composite integrity check should be implemented through application validation and integration tests.

---

## 10. Settlement Table

### `world_settlements`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Settlement identifier |
| world_id | uuid | yes | Owning world |
| region_id | uuid | yes | Region |
| location_id | uuid | no | Main location |
| name | text | yes | Settlement name |
| settlement_type | text / enum | yes | village, town, camp, city, colony |
| population_estimate | integer | no | Approximate population |
| prosperity_level | smallint | yes | Economic condition |
| safety_level | smallint | yes | Relative safety |
| governance_profile | jsonb | no | Governance metadata |
| economy_profile | jsonb | no | Economy metadata |
| culture_profile | jsonb | no | Culture metadata |
| lifecycle_status | text / enum | yes | active, damaged, abandoned, rebuilt |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Concurrency version |

---

## 11. World Clock Table

### `world_clocks`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Clock identifier |
| world_id | uuid | yes | Owning world |
| calendar_profile | jsonb | yes | Calendar configuration |
| current_day | integer | yes | World day number |
| current_time_segment | text / enum | yes | dawn, morning, noon, evening, night |
| current_season | text / enum | yes | Current season |
| current_year | integer | yes | World year |
| time_scale | numeric | yes | Simulation time multiplier |
| last_advanced_at | timestamptz | no | Last progression timestamp |
| paused_at | timestamptz | no | Pause timestamp |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| version | integer | yes | Concurrency version |

Relationship:

```text
worlds
1
↔
1
world_clocks
```

Unique constraint:

```text
UNIQUE (world_id)
```

---

## 12. Time Progression Policy

The world clock advances through explicit simulation transactions.

Rules:

- no implicit database trigger advances time;
- time progression is controlled by application services;
- background simulation applies decaying intensity;
- after the configured inactivity threshold, the world freezes;
- default LUMI inactivity rule: simulation relevance decays across ten days, then freezes;
- resume logic begins from the frozen state, not from unbounded catch-up.

The persistence layer stores the cursor and freeze timestamps; the simulation engine owns the progression formula.

---

## 13. World State Table

### `world_states`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | State record identifier |
| world_id | uuid | yes | Owning world |
| state_kind | text / enum | yes | current, snapshot, checkpoint |
| schema_version | integer | yes | JSON state schema |
| state_payload | jsonb | yes | Dynamic state document |
| effective_at | timestamptz | yes | State effective time |
| created_at | timestamptz | yes | Creation timestamp |
| created_by | uuid | no | Actor or system principal |
| correlation_id | uuid | no | Operation correlation |
| version | integer | yes | Record version |

The current relational state remains authoritative.

`state_payload` is used for:

- simulation summary;
- environmental summary;
- temporary world context;
- checkpoint metadata.

It must not duplicate core relational ownership data.

---

## 14. Current State Strategy

Recommended model:

- one active `current` state row per world;
- optional immutable checkpoint rows;
- no unbounded full snapshot generation;
- snapshots created only at meaningful boundaries;
- JSON schema version required.

Partial unique index:

```text
UNIQUE (world_id)
WHERE state_kind = 'current'
```

---

## 15. Environmental State

World-wide environment may include:

- weather pattern;
- season intensity;
- celestial events;
- daylight profile;
- ecological stress;
- magical or fantastical conditions.

Stable, queryable fields should become columns.

Dynamic or model-specific details may remain in versioned JSONB.

---

## 16. World Lifecycle

Lifecycle:

```text
draft
↓
active
↓
paused
↓
archived
```

Allowed transitions:

```text
draft -> active
active -> paused
paused -> active
active -> archived
paused -> archived
```

Prohibited:

```text
archived -> active
```

Reactivation of an archived world requires an explicit restoration workflow and architecture approval.

---

## 17. Active Region and Location

`worlds.active_region_id` and `worlds.active_location_id` are denormalized navigation pointers.

Rules:

- both must belong to the same world;
- active location should normally belong to active region;
- pointers are updated in the same transaction as child movement;
- historical movement is stored separately in story/session or audit records;
- pointer fields are not the complete travel history.

---

## 18. Simulation Metadata

The world table stores high-level simulation control.

Additional operational data belongs to the simulation schema.

World-level fields include:

- `simulation_enabled`;
- `last_simulated_at`;
- `simulation_frozen_at`;
- `current_state_version`.

Detailed simulation jobs, runs and effects are defined in the World Simulation Schema.

---

## 19. JSONB Profiles

Allowed JSONB profile fields:

- climate profile;
- ecology profile;
- culture profile;
- governance profile;
- economy profile;
- environmental state;
- abstract coordinates;
- world calendar profile.

Each payload must include:

```json
{
  "schema_version": 1
}
```

Runtime validation is mandatory.

---

## 20. Index Strategy

### `worlds`

Recommended indexes:

```text
(child_profile_id, lifecycle_status)
(child_profile_id, updated_at DESC)
(active_region_id)
(active_location_id)
(last_simulated_at)
```

### `world_regions`

Recommended indexes:

```text
(world_id, is_active)
(world_id, discovery_status)
(parent_region_id)
```

### `world_locations`

Recommended indexes:

```text
(world_id, is_active)
(region_id, discovery_status)
(region_id, narrative_importance DESC)
(parent_location_id)
```

### `world_settlements`

Recommended indexes:

```text
(world_id, lifecycle_status)
(region_id)
(location_id)
```

### `world_states`

Recommended indexes:

```text
(world_id, state_kind)
(world_id, effective_at DESC)
```

---

## 21. Constraints

Required constraints:

- danger level range;
- prosperity level range;
- safety level range;
- narrative importance range;
- simulation priority range;
- positive world clock values;
- positive time scale;
- valid lifecycle transitions through application layer;
- one world clock per world;
- one current world state per world;
- ownership consistency.

Recommended numeric range:

```text
0–100
```

unless another domain-specific scale is approved.

---

## 22. Deletion and Archive Policy

Worlds, regions, locations and settlements use soft archive.

Rules:

- archive parent before child purge;
- archived parent prevents new active children;
- historical story references remain valid;
- world state checkpoints remain append-only;
- purge requires retention and child-data policy approval.

---

## 23. Repository Interface

Recommended `WorldRepository` operations:

```text
createWorld
findById
findOwnedWorld
listWorldsForChild
activateWorld
pauseWorld
archiveWorld
setActiveRegion
setActiveLocation
advanceWorldClock
saveCurrentState
createCheckpoint
updateWithExpectedVersion
```

The repository must not expose unrestricted table access.

---

## 24. Query Services

Recommended read queries:

```text
getWorldOverview
getWorldMap
listDiscoveredRegions
listLocationsForRegion
getCurrentWorldContext
getSettlementSummary
getWorldSimulationStatus
```

These may combine region, location, settlement and current state data.

---

## 25. Transaction Boundaries

Examples of single transactions:

### Create World

```text
insert world
insert world clock
insert current world state
insert initial region
insert initial location
update active pointers
insert domain event
insert outbox message
commit
```

### Move Child

```text
validate ownership
validate location access
update active region/location
update story session context
insert movement history/event
insert outbox message
commit
```

### Advance Time

```text
lock world clock
calculate target time
update clock
update world state
write domain events
write outbox messages
commit
```

---

## 26. Concurrency

World and world clock updates require optimistic concurrency.

Critical time progression may additionally use row locking.

Examples:

```text
UPDATE worlds
SET ...
WHERE id = :id
AND version = :expected_version
```

World clock progression may use:

```text
SELECT ... FOR UPDATE
```

when multiple workers could advance the same world.

---

## 27. Domain Events

Suggested events:

```text
WorldCreated
WorldActivated
WorldPaused
WorldArchived
RegionDiscovered
LocationDiscovered
ActiveLocationChanged
WorldClockAdvanced
WorldSimulationFrozen
WorldSimulationResumed
WorldCheckpointCreated
SettlementStateChanged
```

Events are persisted through the approved domain event and outbox model.

---

## 28. Security and Access

- every world query is scoped by authorized parent/child ownership;
- world IDs alone do not grant access;
- administrative access is audited;
- archived child data remains protected;
- simulation workers receive minimum required permissions.

---

## 29. Test Requirements

Required integration tests:

- create world and initial clock;
- child ownership enforcement;
- duplicate scoped slug rejection;
- invalid active location rejection;
- cross-world region/location rejection;
- one clock per world;
- one current state per world;
- optimistic concurrency conflict;
- world clock locking;
- archive behavior;
- transaction rollback;
- event and outbox atomicity.

---

## 30. Acceptance Criteria

The World Schema is accepted when:

1. A child can own multiple worlds.
2. Every world has one clock.
3. Regions and locations are scoped correctly.
4. Active pointers cannot reference another world.
5. World state JSON is versioned.
6. Background simulation cursors are persisted.
7. Ten-day decay/freeze support can be implemented.
8. Archive rules preserve story history.
9. Concurrency tests pass.
10. World creation commits atomically with events and outbox.

---

## 31. Decisions Finalized

1. `World` is an aggregate root.
2. A world belongs permanently to one child profile.
3. Regions and locations are separate persistent entities.
4. Settlements are modeled independently from locations.
5. Every world has exactly one world clock.
6. Time does not advance through database triggers.
7. The application owns simulation progression.
8. The ten-day decay/freeze policy is persisted through simulation cursor fields.
9. Active region/location are denormalized navigation pointers.
10. Relational state remains authoritative.
11. JSONB is limited to dynamic versioned profiles.
12. World state checkpoints are optional and immutable.
13. Optimistic concurrency is mandatory.
14. Critical clock progression may use row locks.
15. Worlds use archive lifecycle instead of direct deletion.

---

## 32. Next Artifact

**Character Schema v1**

The next document will define:

- character aggregate;
- traits and trait vectors;
- relationships;
- emotions;
- goals;
- memories;
- routines;
- time-sensitivity;
- NPC influence;
- character lifecycle.
