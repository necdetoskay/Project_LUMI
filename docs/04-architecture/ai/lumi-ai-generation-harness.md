# LUMI AI Generation Harness

## Status

Canonical architecture decision.

## Purpose

LUMI must not behave like a direct "prompt in, story out" wrapper. The AI
layer is a controlled generation harness: it lets LLMs contribute creativity,
language, tone and variation, while domain code owns persistent state,
validation, safety, scoring and release decisions.

Core principle:

> Enum and schema provide consistency. Seed and vectors provide uniqueness.
> LLMs express creative candidates. The domain engine validates, scores and
> commits only accepted outputs.

## Harness Flow

```text
Child Profile
Parent Policy
World State
Universe Seed
  -> Seeded Vector Bootstrap
  -> Context Builder
  -> Prompt Composer
  -> Model Router
  -> LLM Candidate Generation
  -> Schema Validation
  -> Safety and Age Check
  -> Coherence Check
  -> Novelty and Motif Repetition Check
  -> Quality Evaluation
  -> Accept, Repair, Regenerate or Escalate
```

The harness is allowed to reject, repair or regenerate generated content before
the child sees it. It is not allowed to let an LLM directly mutate canonical
world state, child safety policy, schema definitions or production prompts.

## Responsibilities

| Layer | Responsibility |
|---|---|
| Seeded vector bootstrap | Creates reproducible variation and origin/world vectors |
| Context builder | Selects only relevant child, world, NPC, memory and policy context |
| Prompt composer | Builds task-specific prompts from registered templates |
| Model router | Selects model by task, cost, latency, quality and provider health |
| LLM generator | Produces candidate origin, story, scene, dialogue or Q&A content |
| Output validator | Enforces JSON schema, required fields and structural constraints |
| Safety checker | Enforces parent policy, child age fit and content boundaries |
| Coherence checker | Verifies canon, world state, character type and continuity rules |
| Novelty checker | Penalizes repeated motifs, generic patterns and forced ideas |
| Quality evaluator | Scores originality, richness, emotional warmth and story potential |
| Audit store | Records prompt version, model, seed, scores, repairs and final outcome |

## Strong Reviewer Model

LUMI may use a stronger upper-layer model as a reviewer. This reviewer is not
the main author by default. Its job is to evaluate output quality, diagnose weak
generation patterns and propose controlled improvements.

Example reviewer tasks:

- Review generated origins, scenes and choice options.
- Explain why a candidate failed the quality threshold.
- Suggest a better creative brief for retry.
- Suggest prompt registry changes.
- Suggest model routing changes.
- Suggest motif penalty list updates.
- Produce weekly generation quality reports.

The reviewer model must be different from the generating model when possible.
This reduces self-confirming evaluations.

## Controlled Self-Improvement Boundary

The harness can improve generation behavior, but only inside strict boundaries.

| Action | Automatic? | Notes |
|---|---:|---|
| Reject unsafe or invalid output | Yes | Never shown to the child |
| Retry with same prompt | Yes | Limited by retry budget |
| Repair malformed JSON | Yes | Must pass schema after repair |
| Retry with stronger creative brief | Yes | Brief must stay inside policy and schema |
| Fallback to another model | Yes | Must be recorded in audit store |
| Generate quality diagnosis | Yes | Used for reporting and review |
| Generate prompt improvement proposal | Yes | Proposal only, not production change |
| Update production prompt | No | Requires human approval |
| Update safety policy | No | Requires human approval and release review |
| Update schema or world state rules | No | Requires engineering change |
| Change model default globally | No | Requires eval evidence and approval |

This keeps LUMI adaptive without allowing a model to silently rewrite the rules
that protect quality, continuity and child safety.

## Quality Gate

Every candidate intended for user-facing story flow must pass minimum gates:

| Metric | Minimum |
|---|---:|
| Safety | 5 / 5 |
| Schema validity | pass |
| Canon coherence | 4 / 5 |
| Originality | 4 / 5 |
| Richness | 4 / 5 |
| Emotional warmth | 4 / 5 |
| Story potential | 4 / 5 |
| Generic motif risk | below threshold |

Failure handling:

1. If safety fails, reject immediately.
2. If schema fails, attempt structured repair once.
3. If coherence fails, regenerate with stricter context.
4. If originality or richness fails, regenerate with novelty constraints.
5. If repeated attempts fail, escalate to reviewer model.
6. If reviewer still fails threshold, use safe template fallback or ask parent.

## Prompt Revision Workflow

Prompt updates follow a proposal-and-approval workflow.

```text
Eval Results
  -> Failure Cluster Analysis
  -> Reviewer Model Diagnosis
  -> Prompt Revision Proposal
  -> Human Review
  -> Versioned Prompt Registry Update
  -> Regression Eval
  -> Release Approval
```

Prompt versions must be immutable once released. New prompt versions must record:

- prompt id
- previous version
- change reason
- linked eval report
- expected improvement
- safety impact assessment
- approval owner

## Example Types

```ts
type GenerationHarnessInput = {
  childProfileId: string;
  parentPolicyId: string;
  worldId: string;
  universeSeed: string;
  task: "origin_candidate" | "story_scene" | "choice_options" | "reflection_qa";
  promptVersion: string;
};

type GenerationHarnessResult<T> = {
  status: "accepted" | "repaired" | "regenerated" | "rejected" | "escalated";
  output?: T;
  model: string;
  reviewerModel?: string;
  seed: string;
  scores: QualityScores;
  attempts: GenerationAttempt[];
  auditId: string;
};

type QualityScores = {
  safety: number;
  schemaValid: boolean;
  coherence: number;
  originality: number;
  richness: number;
  emotionalWarmth: number;
  storyPotential: number;
  genericMotifRisk: number;
};
```

## Example Harness Policy

```ts
const harnessPolicy = {
  maxAttempts: 3,
  repairMalformedJson: true,
  allowModelFallback: true,
  allowReviewerEscalation: true,
  allowAutomaticPromptMutation: false,
  allowAutomaticSafetyPolicyMutation: false,
  requireAuditRecord: true,
};
```

## Example Routing

```ts
const modelRoutes = {
  originDraft: "deepseek/deepseek-v4-flash",
  originFinal: "deepseek/deepseek-v4-pro",
  schemaCritical: "openai/gpt-4.1-mini",
  storyToneReview: "anthropic/claude-haiku-4.5",
  premiumReviewer: "anthropic/claude-sonnet-4.6",
};
```

Model names are configuration defaults, not permanent architecture decisions.
They must be validated with current OpenRouter pricing, availability and eval
results before production use.

## Audit Requirements

Each generation run must record:

- child-safe task type, not private child details
- world id and relevant entity ids
- seed and vector manifest reference
- prompt id and version
- model and provider route
- raw candidate storage policy
- validation result
- safety result
- quality scores
- retry and repair history
- accepted output hash
- cost and latency

Raw model output may contain rejected content. It must follow privacy,
retention and parent-safety storage rules.

## Release Rule

A model, prompt or generation strategy cannot become a production default unless
it passes:

- seed batch eval
- schema validation eval
- safety regression eval
- novelty/motif repetition eval
- story continuation eval
- human review sample

This makes the harness the quality gate for LUMI's creative soul: the system is
allowed to become better over time, but not by silently changing its own rules.
