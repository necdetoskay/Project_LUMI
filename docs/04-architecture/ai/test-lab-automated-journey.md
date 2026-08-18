# LUMI Test Lab — Automated Journey Mode

## Purpose

Automated Journey is a Test Lab execution mode for running a selected sequence of production generation phases end-to-end with one configured generator model. It is intended for regression, model benchmarking, long-horizon continuity checks, and cost/latency measurement. It does not replace manual Test Lab review.

## Core rule

Automated Journey MUST use the same Test Lab candidate/state-selection contracts as manual mode:

`Generate candidates -> choose exactly one candidate -> commit only that candidate to sandbox state -> next phase`

No candidate states may merge.

## Execution modes

- `manual`: human explicitly selects the candidate that advances sandbox state.
- `automated`: a recorded selection strategy selects the candidate for each phase.

Both modes produce the same immutable run, state, provenance and branch records.

## Selection strategies

### random
Select one valid candidate using a persisted deterministic RNG seed. Store the seed and chosen candidate index/result id so a run is auditable and replayable where provider nondeterminism permits.

### first_valid
Select the first candidate that passes schema/domain validation. Ordering must be explicit and persisted.

### judge_best
Evaluate valid candidates through the configured Evaluation Engine and select the highest-ranked candidate for continuation. Judge identity, rubric revision, scores and ranking provenance must be persisted.

`judge_best` is allowed to select the next **sandbox** state during an explicitly configured Automated Journey, but it may never promote content or prompts to production.

## Configuration

An Automated Journey definition may include:

- scenario
- selected phase range/list
- generator model profile
- candidate count per phase
- selection strategy
- optional evaluator/judge configuration
- story count
- story length preset/custom bounds where supported
- starting sandbox state/profile fixture/reference
- deterministic selection seed
- stop conditions and budget limits

## Budget controls

Because Automated Journey can generate many paid calls, it must support explicit guardrails:

- maximum total estimated/actual cost
- maximum LLM calls
- maximum retries per phase
- optional stop-on-evaluation-floor
- stop on validation/state consistency failure according to scenario policy

The runner must not silently exceed a configured hard budget.

## Results

A completed journey should expose:

- phase completion/failure map
- selected candidate per phase and reason/strategy
- all alternative candidate results
- final sandbox state
- state diff timeline
- total and phase-level tokens/cost/latency/retries
- schema/domain failures
- evaluator scores where enabled
- long-horizon continuity/state-consistency findings

## Cross-model benchmark

The same Journey Definition may be run independently for multiple generator models. Each model receives its own isolated Test Session/Branch. Results can later be compared for:

- completion rate
- quality/rubric scores
- continuity and state consistency
- total cost
- latency
- retry/error rate
- quality-per-cost/value metrics

Generator model identities should remain hidden from blind judges.

## Safety and governance

- Automated Journey is sandbox-only by default.
- It cannot auto-promote generated state/content to production.
- It cannot activate a prompt revision.
- Promotion always remains a separate explicit reviewed action.
- Every automatic selection must record `selectionActor=automation`, strategy and provenance.

## Dependency

Automated Journey must be built on the manual Test Lab foundation rather than introducing a second execution/state model. It therefore depends on the core contracts/state-selection layer and becomes most valuable after stateful story and Evaluation Engine support exist.
