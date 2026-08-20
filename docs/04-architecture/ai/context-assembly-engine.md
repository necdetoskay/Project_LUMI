# Context Assembly Engine

Status: **Canonical**  
Tracker: **#203**

## Purpose

Context Assembly is LUMI's single provider-bound context policy layer. It does
not own Character, World, Story, NPC or Memory truth. Domain-owned sources
project only the relevant, visibility-safe fragments required for the current
generation task.

The core invariant is:

```text
canonical domain state
  -> context sources / retrieval adapters
  -> visibility-safe projections
  -> priority + budget policy
  -> deterministic compaction / dropping
  -> assembled context + provenance + fingerprint
  -> generation trace / Context Inspector
  -> model provider
```

A consumer must not bypass this path by dumping raw database rows, complete
history or ad-hoc JSON into a prompt.

## Ownership boundaries

- `@lumi/profiles` owns the generation-context source registry, source
  provenance, profile policies, compaction, deterministic fingerprint and
  content-addressed snapshot/replay contracts used by #203.
- `@lumi/context` provides the story-generation composition surface and bounded
  retrieval adapters used by the story engine.
- Domain packages remain authoritative for Character, World, Story, NPC,
  Inventory and Memory state.
- Context Inspector is read-only. It may display safe evidence but must never
  become a second state engine.

## Source contract

A generation-context source has one section owner, a stable source name/version,
authority (`canonical`, `derived`, or `retrieved`), a reason, and a resolve
operation. Sources may additionally expose immutable replay references and
operational telemetry.

Required-source failure is fail-closed. Optional-source failure is deterministic
and may drop that section. Duplicate section ownership is invalid.

Internal source IDs are audit-only and must not be copied into provider-visible
context or safe Inspector projections.

## Visibility and privacy

Provider-visible context follows these rules:

1. pass only the smallest projection needed for the current task;
2. preserve world truth, character belief, player knowledge and narrative
   instruction boundaries;
3. never infer hidden knowledge into character-visible context;
4. do not expose household IDs, child profile IDs, creation-cycle IDs or
   internal NPC/storage identifiers merely because they exist in canonical
   records;
5. Inspector surfaces show safe provenance/fingerprints/metrics, not raw child
   context, system prompts, provider secrets or unrestricted snapshots.

## Token budgets and compaction

Token budgets are profile-owned. Required sections are admitted first and must
fit both their section budget and the total provider budget. Optional sections
are ranked deterministically and may be compacted or dropped.

Current story-generation context is capped at **5,200 tokens**. Story policy
reserves bounded slices for safety, parent policy, working story, emotional
state, relevant memory, relevant NPC, world state and origin/saga projections.
Changing the total budget is an architecture decision, not a caller option.

Compaction must be deterministic and preserve evidence including strategy,
original token estimate, compacted token estimate and removed-item count.
Compaction does not grant permission to summarize away safety or required
canonical truth.

## Retrieval semantics

Retrieval is bounded and source-specific. The retrieval contract currently
supports memory, NPC, world-state and world-event candidates. Each candidate
has a stable ID, relevance score and provenance.

Retrieval adapters must:

- use scoped household/profile/world/session reads;
- normalize relevance to `[0,1]`;
- deduplicate by stable identity;
- use deterministic ordering for equal scores;
- enforce an upper result limit;
- return concise provider-safe summaries rather than full history dumps;
- keep retrieval provenance inspectable.

A low relevance score is an observability concern, not permission to fabricate
context.

## Cache semantics

Context sources may report cache telemetry (`hit`, `miss`, `bypass`, or
`unknown`) without changing semantic provenance. Cache state is operational
metadata and must **not** affect the deterministic context fingerprint.

A cache implementation must invalidate when the source revision or
content-addressed snapshot identity changes. Missing cache telemetry is reported
as unknown rather than guessed.

## Failure and retry behavior

- Missing/failed required sources: fail the assembly; do not call the provider
  with an incomplete required context.
- Missing/failed optional sources: drop deterministically and record evidence.
- Required section over budget after allowed compaction: fail safely.
- Optional section over budget: drop deterministically.
- Provider timeout/retry: reuse the same persisted/assembled context evidence
  when replay semantics require the same attempt input; do not silently rebuild
  from newer mutable state and call it the same attempt.
- Snapshot replay: reconstruct only from persisted replay evidence. Never infer
  an exact historical context from current state.

## Fingerprint and replay

The context fingerprint is a deterministic SHA-256 over provider-visible values
plus semantic provenance. Operational telemetry such as latency or cache outcome
must not change it.

Reconstructability is explicit:

- `exact`: every section has immutable replay evidence and no unversioned
  historical transform is required;
- `partial`: some source/revision evidence exists but exact reconstruction is
  not justified;
- `non_reconstructable`: trace lacks sufficient context evidence.

Content-addressed snapshot references are privacy-safe locators. Raw source IDs
or child records are not replay locators.

## Observability

Context Assembly reuses generation traces and Context Inspector; it does not
create a parallel telemetry subsystem.

Safe metrics are:

- context assembly latency;
- context budget utilization;
- token usage by generation/use-case;
- context-to-output token ratio;
- retrieval relevance when a retrieval source reports it;
- cache hit rate when sources report cache status;
- dropped/compacted section counts;
- required-context failures through fail-fast error codes.

Operational defaults for warning-only classification:

| Signal | Warning default | Meaning |
| --- | ---: | --- |
| Context budget utilization | `>= 0.85` | prompt is approaching its context ceiling |
| Retrieval relevance | `< 0.35` | retrieved evidence may be weak for the task |
| Assembly latency | `>= 250 ms` | context building deserves latency investigation |

These are observability thresholds, **not** safety/canonical validation rules.
They may be calibrated with production/Test Lab evidence without changing
provider-visible context semantics.

A metric with no evidence is `unknown/null`; LUMI must not fabricate cache,
relevance or latency data.

## Context Inspector

The admin-only Context Inspector exposes safe generation evidence:

- generation task/model/version/status;
- context profile and budget utilization;
- provider token usage and context/output ratio;
- context fingerprint and reconstructability;
- section source/version/authority/reason;
- compaction evidence;
- dropped sections;
- safe observability metrics and warning states;
- snapshot replay only through the schema-bounded replay reader.

Inspector pages are diagnostic surfaces. They cannot mutate canonical context,
promote Test Lab state or change source ownership.

## Consumer example

```text
Story generation
  -> Context Assembly profile: story_generation
  -> required safety + parent constraints
  -> current working story / character state
  -> bounded relevant memory/NPC/world retrieval
  -> optional origin/saga fragments
  -> budget + compaction gate
  -> fingerprint + trace evidence
  -> provider call
```

Character Genesis first-story handoff uses the same production context path with
committed Genesis projections; it does not introduce a second context engine.

## Stabilization matrix

The following behaviors require regression coverage before #203 can close:

| Case | Expected behavior |
| --- | --- |
| Oversized required context | deterministic fail-safe |
| Oversized optional context | deterministic compaction/drop |
| Missing required source | fail before provider call |
| Missing optional memory | continue with recorded drop |
| NPC/candidate storm | bounded deterministic retrieval/dedupe |
| Retrieval contradiction | canonical authority wins; contradiction is surfaced |
| Privacy/visibility leak attempt | internal/hidden data excluded |
| Same input/provenance | stable fingerprint |
| Cache revision change | stale entry not treated as a valid hit |
| Exact replay | only from persisted immutable evidence |
| Provider retry | context identity/evidence remains auditable |

## Non-goals

- Context Assembly is not a vector database.
- It does not replace canonical domain repositories.
- It does not make all context globally cacheable.
- It does not expose raw historical snapshots to admin UI.
- It does not allow callers to expand token ceilings arbitrarily.
- It does not infer missing required facts to make a generation succeed.
