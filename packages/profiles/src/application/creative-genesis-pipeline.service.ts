import { ValidationError } from "../domain";
import {
  assertGenerationIntentMayMutate,
  buildGenerationTraceRoutingMetadata,
  resolveGenerationRoute,
  type ImpactAwareGenerationIntent,
  type ResolvedGenerationRoute,
} from "./llm-settings";

export const CREATIVE_GENESIS_PIPELINE_VERSION = 1 as const;
export const GENESIS_EVALUATION_DIMENSIONS = [
  "originality",
  "internalCoherence",
  "childSuitability",
  "worldCompatibility",
  "emotionalDepth",
  "mysteryPotential",
  "relationshipPotential",
  "growthPotential",
  "revealPotential",
  "adventureDiversity",
  "longHorizonPotential",
  "narrativeYield",
] as const;

export type GenesisEvaluationDimension =
  (typeof GENESIS_EVALUATION_DIMENSIONS)[number];

export interface GenesisPipelineContext {
  userId: string;
  householdId: string;
  childProfileId: string;
  childAge: number;
  characterKind: string;
  characterIdentity: string;
  worldId: string;
  worldSummary: string;
  regionSummary?: string;
  acceptedFacts: string[];
  worldConstraints: string[];
}

export interface GenesisConceptDraft {
  id: string;
  title: string;
  archetypes: string[];
  premise: string;
  currentSituation: string;
  longTermDesire: string;
  fundamentalNeed: string;
  centralMystery: string;
  relationshipSeeds: string[];
  storyModes: string[];
  tropeSignals: string[];
}

export interface LongHorizonPotentialMap {
  earlyAdventures: string[];
  mediumTermArcs: string[];
  meaningfulReveals: string[];
  relationshipDevelopments: string[];
  worldConsequences: string[];
  exhaustionRisk: number;
  expansionSpace: number;
}

export type GenesisDimensionScores = Record<GenesisEvaluationDimension, number>;

export interface GenesisEvaluation {
  candidateId: string;
  scores: GenesisDimensionScores;
  clicheRisk: number;
  contradictions: string[];
  rationale: string;
  longHorizon: LongHorizonPotentialMap;
}

export interface EvaluatedGenesisCandidate {
  concept: GenesisConceptDraft;
  evaluation: GenesisEvaluation;
  weightedScore: number;
  eligible: boolean;
  rejectionReasons: string[];
}

export interface GenesisDiversityMetrics {
  candidateCount: number;
  duplicatePairs: Array<{
    leftId: string;
    rightId: string;
    similarity: number;
  }>;
  averagePairwiseDistance: number;
  minimumPairwiseDistance: number;
}

export interface GenerationStageProvenance {
  intent: ImpactAwareGenerationIntent;
  provider: string;
  modelId: string;
  routeSource: string;
  reasoningLevel: string;
  traceMetadata: Record<string, unknown>;
}

export interface CreativeGenesisPipelineResult {
  schemaVersion: typeof CREATIVE_GENESIS_PIPELINE_VERSION;
  initialCandidateCount: number;
  candidates: EvaluatedGenesisCandidate[];
  selected: EvaluatedGenesisCandidate[];
  diversity: GenesisDiversityMetrics;
  provenance: GenerationStageProvenance[];
  synthesisUsed: boolean;
}

export interface GenesisGenerationRequest {
  stage: "concept_expansion" | "divergence" | "evaluation" | "synthesis";
  route: ResolvedGenerationRoute;
  context: GenesisPipelineContext;
  candidateCount?: number;
  candidates?: GenesisConceptDraft[];
  synthesisParents?: GenesisConceptDraft[];
}

export interface GenesisGenerationPort {
  generate(request: GenesisGenerationRequest): Promise<unknown>;
}

export interface CreativeGenesisPipelineDeps {
  generator: GenesisGenerationPort;
  resolveRoute?: typeof resolveGenerationRoute;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.72;
const SYNTHESIS_SCORE_THRESHOLD = 80;
const MIN_SELECTED_SCORE = 62;

export async function runCreativeGenesisPipeline(
  context: GenesisPipelineContext,
  deps: CreativeGenesisPipelineDeps,
): Promise<CreativeGenesisPipelineResult> {
  validateContext(context);
  const resolveRoute = deps.resolveRoute ?? resolveGenerationRoute;
  const provenance: GenerationStageProvenance[] = [];

  const expansionRoute = await resolveRoute(
    context.userId,
    context.householdId,
    "character_genesis",
  );
  assertGenerationIntentMayMutate("character_genesis", "genesis");
  provenance.push(toProvenance(expansionRoute));

  const initial = parseConceptList(
    await deps.generator.generate({
      stage: "concept_expansion",
      route: expansionRoute,
      context,
      candidateCount: 10,
    }),
    "concept_expansion",
  );
  if (initial.length < 8 || initial.length > 12) {
    throw new ValidationError(
      "INVALID_GENESIS_CANDIDATE_COUNT",
      "Concept expansion must produce between 8 and 12 Genesis candidates",
      "candidates",
    );
  }

  const divergenceRoute = await resolveRoute(
    context.userId,
    context.householdId,
    "genesis_divergence",
  );
  assertGenerationIntentMayMutate("genesis_divergence", "genesis");
  provenance.push(toProvenance(divergenceRoute));

  const diverged = parseConceptList(
    await deps.generator.generate({
      stage: "divergence",
      route: divergenceRoute,
      context,
      candidates: initial,
      candidateCount: initial.length,
    }),
    "divergence",
  );
  if (diverged.length !== initial.length) {
    throw new ValidationError(
      "GENESIS_DIVERGENCE_COUNT_MISMATCH",
      "Divergence must preserve the candidate count",
      "candidates",
    );
  }

  const diversity = measureGenesisDiversity(diverged);
  if (diversity.duplicatePairs.length > Math.floor(diverged.length / 4)) {
    throw new ValidationError(
      "GENESIS_DIVERSITY_TOO_LOW",
      "Divergence output still contains too many structurally duplicate concepts",
      "candidates",
    );
  }

  const evaluationRoute = await resolveRoute(
    context.userId,
    context.householdId,
    "genesis_evaluation",
  );
  provenance.push(toProvenance(evaluationRoute));

  let evaluated = combineEvaluations(
    diverged,
    parseEvaluationList(
      await deps.generator.generate({
        stage: "evaluation",
        route: evaluationRoute,
        context,
        candidates: diverged,
      }),
    ),
    context,
    diversity,
  );

  const eligible = evaluated
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => b.weightedScore - a.weightedScore);

  let synthesisUsed = false;
  if (
    eligible.length >= 2 &&
    (eligible[0]?.weightedScore ?? 0) < SYNTHESIS_SCORE_THRESHOLD
  ) {
    const parents = eligible.slice(0, 2).map((candidate) => candidate.concept);
    const synthesis = parseSingleConcept(
      await deps.generator.generate({
        stage: "synthesis",
        route: divergenceRoute,
        context,
        synthesisParents: parents,
      }),
      "synthesis",
    );

    const synthesisEvaluation = parseEvaluationList(
      await deps.generator.generate({
        stage: "evaluation",
        route: evaluationRoute,
        context,
        candidates: [synthesis],
      }),
    );
    const synthesisDiversity = measureGenesisDiversity([
      ...diverged,
      synthesis,
    ]);
    evaluated = [
      ...evaluated,
      ...combineEvaluations(
        [synthesis],
        synthesisEvaluation,
        context,
        synthesisDiversity,
      ),
    ];
    synthesisUsed = true;
  }

  const selected = evaluated
    .filter(
      (candidate) =>
        candidate.eligible && candidate.weightedScore >= MIN_SELECTED_SCORE,
    )
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3);

  if (selected.length === 0) {
    throw new ValidationError(
      "NO_ELIGIBLE_GENESIS_CANDIDATE",
      "No Genesis candidate passed coherence, contradiction and long-horizon gates",
      "candidates",
    );
  }

  return {
    schemaVersion: CREATIVE_GENESIS_PIPELINE_VERSION,
    initialCandidateCount: initial.length,
    candidates: evaluated,
    selected,
    diversity,
    provenance,
    synthesisUsed,
  };
}

export function measureGenesisDiversity(
  candidates: GenesisConceptDraft[],
): GenesisDiversityMetrics {
  const duplicatePairs: GenesisDiversityMetrics["duplicatePairs"] = [];
  const distances: number[] = [];

  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const leftCandidate = candidates[left];
      const rightCandidate = candidates[right];
      if (!leftCandidate || !rightCandidate) continue;
      const similarity = conceptSimilarity(leftCandidate, rightCandidate);
      const distance = 1 - similarity;
      distances.push(distance);
      if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
        duplicatePairs.push({
          leftId: leftCandidate.id,
          rightId: rightCandidate.id,
          similarity: round(similarity),
        });
      }
    }
  }

  return {
    candidateCount: candidates.length,
    duplicatePairs,
    averagePairwiseDistance:
      distances.length === 0
        ? 1
        : round(
            distances.reduce((sum, value) => sum + value, 0) / distances.length,
          ),
    minimumPairwiseDistance:
      distances.length === 0 ? 1 : round(Math.min(...distances)),
  };
}

export function calculateGenesisWeightedScore(
  evaluation: GenesisEvaluation,
): number {
  const scores = GENESIS_EVALUATION_DIMENSIONS.map(
    (dimension) => evaluation.scores[dimension],
  );
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const clichePenalty = evaluation.clicheRisk * 0.18;
  const horizonAdjustment =
    evaluation.longHorizon.expansionSpace * 0.08 -
    evaluation.longHorizon.exhaustionRisk * 0.08;
  return round(
    Math.max(0, Math.min(100, mean - clichePenalty + horizonAdjustment)),
  );
}

function combineEvaluations(
  concepts: GenesisConceptDraft[],
  evaluations: GenesisEvaluation[],
  context: GenesisPipelineContext,
  diversity: GenesisDiversityMetrics,
): EvaluatedGenesisCandidate[] {
  const evaluationsById = new Map(
    evaluations.map((evaluation) => [evaluation.candidateId, evaluation]),
  );
  const duplicateIds = new Set(
    diversity.duplicatePairs.flatMap((pair) => [pair.leftId, pair.rightId]),
  );

  return concepts.map((concept) => {
    const evaluation = evaluationsById.get(concept.id);
    if (!evaluation) {
      throw new ValidationError(
        "MISSING_GENESIS_EVALUATION",
        `Missing evaluator output for candidate ${concept.id}`,
        "evaluations",
      );
    }

    const rejectionReasons: string[] = [];
    if (evaluation.contradictions.length > 0) {
      rejectionReasons.push("accepted_fact_contradiction");
    }
    if (evaluation.scores.childSuitability < 55) {
      rejectionReasons.push("child_suitability");
    }
    if (evaluation.scores.worldCompatibility < 60) {
      rejectionReasons.push("world_compatibility");
    }
    if (evaluation.scores.internalCoherence < 60) {
      rejectionReasons.push("internal_coherence");
    }
    if (evaluation.longHorizon.expansionSpace < 50) {
      rejectionReasons.push("long_horizon_exhaustion");
    }
    if (duplicateIds.has(concept.id)) {
      rejectionReasons.push("structural_duplicate");
    }
    if (violatesExplicitConstraints(concept, context.worldConstraints)) {
      rejectionReasons.push("explicit_world_constraint");
    }

    return {
      concept,
      evaluation,
      weightedScore: calculateGenesisWeightedScore(evaluation),
      eligible: rejectionReasons.length === 0,
      rejectionReasons,
    };
  });
}

function parseConceptList(
  value: unknown,
  stage: string,
): GenesisConceptDraft[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "INVALID_GENESIS_PIPELINE_OUTPUT",
      `${stage} output must be an array`,
      "candidates",
    );
  }
  const result = value.map((candidate, index) =>
    parseConcept(candidate, `${stage}[${index}]`),
  );
  const ids = new Set(result.map((candidate) => candidate.id));
  if (ids.size !== result.length) {
    throw new ValidationError(
      "DUPLICATE_GENESIS_CANDIDATE_ID",
      `${stage} candidate ids must be unique`,
      "candidates",
    );
  }
  return result;
}

function parseSingleConcept(
  value: unknown,
  stage: string,
): GenesisConceptDraft {
  return parseConcept(value, stage);
}

function parseConcept(value: unknown, field: string): GenesisConceptDraft {
  const record = asRecord(value, field);
  return {
    id: requiredText(record.id, `${field}.id`, 120),
    title: requiredText(record.title, `${field}.title`, 180),
    archetypes: stringList(record.archetypes, `${field}.archetypes`, 1, 4),
    premise: requiredText(record.premise, `${field}.premise`, 1_500),
    currentSituation: requiredText(
      record.currentSituation,
      `${field}.currentSituation`,
      1_500,
    ),
    longTermDesire: requiredText(
      record.longTermDesire,
      `${field}.longTermDesire`,
      800,
    ),
    fundamentalNeed: requiredText(
      record.fundamentalNeed,
      `${field}.fundamentalNeed`,
      800,
    ),
    centralMystery: requiredText(
      record.centralMystery,
      `${field}.centralMystery`,
      1_000,
    ),
    relationshipSeeds: stringList(
      record.relationshipSeeds,
      `${field}.relationshipSeeds`,
      0,
      8,
    ),
    storyModes: stringList(record.storyModes, `${field}.storyModes`, 3, 10),
    tropeSignals: stringList(
      record.tropeSignals,
      `${field}.tropeSignals`,
      0,
      8,
    ),
  };
}

function parseEvaluationList(value: unknown): GenesisEvaluation[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "INVALID_GENESIS_EVALUATION_OUTPUT",
      "Evaluator output must be an array",
      "evaluations",
    );
  }
  return value.map((entry, index) => parseEvaluation(entry, index));
}

function parseEvaluation(value: unknown, index: number): GenesisEvaluation {
  const field = `evaluations[${index}]`;
  const record = asRecord(value, field);
  const scoreRecord = asRecord(record.scores, `${field}.scores`);
  const scores = {} as GenesisDimensionScores;
  for (const dimension of GENESIS_EVALUATION_DIMENSIONS) {
    scores[dimension] = boundedScore(
      scoreRecord[dimension],
      `${field}.scores.${dimension}`,
    );
  }
  const longHorizonRecord = asRecord(
    record.longHorizon,
    `${field}.longHorizon`,
  );
  const longHorizon: LongHorizonPotentialMap = {
    earlyAdventures: exactFive(
      longHorizonRecord.earlyAdventures,
      `${field}.longHorizon.earlyAdventures`,
    ),
    mediumTermArcs: exactFive(
      longHorizonRecord.mediumTermArcs,
      `${field}.longHorizon.mediumTermArcs`,
    ),
    meaningfulReveals: exactFive(
      longHorizonRecord.meaningfulReveals,
      `${field}.longHorizon.meaningfulReveals`,
    ),
    relationshipDevelopments: exactFive(
      longHorizonRecord.relationshipDevelopments,
      `${field}.longHorizon.relationshipDevelopments`,
    ),
    worldConsequences: exactFive(
      longHorizonRecord.worldConsequences,
      `${field}.longHorizon.worldConsequences`,
    ),
    exhaustionRisk: boundedScore(
      longHorizonRecord.exhaustionRisk,
      `${field}.longHorizon.exhaustionRisk`,
    ),
    expansionSpace: boundedScore(
      longHorizonRecord.expansionSpace,
      `${field}.longHorizon.expansionSpace`,
    ),
  };

  return {
    candidateId: requiredText(record.candidateId, `${field}.candidateId`, 120),
    scores,
    clicheRisk: boundedScore(record.clicheRisk, `${field}.clicheRisk`),
    contradictions: stringList(
      record.contradictions,
      `${field}.contradictions`,
      0,
      12,
    ),
    rationale: requiredText(record.rationale, `${field}.rationale`, 2_000),
    longHorizon,
  };
}

function validateContext(context: GenesisPipelineContext): void {
  if (
    !Number.isInteger(context.childAge) ||
    context.childAge < 2 ||
    context.childAge > 17
  ) {
    throw new ValidationError(
      "INVALID_GENESIS_CHILD_AGE",
      "Genesis child age must be an integer between 2 and 17",
      "childAge",
    );
  }
  for (const [field, value] of Object.entries({
    userId: context.userId,
    householdId: context.householdId,
    childProfileId: context.childProfileId,
    characterKind: context.characterKind,
    characterIdentity: context.characterIdentity,
    worldId: context.worldId,
    worldSummary: context.worldSummary,
  })) {
    requiredText(value, field, 4_000);
  }
}

function toProvenance(
  route: ResolvedGenerationRoute,
): GenerationStageProvenance {
  return {
    intent: route.intent,
    provider: route.provider,
    modelId: route.modelId,
    routeSource: route.source,
    reasoningLevel: route.reasoningLevel,
    traceMetadata: buildGenerationTraceRoutingMetadata(route),
  };
}

function conceptSimilarity(
  left: GenesisConceptDraft,
  right: GenesisConceptDraft,
): number {
  const leftTokens = tokenSet(
    `${left.premise} ${left.currentSituation} ${left.centralMystery} ${left.archetypes.join(" ")} ${left.tropeSignals.join(" ")}`,
  );
  const rightTokens = tokenSet(
    `${right.premise} ${right.currentSituation} ${right.centralMystery} ${right.archetypes.join(" ")} ${right.tropeSignals.join(" ")}`,
  );
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase("en-US")
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

function violatesExplicitConstraints(
  concept: GenesisConceptDraft,
  constraints: string[],
): boolean {
  const corpus = tokenSet(
    `${concept.premise} ${concept.currentSituation} ${concept.centralMystery}`,
  );
  return constraints.some((constraint) => {
    const normalized = constraint.trim().toLocaleLowerCase("en-US");
    if (!normalized.startsWith("must_not_include:")) return false;
    const forbidden = normalized.slice("must_not_include:".length).trim();
    return forbidden.length > 0 && corpus.has(forbidden);
  });
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(
      "INVALID_GENESIS_PIPELINE_OUTPUT",
      `${field} must be an object`,
      field,
    );
  }
  return value as Record<string, unknown>;
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    throw new ValidationError(
      "INVALID_GENESIS_PIPELINE_TEXT",
      `${field} must be non-empty and at most ${maxLength} characters`,
      field,
    );
  }
  return value.trim();
}

function stringList(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new ValidationError(
      "INVALID_GENESIS_PIPELINE_LIST",
      `${field} must contain between ${min} and ${max} values`,
      field,
    );
  }
  const result = value.map((item, index) =>
    requiredText(item, `${field}[${index}]`, 1_000),
  );
  if (
    new Set(result.map((item) => item.toLocaleLowerCase("en-US"))).size !==
    result.length
  ) {
    throw new ValidationError(
      "DUPLICATE_GENESIS_PIPELINE_VALUE",
      `${field} values must be unique`,
      field,
    );
  }
  return result;
}

function exactFive(value: unknown, field: string): string[] {
  const result = stringList(value, field, 5, 5);
  return result;
}

function boundedScore(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new ValidationError(
      "INVALID_GENESIS_EVALUATION_SCORE",
      `${field} must be a number between 0 and 100`,
      field,
    );
  }
  return value;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
