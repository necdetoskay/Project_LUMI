# Project LUMI — World Simulation, Event and Time Progression Data Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Database Domain Map, Conceptual ERD v1, Logical Data Model v1, Story Session Transaction Boundaries v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the data model for:

- world time;
- offline progression;
- background simulation;
- event creation and propagation;
- event chains;
- simulation relevance;
- intensity decay;
- checkpoints;
- delayed effects;
- the ten-day offline simulation limit;
- world freeze behavior after the limit.

The model supports a world that continues to live while the child is away, without creating confusing or excessive changes after long absences.

---

## 2. Core Time Principle

Project LUMI uses two distinct time systems:

1. **Application Time**
2. **World Time**

### Application Time

Real UTC timestamps used for:

- database records;
- login history;
- job execution;
- audit;
- synchronization;
- retries.

Examples:

```text
created_at
updated_at
last_login_at
processed_at
```

### World Time

Narrative and simulation time used for:

- day/night;
- seasons;
- festivals;
- wounds;
- travel;
- crop growth;
- routines;
- world events.

Examples:

```text
world_datetime
started_world_time
ends_world_time
```

Application time and world time must never be treated as interchangeable.

---

## 3. Canonical World Clock

Each world has exactly one authoritative clock.

### Table: `world_clocks`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL UNIQUE
current_world_time TIMESTAMPTZ NOT NULL
time_scale NUMERIC NOT NULL DEFAULT 1
simulation_status TEXT NOT NULL
last_simulated_real_at TIMESTAMPTZ
last_simulated_world_at TIMESTAMPTZ
last_player_activity_at TIMESTAMPTZ
freeze_reason TEXT NULL
version INTEGER NOT NULL DEFAULT 1
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### Canonical Statuses

```text
active
paused
frozen_offline_limit
frozen_manual
maintenance
archived
```

---

## 4. Ten-Day Offline Rule

The maximum automatic offline progression window is:

```text
10 real days
```

This is an architectural rule.

When the user returns:

```text
offline_duration = now - last_player_activity_at
```

The simulated duration is:

```text
min(offline_duration, 10 days)
```

Any duration after the first ten days is not simulated automatically.

### Example

```text
Last activity: 1 July
Return: 16 July
Offline duration: 15 days
Simulated duration: 10 days
Frozen duration: 5 days
```

The world state after the tenth simulated day remains static until the user returns.

---

## 5. Decaying Simulation Intensity

The ten-day window is not simulated at equal detail.

Recommended intensity profile:

| Offline interval | Simulation detail |
|---|---|
| 0–24 hours | High |
| Day 2–3 | Medium-high |
| Day 4–6 | Medium |
| Day 7–8 | Low |
| Day 9–10 | Very low |
| After day 10 | Frozen |

### Purpose

This approach:

- preserves continuity;
- avoids excessive world changes;
- lowers processing cost;
- prevents important characters from changing too much;
- reduces surprise when the child returns.

---

## 6. Simulation Intensity Model

### Table: `simulation_intensity_profiles`

Recommended fields:

```text
id UUID PK
code TEXT NOT NULL UNIQUE
name TEXT NOT NULL
from_elapsed_hours INTEGER NOT NULL
to_elapsed_hours INTEGER NULL
detail_level TEXT NOT NULL
npc_relevance_threshold NUMERIC NOT NULL
event_probability_multiplier NUMERIC NOT NULL
state_change_multiplier NUMERIC NOT NULL
max_tasks_per_entity INTEGER NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

Example profiles:

```text
offline_high
offline_medium
offline_low
offline_minimal
```

---

## 7. Simulation Run

Each progression operation creates one simulation run.

### Table: `simulation_runs`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
trigger_type TEXT NOT NULL
status TEXT NOT NULL
requested_real_from TIMESTAMPTZ NOT NULL
requested_real_to TIMESTAMPTZ NOT NULL
effective_real_from TIMESTAMPTZ NOT NULL
effective_real_to TIMESTAMPTZ NOT NULL
world_time_from TIMESTAMPTZ NOT NULL
world_time_to TIMESTAMPTZ NOT NULL
offline_duration_seconds BIGINT NOT NULL
simulated_duration_seconds BIGINT NOT NULL
discarded_duration_seconds BIGINT NOT NULL DEFAULT 0
intensity_profile_version TEXT NOT NULL
started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
failure_code TEXT NULL
failure_detail_jsonb JSONB NULL
idempotency_key TEXT NOT NULL UNIQUE
created_at TIMESTAMPTZ NOT NULL
```

### Trigger Types

```text
user_return
scheduled_tick
story_consequence
admin
recovery
manual_test
```

### Statuses

```text
pending
running
completed
partially_completed
failed
cancelled
```

---

## 8. Simulation Segments

A long run is divided into intensity-aware segments.

### Table: `simulation_segments`

Recommended fields:

```text
id UUID PK
simulation_run_id UUID NOT NULL
sequence_no INTEGER NOT NULL
world_time_from TIMESTAMPTZ NOT NULL
world_time_to TIMESTAMPTZ NOT NULL
detail_level TEXT NOT NULL
intensity_multiplier NUMERIC NOT NULL
status TEXT NOT NULL
started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
UNIQUE (simulation_run_id, sequence_no)
```

Example:

```text
Segment 1: first 24 hours, high
Segment 2: next 48 hours, medium-high
Segment 3: next 72 hours, medium
Segment 4: next 48 hours, low
Segment 5: final 48 hours, minimal
```

---

## 9. Simulation Tasks

Each segment may create bounded tasks.

### Table: `simulation_tasks`

Recommended fields:

```text
id UUID PK
simulation_run_id UUID NOT NULL
simulation_segment_id UUID NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
task_type TEXT NOT NULL
priority NUMERIC NOT NULL
relevance_score NUMERIC NOT NULL
status TEXT NOT NULL
attempt_count INTEGER NOT NULL DEFAULT 0
scheduled_world_time TIMESTAMPTZ NOT NULL
started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
result_jsonb JSONB NULL
error_jsonb JSONB NULL
idempotency_key TEXT NOT NULL UNIQUE
```

### Task Types

```text
character_routine
character_need_update
wound_progression
goal_progression
relationship_decay
settlement_update
environment_update
event_resolution
scheduled_effect
festival_transition
resource_regeneration
```

---

## 10. Relevance-Based Simulation

Not every entity is simulated.

Each candidate receives a relevance score.

### Relevance Inputs

- proximity to last known player location;
- relationship to player characters;
- active injury or danger;
- active story participation;
- pending goal;
- pending promise or debt;
- event involvement;
- settlement importance;
- explicit persistent flag;
- recent memory connection.

### Suggested Formula

```text
relevance =
  proximity_weight
+ relationship_weight
+ active_event_weight
+ unresolved_state_weight
+ narrative_importance_weight
+ recency_weight
```

Entities below the current intensity threshold are skipped.

---

## 11. Time Sensitivity Vector

Each entity may define how strongly it reacts to time.

Recommended dimensions:

```text
health
hunger
fatigue
emotion
relationship
goal
routine
environment
economy
social
```

### Storage

Stable, frequently queried values may use columns.

Flexible dimensions may use:

```text
time_sensitivity_jsonb
```

Example:

```json
{
  "health": 0.9,
  "hunger": 0.8,
  "fatigue": 0.7,
  "emotion": 0.3,
  "relationship": 0.1,
  "goal": 0.5
}
```

### Example

A healthy fox far from the player:

```text
low relevance
low time sensitivity
skip
```

An injured fox last seen near the player:

```text
high relevance
high health sensitivity
simulate wound progression
```

---

## 12. Scheduled Effects

Future effects are stored explicitly.

### Table: `scheduled_effects`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
source_type TEXT NOT NULL
source_id UUID NULL
target_type TEXT NOT NULL
target_id UUID NOT NULL
effect_type TEXT NOT NULL
payload_jsonb JSONB NOT NULL
due_world_time TIMESTAMPTZ NULL
condition_jsonb JSONB NULL
status TEXT NOT NULL
priority NUMERIC NOT NULL DEFAULT 0
attempt_count INTEGER NOT NULL DEFAULT 0
idempotency_key TEXT NOT NULL UNIQUE
created_at TIMESTAMPTZ NOT NULL
applied_at TIMESTAMPTZ NULL
cancelled_at TIMESTAMPTZ NULL
```

### Statuses

```text
pending
eligible
processing
applied
cancelled
failed
expired
```

---

## 13. World Events

A world event is an in-world occurrence.

### Table: `world_events`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
region_id UUID NULL
location_id UUID NULL
event_type TEXT NOT NULL
title TEXT NOT NULL
summary TEXT NOT NULL
status TEXT NOT NULL
visibility_scope TEXT NOT NULL
importance NUMERIC NOT NULL
severity NUMERIC NOT NULL
rarity NUMERIC NOT NULL
started_world_time TIMESTAMPTZ NOT NULL
expected_end_world_time TIMESTAMPTZ NULL
actual_end_world_time TIMESTAMPTZ NULL
source_type TEXT NOT NULL
source_id UUID NULL
state_jsonb JSONB NULL
version INTEGER NOT NULL DEFAULT 1
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### Event Statuses

```text
scheduled
active
resolved
failed
cancelled
expired
```

---

## 14. Event Participants

### Table: `event_participants`

Recommended fields:

```text
id UUID PK
world_event_id UUID NOT NULL
character_id UUID NULL
group_id UUID NULL
settlement_id UUID NULL
participant_role TEXT NOT NULL
influence_vector_jsonb JSONB NULL
joined_world_time TIMESTAMPTZ NOT NULL
left_world_time TIMESTAMPTZ NULL
status TEXT NOT NULL
```

Exactly one participant target should be set unless a future explicit multi-target model is introduced.

---

## 15. Event Impacts

### Table: `event_impacts`

Recommended fields:

```text
id UUID PK
world_event_id UUID NOT NULL
target_type TEXT NOT NULL
target_id UUID NOT NULL
impact_type TEXT NOT NULL
impact_vector_jsonb JSONB NULL
magnitude NUMERIC NOT NULL
status TEXT NOT NULL
applied_world_time TIMESTAMPTZ NULL
reversed_world_time TIMESTAMPTZ NULL
source_simulation_run_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
```

Examples:

```text
bridge accessibility -1
settlement morale -0.2
fox fear +0.4
forest resource availability -0.15
```

---

## 16. Event Chains

Events may cause other events.

### Table: `event_links`

Recommended fields:

```text
id UUID PK
source_event_id UUID NOT NULL
target_event_id UUID NOT NULL
relation_type TEXT NOT NULL
strength NUMERIC NOT NULL
created_at TIMESTAMPTZ NOT NULL
CHECK (source_event_id <> target_event_id)
```

### Relation Types

```text
caused
enabled
blocked
escalated
resolved
revealed
rumor_of
continuation_of
```

---

## 17. Event Templates

Reusable event definitions may be stored separately.

### Table: `event_templates`

Recommended fields:

```text
id UUID PK
code TEXT NOT NULL UNIQUE
event_type TEXT NOT NULL
name TEXT NOT NULL
eligibility_rules_jsonb JSONB NOT NULL
default_duration_jsonb JSONB NULL
impact_rules_jsonb JSONB NULL
participant_rules_jsonb JSONB NULL
cooldown_jsonb JSONB NULL
status TEXT NOT NULL
version INTEGER NOT NULL
```

Templates are definitions.

`world_events` are runtime instances.

---

## 18. Rare Events

Rare events must remain rare and meaningful.

Recommended fields on template or runtime state:

```text
rarity
global_cooldown
world_cooldown
max_occurrences
requires_player_presence
requires_story_hook
```

Examples:

- solar eclipse;
- winged horse sighting;
- hidden island surfacing;
- ancient gate awakening.

Rare events should not trigger repeatedly during offline simulation.

---

## 19. Event Eligibility

Eligibility must be evaluated before event creation.

Inputs may include:

- biome;
- season;
- world time;
- settlement state;
- active characters;
- unresolved events;
- child age/content controls;
- event cooldown;
- event history;
- rarity budget.

Eligibility results may be logged in:

### Table: `event_candidate_evaluations`

```text
id BIGINT PK
simulation_run_id UUID NOT NULL
event_template_id UUID NOT NULL
location_id UUID NULL
eligibility_score NUMERIC NOT NULL
selected BOOLEAN NOT NULL
reason_codes_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
```

This table is optional in MVP and useful for tuning.

---

## 20. Background Routine Progression

NPC routines should use bounded simulation rather than replaying every minute.

Example:

Instead of:

```text
simulate 240 individual actions
```

use:

```text
aggregate expected routine outcome
```

Possible outputs:

- location changed;
- hunger increased;
- job task completed;
- relationship had minor drift;
- resource acquired;
- goal advanced.

Detailed scenes are generated only when narratively relevant.

---

## 21. Aggregated State Changes

### Table: `state_transitions`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PK
world_id UUID NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
transition_type TEXT NOT NULL
from_state_jsonb JSONB NULL
to_state_jsonb JSONB NULL
delta_jsonb JSONB NULL
occurred_world_time TIMESTAMPTZ NOT NULL
simulation_run_id UUID NULL
world_event_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
```

This is historical.

The authoritative current state remains in the domain table.

---

## 22. Simulation Checkpoints

Checkpoints support recovery and debugging.

### Table: `simulation_checkpoints`

Recommended fields:

```text
id UUID PK
simulation_run_id UUID NOT NULL
world_id UUID NOT NULL
checkpoint_type TEXT NOT NULL
world_time TIMESTAMPTZ NOT NULL
sequence_no INTEGER NOT NULL
state_hash TEXT NULL
snapshot_reference TEXT NULL
metadata_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
UNIQUE (simulation_run_id, sequence_no)
```

Full-world snapshots should not be created after every task.

Use bounded checkpoints at major segment boundaries.

---

## 23. World State Snapshots

Snapshots are optional and periodic.

### Table: `world_state_snapshots`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
world_time TIMESTAMPTZ NOT NULL
snapshot_type TEXT NOT NULL
schema_version INTEGER NOT NULL
state_jsonb JSONB NOT NULL
checksum TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

### Rule

Snapshots support recovery and inspection.

They do not replace normalized authoritative tables.

---

## 24. Offline Freeze Record

When offline duration exceeds ten days, the skipped duration must be recorded.

### Table: `world_freeze_periods`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
simulation_run_id UUID NULL
freeze_reason TEXT NOT NULL
real_time_from TIMESTAMPTZ NOT NULL
real_time_to TIMESTAMPTZ NULL
world_time_at_freeze TIMESTAMPTZ NOT NULL
resumed_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
```

### Freeze Reason

```text
offline_limit_reached
manual_pause
maintenance
parental_pause
world_archived
```

---

## 25. Return Experience

When the child returns, the application should not expose raw simulation logs.

Instead, it creates a bounded summary.

### Table: `world_return_summaries`

Recommended fields:

```text
id UUID PK
world_id UUID NOT NULL
child_profile_id UUID NOT NULL
simulation_run_id UUID NOT NULL
summary_text TEXT NOT NULL
important_event_ids UUID[] NULL
changed_character_ids UUID[] NULL
generated_output_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
viewed_at TIMESTAMPTZ NULL
```

Preferred later normalization:

- `world_return_summary_events`
- `world_return_summary_characters`

The summary should emphasize:

- a few meaningful changes;
- unresolved hooks;
- familiar characters;
- no overwhelming detail.

---

## 26. Simulation Transaction Boundaries

One ten-day simulation should not run as one giant transaction.

Recommended boundary:

```text
one segment
or
one bounded task batch
```

Each committed batch writes:

- current state changes;
- state history;
- domain events;
- outbox messages;
- checkpoint progress.

If a later batch fails, completed batches remain valid and the run resumes from the last checkpoint.

---

## 27. Idempotency

Idempotency is mandatory for:

- simulation run creation;
- each simulation task;
- scheduled effect application;
- event impact application;
- event resolution;
- world clock advancement.

Example uniqueness:

```text
UNIQUE (idempotency_key)
```

A resumed run must not duplicate prior effects.

---

## 28. World Clock Advancement Rule

The world clock advances only after the corresponding simulation segment commits successfully.

Never advance the clock first and calculate state later.

Recommended sequence:

1. simulate segment;
2. commit state changes;
3. append events/outbox;
4. advance world clock;
5. write checkpoint;
6. commit.

---

## 29. Failure and Recovery

### Recoverable Failures

- worker restart;
- timeout;
- deadlock;
- transient database failure;
- provider failure for optional summaries.

### Recovery Behavior

- resume from last committed checkpoint;
- reuse idempotency keys;
- do not reapply completed tasks;
- preserve current world time;
- mark failed task with error metadata.

### Non-Recoverable Failures

- invalid invariant;
- cross-world ownership error;
- corrupted event template;
- impossible state transition.

These require repair or administrative intervention.

---

## 30. World Event and Domain Event Separation

### World Event

Something that happened inside the fictional world.

Example:

```text
A storm damaged the bridge.
```

### Domain Event

A technical record that a business state changed.

Example:

```text
world_event.created
location.accessibility_changed
```

One world event may produce several domain events.

They must remain separate tables and concepts.

---

## 31. Simulation and Story Interaction

Story consequences may:

- create immediate world events;
- schedule future effects;
- change location state;
- activate an event chain;
- alter simulation relevance.

Simulation may:

- create story hooks;
- update NPC states;
- resolve background events;
- produce world news.

Simulation must not silently rewrite committed story history.

---

## 32. Child Presence Rules

Some events may happen without the child.

Others require presence.

Recommended event properties:

```text
can_occur_offscreen
requires_player_presence
requires_active_story
visibility_scope
```

Events requiring child presence remain pending until an eligible story session occurs.

---

## 33. Visibility Scope

Canonical values:

```text
private_child
participants_only
location
region
world
system_hidden
```

A world event may be shared, but each character may form a different memory of it.

---

## 34. Performance and Cost Controls

Simulation budgets should be configurable.

Recommended controls:

```text
max_entities_per_run
max_tasks_per_segment
max_events_per_run
max_rare_events_per_run
max_llm_calls_per_run
max_summary_tokens
max_database_time_per_batch
```

The core state simulation should not require an LLM call for every entity.

LLM is reserved for:

- narrative summaries;
- special event descriptions;
- high-value dialogue;
- story hooks.

---

## 35. MVP Scope

Required for MVP:

- `world_clocks`
- `simulation_runs`
- `simulation_segments`
- `world_events`
- `event_participants`
- `domain_events`
- `outbox_messages`
- `scheduled_effects`
- basic relevance calculation
- ten-day cap
- intensity decay
- checkpoint support

Deferred to P2:

- detailed settlements;
- economy simulation;
- extensive event candidate logs;
- full snapshots;
- advanced routine aggregation;
- complex seasonal ecology.

---

## 36. Critical Constraints

1. One world clock per world.
2. World time never moves backward.
3. Automatic offline simulation never exceeds ten real days.
4. Time after the ten-day cap is recorded as frozen, not simulated.
5. Later offline days use lower detail.
6. Simulation applies only to relevant entities.
7. World clock advances only with committed state.
8. Tasks and delayed effects are idempotent.
9. Rare events obey cooldown and occurrence limits.
10. Story history is immutable.
11. World events and domain events are separate.
12. Snapshots never replace normalized current state.
13. Long simulations use multiple bounded transactions.
14. Recovery resumes from checkpoints.
15. The user sees a concise return summary, not raw logs.

---

## 37. Example Return Scenario

```text
Last activity:
1 July, 18:00

Return:
14 July, 18:00

Real offline duration:
13 days

Effective simulated duration:
10 days

Frozen duration:
3 days
```

Simulation behavior:

```text
Day 1:
high-detail nearby NPCs and active injuries

Day 2–3:
routines, goals and local events

Day 4–6:
important NPCs and unresolved events

Day 7–8:
only high-relevance changes

Day 9–10:
minimal critical progression

After day 10:
world frozen
```

Return summary example:

```text
While you were away, the fox recovered enough to leave its shelter.
The village repaired part of the old bridge.
A strange light was seen near the northern hill.
```

---

## 38. Decisions Finalized

1. LUMI separates application time and world time.
2. Every world has one authoritative world clock.
3. Offline automatic simulation is capped at ten real days.
4. Simulation intensity decreases throughout the ten-day window.
5. Time after ten days remains frozen.
6. Entity simulation is relevance-based.
7. Time sensitivity is modeled as a vector.
8. Long runs are divided into segments and tasks.
9. World events represent fictional occurrences.
10. Domain events represent technical state changes.
11. Event chains use explicit relations.
12. Scheduled effects are idempotent.
13. World clock advancement follows successful state commit.
14. Recovery uses checkpoints.
15. Child return experience uses a concise world summary.
16. LLM usage is optional and bounded in background simulation.
17. Rare events require cooldown and eligibility rules.
18. Story history cannot be rewritten by background simulation.

---

## 39. Next Artifact

**Inventory, Item Instance and Persistent Object Data Model v1**

The next document will define:

- item definitions;
- unique item instances;
- stackable items;
- ownership and transfer;
- durability;
- capabilities;
- story persistence;
- item history;
- equipping;
- world-bound and child-bound items.
