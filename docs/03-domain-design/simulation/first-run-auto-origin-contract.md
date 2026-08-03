# First-Run Auto Origin Generation — Contract

**Version:** 1.0.0
**Status:** Sprint 12 deliverable (S12-T06)
**Owner:** AI Architecture

## Purpose

The provider-neutral generation contract for Auto origin proposal cards. Given a
selected character type and child safety context, the pipeline generates 3-5
coherent, surprising and age-appropriate Origin Packages.

## Flow

1. `childProfile` + `parentPolicy` (content boundary, age band) are loaded.
2. Seeded vector bootstrap produces reproducible vectors from `universeSeed`.
3. A creative brief is built from dominant vectors and safety bounds.
4. The LLM receives the brief and proposes candidate origin packages only.
5. Domain code validates schema, safety, canon and continuity.
6. Accepted candidates are scored and surfaced as proposal cards.

The LLM never writes canonical world state. It proposes; domain code commits.

## Inputs

| Field | Type | Notes |
| --- | --- | --- |
| `characterKind` | enum | human, animal, fantasy, robot, sea_creature, sky_creature |
| `characterType` | string | optional selected archetype |
| `childAgeBand` | enum | 3-5, 6-8, 9-12, 13+ |
| `universeSeed` | string | deterministic base seed |
| `originSeed` | string | per-origin variation seed |
| `candidateCount` | int 3-5 | number of proposals requested |
| `safetyBounds` | string[] | age band + content boundary + approval flag |
| `previousBatchConcepts` | string[] | optional, to avoid repeat concepts on refresh |

## Outputs

`OriginBatchProposal` — up to 5 `OriginPackageProposal` records, each with:

- `characterKind`, `subtype`, `originConcept`
- `startingRegionArchetype`, `startingLocation`, `homeArchetype`
- `nearbyNpcSeed`, `firstMysterySeed`
- `toneVector`, `noveltyMarkers`
- `universeSeed`, `candidateSeed`, `score`

## Refresh Semantics

Refresh requests must produce materially different candidates while preserving
the selected type and safety constraints.

- Each candidate carries a deterministic `candidateSeed` derived from the base
  seed and index (`<universeSeed>:candidate:<n>`).
- A refresh may derive a new `universeSeed` variant so vectors and prompts shift
  while staying deterministic for a given refresh.
- `previousBatchConcepts` is passed so the pipeline can reject or penalize
  concepts similar to the last batch.

## Seeded Vector Bootstrap

Vectors are derived per `seeded-vector-bootstrap.md`:

- `universeSeed` -> base vectors per character kind.
- `originSeed` -> per-origin variation.
- `candidateSeed` -> refresh-specific variation.

Age band caps tone, mystery and risk vectors so output stays age-appropriate.

## Safety Bounds

- Content boundary: strict | moderate | open (from parent policy).
- `requireParentApprovalForAi`: when true, parents must approve before a card
  is saved.
- Safety is a hard gate: unsafe proposals are rejected before the child sees
  them and before any save.

## Integration Points

- `packages/ai` provides the generation contract (S12-T01..T04).
- `packages/profiles` currently owns the OpenRouter call
  (`origin-generator.ts`); Sprint 12 keeps that path intact and adds the
  provider-neutral contract that can replace it without breaking the UI.
- The orchestrator (`packages/ai/application/orchestrator.ts`) is the entry
  point for a request through the Intent -> Context -> Plan -> Generate ->
  Validate -> approved flow.

## Out of Scope

- Canonical world or character mutation.
- Media generation.
- NPC background autonomy.
- Story Outcome Commit System.
- Provider SDK leakage into domain/application code.
