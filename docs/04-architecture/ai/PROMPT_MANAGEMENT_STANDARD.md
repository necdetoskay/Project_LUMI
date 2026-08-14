# LUMI Prompt Management Standard

Status: Canonical architecture rule
Scope: Entire Project LUMI application
Related: #199, #197

## Decision

All production AI/LLM prompt behavior in LUMI MUST be managed through the shared Prompt Registry / Prompt Runtime architecture.

Feature modules MUST NOT treat production prompts as private hardcoded implementation strings. This rule applies application-wide, not only to Character Onboarding.

## Applies To

Including but not limited to:

- Character Onboarding
- world/universe generation
- character and NPC generation
- Story Generation
- Decision Engine / NPC reasoning
- World Events
- summaries and transformations
- recommendation/suggestion tasks
- image-generation prompt construction where LLM prompt composition is used
- future agents and AI-assisted workflows

## Stable Prompt Identity

Every AI task MUST have a stable semantic `prompt_key` independent from model/provider and prompt wording.

Examples:

- `character_onboarding.world_character_suggestions`
- `story.scene_generation`
- `npc.decision_reasoning`
- `world.event_generation`

Callers depend on the key/contract, not the literal prompt.

## Versioning

Production prompts are immutable versions.

- Editing an active prompt creates a new version.
- A version can be `draft`, `active`, or `archived`.
- Activation is explicit.
- Rollback activates a previous valid version; history is not deleted.
- Runtime must be able to identify the exact version used for every generation.

## Prompt Contract

A registry entry should define as applicable:

- prompt key and version
- system/user templates
- allowed template variables
- required variables
- output schema and schema version
- default generation configuration
- optional model/provider override
- safety/contract metadata

Unknown template variables and missing required variables MUST fail before the provider call.

## Runtime Flow

`Feature -> Prompt Runtime -> Active Prompt Version -> Safe Context Renderer -> LLM Gateway -> Output Validation -> Feature Result`

Features MUST NOT bypass this path for production generation unless an ADR explicitly documents the exception.

## Structured Outputs

Where a feature consumes machine-readable LLM output, an explicit schema MUST be bound to the prompt contract. Invalid output must not silently become application/domain state.

Retries/repair may occur through the AI runtime, but the accepted result must satisfy the contract.

## Generation Trace

Every production generation SHOULD record enough provenance for quality, debugging and cost analysis:

- prompt key
- exact prompt version
- task/feature key
- provider/model
- generation configuration
- safe input/context snapshot or reproducible context reference
- output/result reference
- validation result
- token usage when available
- estimated/actual cost when available
- latency
- timestamp
- correlation/domain references such as creation cycle, story, character or event

Secrets and credentials MUST never be stored in prompt content or traces.

## Safety Boundary

Editable prompts are product configuration, not the final safety boundary.

Child-safety rules, authorization, privacy, schema enforcement, domain invariants and other non-negotiable system constraints MUST be enforced outside editable prompt text. An administrator editing a prompt must not be able to disable those invariants accidentally.

## Administration

Prompt management is an administrative/developer capability and MUST NOT be exposed in child-facing UI.

The management experience should support:

- list/search by feature and prompt key
- inspect active version
- create/edit draft
- version history
- activate and rollback
- allowed-variable documentation
- output schema inspection
- model/config inspection where allowed
- audit history

## Prompt Playground

Before activation, prompt versions SHOULD be testable against fixtures and, where privacy rules allow, selected real application contexts.

The platform should support active-vs-draft comparison including:

- outputs
- validation
- latency
- token usage
- estimated cost
- human quality evaluation

## Feature Development Rule

When implementing a new AI-powered feature:

1. Define a stable prompt key and input/output contract.
2. Register a bootstrap/default prompt version.
3. Use Prompt Runtime to resolve the active version.
4. Render only declared context variables.
5. Validate structured output before domain persistence.
6. Record generation provenance.
7. Add focused contract/runtime tests.
8. Never introduce a new hardcoded production prompt as a shortcut.

## Bootstrap and Failure Behavior

Default prompts may live in migrations/seeds/bootstrap definitions for installation and reproducibility, but runtime source code must not use those strings as an alternate hidden production path.

If no valid active prompt exists, the feature must fail safely and observably rather than silently falling back to an unversioned prompt.

## Governance

Changes to this standard are architecture-level changes. Exceptions require an ADR describing scope, reason, risk and migration/removal plan.

Issue #199 tracks the initial shared Prompt Registry, management UI and playground implementation. Character Onboarding is the first consumer, not a special-case architecture.