# Creative Genesis Divergence Pipeline

Status: Phase 3 contract for #243 / parent epic #240.

## Purpose

Character Genesis is foundation-critical. LUMI must not accept the first plausible model answer. Phase 3 therefore treats creativity as a search-and-evaluate pipeline: create several structurally different possibilities, deliberately separate near-duplicates, measure diversity, evaluate long-horizon narrative yield, and only then select a small finalist set.

This phase does **not** materialize final Genesis, Saga Canon, NPCs, world events, inventory, or bootstrap state in the database.

## Pipeline

```text
accepted onboarding facts + child/world context
  -> concept expansion (8-12 candidates, Tier S)
  -> divergence pass (Tier S)
  -> deterministic duplicate/diversity analysis
  -> long-horizon evaluator (Tier S, read-only)
  -> contradiction/coherence/suitability gates
  -> top-k ranking
  -> bounded synthesis when first-pass finalists are weak
  -> final Phase-3 candidate set
```

The generator and evaluator are routed independently through the Phase 2 impact-aware model policy. Their provider/model ids remain configuration data rather than Genesis-service constants.

## Candidate schema

Each candidate carries a premise, current situation, long-term desire, fundamental need, central mystery, archetype labels, relationship seeds, supported story modes, and explicit trope signals. Candidate ids are unique and the schema is validated deterministically before scoring.

## Diversity

Phase 3 calculates pairwise structural similarity over premise, current situation, central mystery, archetype and trope signals. Similar candidates above the duplicate threshold are marked as structural duplicates. Divergence fails closed when too much of the candidate set still collapses onto the same concept.

This metric is intentionally lexical/structural and deterministic. The Tier-S evaluator remains responsible for semantic novelty, cliché risk and coherence. The two checks complement rather than replace one another.

## Evaluation dimensions

The evaluator scores 0-100 for:

- originality
- internal coherence
- child suitability
- world compatibility
- emotional depth
- mystery potential
- relationship potential
- growth potential
- reveal potential
- adventure diversity
- long-horizon potential
- Narrative Yield

Cliché risk is recorded separately as a penalty. Weirdness by itself does not increase originality.

Evaluator rationales and contradiction lists are observability data and are not child-facing presentation copy.

## Long-horizon proxy

The evaluator does not generate 100 stories. Every candidate must supply exactly five examples in each axis:

- early adventures
- medium-term arcs
- meaningful reveals
- relationship developments
- world consequences

It also scores exhaustion risk and expansion space. This makes repetitive or single-gimmick premises fail before they become canon.

## Eligibility gates

A candidate is not eligible when any of these conditions are true:

- evaluator reports contradiction against accepted onboarding facts
- child suitability is below the gate
- world compatibility is below the gate
- internal coherence is below the gate
- expansion space is insufficient
- deterministic diversity analysis identifies a structural duplicate
- an explicit machine-readable `must_not_include:<token>` world constraint is violated

The final weighted score combines evaluation quality, cliché penalty, expansion space and exhaustion risk. A low-scoring first pass may trigger one bounded synthesis attempt from the strongest two eligible parents. Synthesis is re-evaluated normally; it receives no automatic preference.

## Model and mutation policy

- concept expansion uses `character_genesis` / Tier S
- divergence and synthesis use `genesis_divergence` / Tier S
- evaluation uses `genesis_evaluation` / Tier S
- evaluator remains read-only and cannot mutate Genesis Canon
- every route contributes provider/model/intent/tier provenance to the pipeline result

Phase 3 only returns structured candidates. Canon commit remains a later phase.

## Golden coverage

Tests cover structurally different starting contexts for:

- human
- magical creature
- robot/artificial being
- aquatic/non-human character

The golden tests verify schema shape, diversity, long-horizon proxy structure, contradiction rejection, independent evaluator provenance and bounded synthesis behavior.
