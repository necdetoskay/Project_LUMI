# Context Management Architecture

Status: Canonical architecture rule  
Scope: Project LUMI production AI generation  
Related: #203, #328, #333, `PROMPT_MANAGEMENT_STANDARD.md`

## Decision

Project LUMI separates **prompt ownership** from **generation-context ownership**.

- The **Prompt Registry / Prompt Runtime** owns stable prompt identity, prompt versions, templates, declared variables, output contracts, model/config selection and activation/rollback.
- The **Context Assembly Engine** owns which application/domain facts may enter a generation, where they came from, whether they are required, how much context budget they may consume, deterministic compaction/drop behavior, and privacy-safe provenance.
- Feature/domain adapters own the authoritative domain projections supplied to Context Assembly. Context Assembly must not duplicate Character, World, Story or Memory domain schemas.

A production feature must not solve missing context by embedding private domain reads or unversioned context rules inside editable prompt text.

## Runtime boundary

The intended production flow is:

`Feature/domain adapter -> GenerationContext -> GenerationContextPolicy + GenerationContextSource -> assembleGenerationContext -> toPromptGenerationContext -> Prompt Runtime -> LLM Gateway -> validation -> trace`

The Prompt Registry decides **how the model is instructed**. Context Assembly decides **what trusted application context is allowed into that instruction**.

## Core contracts

### `GenerationContext`

`packages/profiles/src/application/generation-context.service.ts`

`GenerationContext` is the feature-facing input envelope. It contains:

- a context profile (`character_onboarding`, `world_generation`, `story_generation`),
- child projection needed for age/locale/personalization,
- current creation-cycle projection,
- optional canonical domain projections (`characterState`, `worldState`, `relevantMemories`).

The canonical values are intentionally opaque at this layer. Domain-owned adapters decide their schema and authority before they are passed to Context Assembly.

### `GenerationContextPolicy`

`packages/profiles/src/application/generation-context-policy.ts`

A policy defines, per generation profile:

- maximum total context tokens,
- allowed sections,
- section priority (`required`, `high`, `medium`, `low`),
- per-section token budget.

Current profiles are validated at module load. Duplicate sections, non-positive budgets and section allocations larger than the profile budget fail configuration validation.

### `GenerationContextSource`

`packages/profiles/src/application/generation-context-source.ts`

Each allowed section is resolved through a registered source with:

- stable section and source name,
- source version,
- authority (`canonical`, `derived`, `retrieved`),
- reason,
- optional internal source/revision metadata,
- optional immutable replay reference.

Internal `sourceId` and raw source revision values are assembler-internal evidence. They are not provider-visible context and are not emitted by the Context Inspector.

### `AssembledGenerationContext`

`packages/profiles/src/application/generation-context-assembler.ts`

The assembled package contains:

- profile and total context budget,
- estimated provider-bound context tokens,
- deterministic package fingerprint,
- included sections in deterministic order,
- dropped optional sections,
- section-level provenance.

`toPromptGenerationContext()` is the final provider-bound projection. It returns section values only; provenance and internal identifiers are not inserted into the model payload.

## Required and optional semantics

Required context is fail-closed.

A required section causes generation-context assembly to fail when:

- no source is registered,
- source resolution throws,
- the required value is missing,
- the section remains over its budget after an allowed compaction attempt,
- required sections cannot fit the total context budget,
- the final provider-bound context cannot fit the total budget.

Optional/high/medium/low sections may be omitted or dropped when missing, failing to resolve or unable to fit a section/total budget.

This behavior is deliberate: LUMI must not silently generate a story or world from incomplete required state and then treat that output as canonical.

## Token-budget enforcement

The current estimator is deterministic and payload-based: serialized JSON length is approximated at four characters per token, with a minimum of one token. It is not claimed to be a provider tokenizer.

The important invariant is that the **actual provider-bound projection produced by the assembler is measured and checked**, rather than only decrementing bookkeeping counters. The package is checked at section level, total-budget selection and again in `toPromptGenerationContext()`.

Provider-reported prompt/completion usage, when available after generation, is stored separately in the generation trace and is not used to rewrite historical assembly decisions.

## Deterministic compaction and fallback

`packages/profiles/src/application/generation-context-compaction.ts`

The current deterministic compactor (`dedupe-and-tail-prune-v1`) is registered for:

- `world_state`,
- `recent_story_state`,
- `relevant_memories`.

For arrays it preserves first occurrence order, removes duplicates and tail-prunes until the section fits. For objects it deterministically deduplicates list fields and prunes from stable candidates.

If a compactor throws, returns no usable value, or still exceeds the section budget:

- required sections fail,
- optional sections are dropped.

Compaction evidence records strategy, original/compacted token estimates and removed item count. The same input and policy must produce the same budget decision.

## Retrieval boundary and authority

Context Assembly does **not** own a retrieval engine.

A domain adapter may retrieve/rank Memory, NPC, Story or other facts and pass a bounded canonical projection into `GenerationContext`. The corresponding `GenerationContextSource` marks the authority as `retrieved` where appropriate. Today `relevant_memories` is the built-in retrieved-authority section and consumes the domain-supplied `canonical.relevantMemories` projection.

Therefore:

- retrieval ranking/search implementation stays outside Context Assembly,
- Context Assembly still owns inclusion, token budget, deterministic compaction and provider projection,
- raw retrieval candidate IDs/text must not be added to Inspector provenance merely to create metrics.

The Context Inspector's `retrievalEvidenceCoverageRatio` means **privacy-safe provenance coverage for included sections whose authority is `retrieved`**. A retrieval section counts as evidenced when stable source, source version and reason are present. It is `null` when the trace contains no included retrieved-authority section. It is **not** retrieval recall, precision, hit-rate or candidate coverage.

## Fingerprint and provenance

The assembled package fingerprint is SHA-256 over a canonicalized representation of profile, total budget, included section values and assembler provenance. Object keys are sorted before hashing so equivalent inputs produce a stable fingerprint.

The fingerprint is an integrity/identity signal; it is not a substitute for replay evidence.

For persisted Context Inspector provenance:

- raw section values are omitted,
- internal `sourceId` is omitted,
- raw revision strings are replaced by a SHA-256 revision fingerprint when present,
- immutable replay is represented only by the privacy-safe content-addressed replay locator,
- compaction metadata may be retained,
- child/household/creation-cycle identifiers are not projected into the Inspector view.

Provider-visible context also excludes internal child and creation-cycle IDs through the source projections and final `toPromptGenerationContext()` boundary.

## Generation trace and Context Inspector

`packages/profiles/src/application/ai-generation-trace.service.ts`

A generation trace records prompt/model/usage/cost/latency metadata plus optional Context Assembly evidence. The Context Inspector exposes a deliberately reduced privacy-safe view rather than raw input/output payloads.

Current trustworthy derived context observability is:

- `budgetUtilizationRatio`: estimated assembled context / configured context budget,
- `contextToOutputTokenRatio`: estimated assembled context / provider completion tokens when completion usage is positive,
- `includedSectionCount`: number of persisted included sections,
- `droppedSectionCount`: number of persisted dropped section names,
- `compactedSectionCount`: included sections with persisted compaction evidence,
- `retrievalEvidenceCoverageRatio`: provenance completeness for included retrieved-authority sections as defined above.

Ratios become `null` when their denominator/evidence is unavailable instead of inventing a value. The additional fields are derived at read time, so older safe traces remain readable and no schema migration is required.

## Latency boundary

The trace field `latencyMs` currently represents the LLM gateway/model-call latency supplied by `TextLlmGatewayResult`. It does **not** measure Context Assembly latency.

There is currently no trustworthy persisted start/end boundary around Context Assembly itself. Consequently **context assembly latency is unavailable**. The Inspector must not relabel gateway latency as assembly latency. Adding a real assembly timing boundary may be considered later only through an approved safe observability mechanism.

## Missing-required-context telemetry boundary

Missing required context is already explicit and test-covered through fail-fast assembler errors such as:

- `GENERATION_CONTEXT_SOURCE_UNREGISTERED`,
- `GENERATION_CONTEXT_SOURCE_FAILED`,
- `GENERATION_CONTEXT_REQUIRED_SOURCE_MISSING`,
- `GENERATION_CONTEXT_REQUIRED_SECTION_BUDGET_EXCEEDED`,
- `GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED`,
- `GENERATION_CONTEXT_FINAL_BUDGET_EXCEEDED`.

These failures occur before a successful provider generation and before the normal generation trace is persisted. LUMI currently has no separate safe event/metrics platform at this boundary. Therefore **missing-required-context failure telemetry is intentionally unavailable/deferred** rather than creating a new metrics system inside #203/#328 or persisting raw failure context.

The typed/error-code behavior and focused regression tests are the current observability contract for this failure path.

## Reconstructability contract

Reconstructability is intentionally conservative:

- `exact`: every persisted section has a valid immutable content-addressed replay reference and no historical compaction transform is required.
- `partial`: some replay evidence exists, a historical compaction transform would be required, or revision evidence allows verification but not replay.
- `non_reconstructable`: context audit evidence itself is missing.

A source revision fingerprint proves/verifies an observed revision identity; it does **not** reload historical source content. Revision fingerprints must never be promoted to fake `exact` reconstruction.

## Privacy invariants

The following are architecture-level invariants:

1. Raw child/private context must not be added to Context Inspector output for debugging convenience.
2. Internal child, household, creation-cycle, source or retrieval-item IDs must not be exposed in provider-visible provenance or Inspector projections.
3. Editable prompt content is not a privacy boundary; source projection and runtime authorization enforce privacy outside prompt text.
4. Retrieval observability must use aggregate/privacy-safe provenance, not candidate text or identifiers.
5. Trace-derived metrics must return unavailable/null when evidence is absent rather than infer private/raw state.

Changes that weaken these rules require an explicit architecture review/ADR.

## Current non-goals

Context Management v1 does not add:

- a new event/metrics platform,
- raw context logging,
- a new retrieval engine,
- automatic exact historical replay from revision fingerprints,
- a ContextSource redesign,
- Test Lab-specific context semantics.

Those concerns must remain separate so Context Assembly stays a deterministic, testable boundary rather than becoming another all-purpose agent framework.
