
# Project LUMI — World Event and Simulation Schema v1

- Status: Accepted
- Phase: Persistence Implementation

## Purpose

Defines the persistence model for autonomous world simulation, background events and delayed consequences.

## Aggregate Roots

- WorldEvent
- SimulationRun

Supporting entities:

- EventChain
- DelayedEffect
- SimulationCheckpoint

## World Events

`world_events`

Core fields:

- id
- world_id
- event_type
- title
- summary
- severity
- scope
- status
- starts_at
- ends_at
- created_at
- version

Scopes:

- location
- settlement
- region
- world

Lifecycle:

planned → active → resolved → archived

## Simulation Runs

`simulation_runs`

Fields:

- id
- world_id
- started_at
- completed_at
- trigger_type
- simulated_days
- processed_entities
- skipped_entities
- result_status
- version

Rules:

- One run processes one world.
- Runs are append-only.

## Simulation Candidates

Priority factors:

- active story relevance
- proximity
- influence
- goals
- injuries
- routines
- time sensitivity

Low-priority entities may be skipped.

## Delayed Effects

`delayed_effects`

Stores future consequences.

Examples:

- crop grows
- bridge repaired
- wound heals
- festival begins
- storm ends

States:

pending
active
completed
cancelled

## Event Chains

Events may trigger other events.

Example:

Storm
→ Flood
→ Road Closed
→ Merchant Delayed

Chains remain fully auditable.

## Freeze Policy

Simulation intensity decays over time.

Default policy:

- Day 1–3: full simulation
- Day 4–7: reduced simulation
- Day 8–10: minimal simulation
- After Day 10: world frozen

Frozen worlds resume from the stored checkpoint instead of replaying unlimited elapsed time.

## Catch-up Simulation

When a child returns:

- load checkpoint
- resume world clock
- process pending delayed effects
- continue active events

No unlimited historical replay.

## Idempotency

Every simulation run has:

- correlation_id
- simulation_run_id

Repeated execution must not duplicate results.

## Checkpoints

`simulation_checkpoints`

Contain:

- world clock
- active events
- pending effects
- simulation cursor
- schema version

They are compact snapshots, not full database copies.

## Repository Operations

- createSimulationRun
- completeSimulationRun
- createWorldEvent
- resolveWorldEvent
- enqueueDelayedEffect
- saveCheckpoint

## Domain Events

- WorldEventCreated
- WorldEventResolved
- SimulationStarted
- SimulationCompleted
- DelayedEffectTriggered
- WorldFrozen
- WorldResumed

## Acceptance Criteria

- Background simulation is persistent.
- Event chains are traceable.
- Delayed effects survive restarts.
- Ten-day decay/freeze is supported.
- Simulation runs are idempotent.
- Checkpoints support resume.

## Decisions Finalized

1. Simulation runs are append-only.
2. World events are independent persistent entities.
3. Delayed effects are first-class records.
4. Ten-day decay/freeze is persisted.
5. Checkpoints are compact recovery states.
6. Idempotent processing is mandatory.

## Next Artifact

**Media & Asset Schema v1**
