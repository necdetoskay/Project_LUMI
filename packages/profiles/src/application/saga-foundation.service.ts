import {
  validateSagaCanon,
  validateSagaProgression,
  ValidationError,
  type FoundationProvenance,
  type SagaCanon,
  type SagaProgression,
} from "../domain";
import {
  assertGenerationIntentMayMutate,
  buildGenerationTraceRoutingMetadata,
  resolveGenerationRoute,
  type ResolvedGenerationRoute,
} from "./llm-settings";
import type { GenesisConceptDraft } from "./creative-genesis-pipeline.service";

export const SAGA_FOUNDATION_SCHEMA_VERSION = 1 as const;

export interface CoreTension {
  question: string;
  opposingForces: [string, string];
  whyItPersists: string;
  ordinaryLifePressure: string;
}

export interface SagaTimeScales {
  immediateNeed: {
    goal: string;
    horizon: "one_to_few_stories";
  };
  mediumArc: {
    goal: string;
    horizon: "five_to_twenty_stories";
  };
  coreSaga: {
    goal: string;
    horizon: "long_horizon";
  };
}

export interface SagaFoundationContext {
  userId: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  childAge: number;
  worldSummary: string;
  currentSituation: string;
  acceptedFacts: string[];
  selectedGenesis: GenesisConceptDraft;
}

export interface SagaFoundationDraft {
  coreTension: CoreTension;
  timeScales: SagaTimeScales;
  canon: Omit<
    SagaCanon,
    | "id"
    | "householdId"
    | "childProfileId"
    | "characterId"
    | "worldId"
    | "version"
    | "provenance"
  >;
  progression: Omit<SagaProgression, "sagaCanonId" | "version" | "updatedAt">;
}

export interface SagaFoundationResult {
  schemaVersion: typeof SAGA_FOUNDATION_SCHEMA_VERSION;
  coreTension: CoreTension;
  timeScales: SagaTimeScales;
  canon: SagaCanon;
  progression: SagaProgression;
  route: {
    provider: string;
    modelId: string;
    reasoningLevel: string;
    source: string;
    traceMetadata: Record<string, unknown>;
  };
}

export interface SagaFoundationGenerationRequest {
  route: ResolvedGenerationRoute;
  context: SagaFoundationContext;
}

export interface SagaFoundationGenerationPort {
  generate(request: SagaFoundationGenerationRequest): Promise<unknown>;
}

export interface SagaFoundationDeps {
  generator: SagaFoundationGenerationPort;
  resolveRoute?: typeof resolveGenerationRoute;
  now?: () => Date;
  createId?: (kind: "canon") => string;
  promptProvenance: {
    promptKey: string;
    promptVersion: number;
    requestId?: string;
    rngSeed?: string;
  };
}

export interface SagaSafeContextProjection {
  centralQuestion: string;
  longTermDesire: string;
  stakes: string;
  knownFacts: string[];
  currentBeliefs: string[];
  revealedClues: string[];
  unresolvedQuestions: string[];
  revealStage: number;
}

export async function buildSagaFoundation(
  context: SagaFoundationContext,
  deps: SagaFoundationDeps,
): Promise<SagaFoundationResult> {
  validateContext(context);
  const resolveRoute = deps.resolveRoute ?? resolveGenerationRoute;
  const route = await resolveRoute(
    context.userId,
    context.householdId,
    "saga_foundation",
  );
  assertGenerationIntentMayMutate("saga_foundation", "saga_canon");
  assertGenerationIntentMayMutate("saga_foundation", "saga_progression");

  const draft = parseSagaFoundationDraft(
    await deps.generator.generate({ route, context }),
  );
  validateCoreTension(draft.coreTension);
  validateTimeScales(draft.timeScales);
  validateDraftAgainstGenesis(draft, context);

  const now = (deps.now ?? (() => new Date()))();
  const canonId = (deps.createId ?? (() => `saga-${crypto.randomUUID()}`))(
    "canon",
  );
  const provenance: FoundationProvenance = {
    generationIntent: "saga_foundation",
    promptKey: deps.promptProvenance.promptKey,
    promptVersion: deps.promptProvenance.promptVersion,
    model: route.modelId,
    provider: route.provider,
    requestId: deps.promptProvenance.requestId,
    rngSeed: deps.promptProvenance.rngSeed,
    generatedAt: now,
  };

  const canon: SagaCanon = {
    id: canonId,
    householdId: context.householdId,
    childProfileId: context.childProfileId,
    characterId: context.characterId,
    worldId: context.worldId,
    version: 1,
    ...draft.canon,
    provenance,
  };
  const progression: SagaProgression = {
    sagaCanonId: canonId,
    version: 1,
    ...draft.progression,
    updatedAt: now,
  };

  validateSagaCanon(canon);
  validateSagaProgression(canon, progression);
  validateTruthKnowledgeBeliefInvariant(canon, progression);
  validateRevealPolicy(canon, progression);

  return {
    schemaVersion: SAGA_FOUNDATION_SCHEMA_VERSION,
    coreTension: draft.coreTension,
    timeScales: draft.timeScales,
    canon,
    progression,
    route: {
      provider: route.provider,
      modelId: route.modelId,
      reasoningLevel: route.reasoningLevel,
      source: route.source,
      traceMetadata: buildGenerationTraceRoutingMetadata(route),
    },
  };
}

export function validateTruthKnowledgeBeliefInvariant(
  canon: SagaCanon,
  progression: SagaProgression,
): void {
  const deepTruth = normalize(canon.deepTruth);
  const knowledge = progression.knownFacts.map(normalize);
  const beliefs = progression.currentBeliefs.map(normalize);

  if (knowledge.includes(deepTruth)) {
    throw new ValidationError(
      "SAGA_TRUTH_EQUALS_CHARACTER_KNOWLEDGE",
      "Saga deep truth must remain distinct from initial character knowledge",
      "progression.knownFacts",
    );
  }
  if (beliefs.includes(deepTruth)) {
    throw new ValidationError(
      "SAGA_TRUTH_EQUALS_CURRENT_BELIEF",
      "Saga deep truth must remain distinct from current character belief",
      "progression.currentBeliefs",
    );
  }

  const identicalKnowledgeBelief = knowledge.some((fact) =>
    beliefs.includes(fact),
  );
  if (identicalKnowledgeBelief && knowledge.length === 1 && beliefs.length === 1) {
    throw new ValidationError(
      "SAGA_KNOWLEDGE_EQUALS_BELIEF",
      "Character knowledge and current belief must not collapse into the same single statement",
      "progression",
    );
  }
}

export function validateRevealPolicy(
  canon: SagaCanon,
  progression: SagaProgression,
): void {
  const layers = [...canon.revealLayers].sort((a, b) => a.order - b.order);
  if (progression.revealStage > layers.length) {
    throw new ValidationError(
      "SAGA_REVEAL_STAGE_OUT_OF_RANGE",
      "Saga reveal stage cannot exceed the configured reveal layers",
      "progression.revealStage",
    );
  }

  const visible = [
    ...progression.knownFacts,
    ...progression.currentBeliefs,
    ...progression.revealedClues,
    ...progression.falseLeads,
    ...progression.unresolvedQuestions,
  ];
  const protectedFragments = [
    canon.deepTruth,
    ...canon.forbiddenEarlyReveals,
    ...layers
      .filter((layer) => layer.order > progression.revealStage)
      .map((layer) => layer.reveal),
  ];

  for (const value of visible) {
    for (const protectedValue of protectedFragments) {
      if (meaningfullyContains(value, protectedValue)) {
        throw new ValidationError(
          "SAGA_FORBIDDEN_REVEAL_LEAK",
          "Saga progression exposes protected or not-yet-eligible truth",
          "progression",
        );
      }
    }
  }
}

export function projectSagaForStoryContext(
  canon: SagaCanon,
  progression: SagaProgression,
): SagaSafeContextProjection {
  validateSagaProgression(canon, progression);
  validateTruthKnowledgeBeliefInvariant(canon, progression);
  validateRevealPolicy(canon, progression);

  return {
    centralQuestion: canon.centralQuestion,
    longTermDesire: canon.longTermDesire,
    stakes: canon.stakes,
    knownFacts: [...progression.knownFacts],
    currentBeliefs: [...progression.currentBeliefs],
    revealedClues: [...progression.revealedClues],
    unresolvedQuestions: [...progression.unresolvedQuestions],
    revealStage: progression.revealStage,
  };
}

export function assertSagaMutationAuthority(
  route: ResolvedGenerationRoute,
  target: "saga_canon" | "saga_progression",
): void {
  assertGenerationIntentMayMutate(route.intent, target);
}

function validateContext(context: SagaFoundationContext): void {
  for (const [field, value] of Object.entries({
    userId: context.userId,
    householdId: context.householdId,
    childProfileId: context.childProfileId,
    characterId: context.characterId,
    worldId: context.worldId,
    worldSummary: context.worldSummary,
    currentSituation: context.currentSituation,
  })) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError(
        "INVALID_SAGA_FOUNDATION_CONTEXT",
        `${field} is required for Saga Foundation`,
        field,
      );
    }
  }
  if (!Number.isInteger(context.childAge) || context.childAge < 2 || context.childAge > 17) {
    throw new ValidationError(
      "INVALID_SAGA_CHILD_AGE",
      "Saga Foundation requires a child age between 2 and 17",
      "childAge",
    );
  }
}

function validateCoreTension(value: CoreTension): void {
  requiredText(value.question, "coreTension.question", 1_000);
  requiredText(value.whyItPersists, "coreTension.whyItPersists", 1_200);
  requiredText(
    value.ordinaryLifePressure,
    "coreTension.ordinaryLifePressure",
    1_200,
  );
  if (value.opposingForces.length !== 2) {
    throw new ValidationError(
      "INVALID_CORE_TENSION_FORCES",
      "Core Tension must express exactly two opposing forces",
      "coreTension.opposingForces",
    );
  }
  value.opposingForces.forEach((force, index) =>
    requiredText(force, `coreTension.opposingForces[${index}]`, 500),
  );
}

function validateTimeScales(value: SagaTimeScales): void {
  requiredText(value.immediateNeed.goal, "timeScales.immediateNeed.goal", 800);
  requiredText(value.mediumArc.goal, "timeScales.mediumArc.goal", 1_000);
  requiredText(value.coreSaga.goal, "timeScales.coreSaga.goal", 1_200);
  if (
    value.immediateNeed.horizon !== "one_to_few_stories" ||
    value.mediumArc.horizon !== "five_to_twenty_stories" ||
    value.coreSaga.horizon !== "long_horizon"
  ) {
    throw new ValidationError(
      "INVALID_SAGA_TIME_SCALE",
      "Saga goals must preserve immediate, medium and long-horizon semantics",
      "timeScales",
    );
  }
}

function validateDraftAgainstGenesis(
  draft: SagaFoundationDraft,
  context: SagaFoundationContext,
): void {
  if (
    normalize(draft.timeScales.coreSaga.goal) ===
    normalize(draft.timeScales.immediateNeed.goal)
  ) {
    throw new ValidationError(
      "CORE_SAGA_COLLAPSED_TO_IMMEDIATE_TASK",
      "Core Saga must not collapse into the immediate story task",
      "timeScales.coreSaga",
    );
  }
  if (
    draft.canon.longTermDesire.trim().length === 0 ||
    context.selectedGenesis.longTermDesire.trim().length === 0
  ) {
    throw new ValidationError(
      "SAGA_DESIRE_MISSING",
      "Saga Foundation requires a durable long-term desire",
      "canon.longTermDesire",
    );
  }
  const accepted = context.acceptedFacts.map(normalize);
  const truth = normalize(draft.canon.deepTruth);
  if (accepted.some((fact) => contradictsExplicitly(truth, fact))) {
    throw new ValidationError(
      "SAGA_CANON_ACCEPTED_FACT_CONTRADICTION",
      "Generated Saga Canon contradicts accepted onboarding facts",
      "canon.deepTruth",
    );
  }
}

function parseSagaFoundationDraft(value: unknown): SagaFoundationDraft {
  const record = asRecord(value, "sagaFoundation");
  const tension = asRecord(record.coreTension, "coreTension");
  const forces = stringList(tension.opposingForces, "coreTension.opposingForces", 2, 2);
  const timeScales = asRecord(record.timeScales, "timeScales");
  const immediate = asRecord(timeScales.immediateNeed, "timeScales.immediateNeed");
  const medium = asRecord(timeScales.mediumArc, "timeScales.mediumArc");
  const core = asRecord(timeScales.coreSaga, "timeScales.coreSaga");
  const canon = asRecord(record.canon, "canon");
  const progression = asRecord(record.progression, "progression");

  return {
    coreTension: {
      question: requiredText(tension.question, "coreTension.question", 1_000),
      opposingForces: [forces[0]!, forces[1]!],
      whyItPersists: requiredText(tension.whyItPersists, "coreTension.whyItPersists", 1_200),
      ordinaryLifePressure: requiredText(
        tension.ordinaryLifePressure,
        "coreTension.ordinaryLifePressure",
        1_200,
      ),
    },
    timeScales: {
      immediateNeed: {
        goal: requiredText(immediate.goal, "timeScales.immediateNeed.goal", 800),
        horizon: literal(
          immediate.horizon,
          "one_to_few_stories",
          "timeScales.immediateNeed.horizon",
        ),
      },
      mediumArc: {
        goal: requiredText(medium.goal, "timeScales.mediumArc.goal", 1_000),
        horizon: literal(
          medium.horizon,
          "five_to_twenty_stories",
          "timeScales.mediumArc.horizon",
        ),
      },
      coreSaga: {
        goal: requiredText(core.goal, "timeScales.coreSaga.goal", 1_200),
        horizon: literal(
          core.horizon,
          "long_horizon",
          "timeScales.coreSaga.horizon",
        ),
      },
    },
    canon: {
      centralQuestion: requiredText(canon.centralQuestion, "canon.centralQuestion", 1_000),
      deepTruth: requiredText(canon.deepTruth, "canon.deepTruth", 2_500),
      longTermDesire: requiredText(canon.longTermDesire, "canon.longTermDesire", 1_000),
      fundamentalFear: requiredText(canon.fundamentalFear, "canon.fundamentalFear", 1_000),
      stakes: requiredText(canon.stakes, "canon.stakes", 1_500),
      hiddenForces: stringList(canon.hiddenForces, "canon.hiddenForces", 0, 8),
      possibleTransformations: stringList(
        canon.possibleTransformations,
        "canon.possibleTransformations",
        1,
        8,
      ),
      revealLayers: parseRevealLayers(canon.revealLayers),
      forbiddenEarlyReveals: stringList(
        canon.forbiddenEarlyReveals,
        "canon.forbiddenEarlyReveals",
        1,
        12,
      ),
    },
    progression: {
      knownFacts: stringList(progression.knownFacts, "progression.knownFacts", 1, 12),
      currentBeliefs: stringList(
        progression.currentBeliefs,
        "progression.currentBeliefs",
        1,
        12,
      ),
      revealedClues: stringList(
        progression.revealedClues,
        "progression.revealedClues",
        0,
        12,
      ),
      falseLeads: stringList(progression.falseLeads, "progression.falseLeads", 0, 8),
      unresolvedQuestions: stringList(
        progression.unresolvedQuestions,
        "progression.unresolvedQuestions",
        1,
        12,
      ),
      revealStage: integer(progression.revealStage, "progression.revealStage", 0, 100),
    },
  };
}

function parseRevealLayers(value: unknown): SagaCanon["revealLayers"] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 8) {
    throw new ValidationError(
      "INVALID_SAGA_REVEAL_LAYERS",
      "Saga Foundation must contain between 2 and 8 reveal layers",
      "canon.revealLayers",
    );
  }
  return value.map((entry, index) => {
    const record = asRecord(entry, `canon.revealLayers[${index}]`);
    return {
      id: requiredText(record.id, `canon.revealLayers[${index}].id`, 120),
      order: integer(record.order, `canon.revealLayers[${index}].order`, 0, 100),
      label: requiredText(record.label, `canon.revealLayers[${index}].label`, 160),
      reveal: requiredText(record.reveal, `canon.revealLayers[${index}].reveal`, 1_200),
      prerequisites: stringList(
        record.prerequisites,
        `canon.revealLayers[${index}].prerequisites`,
        0,
        8,
      ),
    };
  });
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("INVALID_SAGA_FOUNDATION_OUTPUT", `${field} must be an object`, field);
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new ValidationError(
      "INVALID_SAGA_FOUNDATION_TEXT",
      `${field} must be between 1 and ${max} characters`,
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
      "INVALID_SAGA_FOUNDATION_LIST",
      `${field} must contain between ${min} and ${max} values`,
      field,
    );
  }
  const result = value.map((entry, index) => requiredText(entry, `${field}[${index}]`, 1_500));
  if (new Set(result.map(normalize)).size !== result.length) {
    throw new ValidationError(
      "DUPLICATE_SAGA_FOUNDATION_VALUE",
      `${field} must not contain duplicate values`,
      field,
    );
  }
  return result;
}

function integer(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new ValidationError(
      "INVALID_SAGA_FOUNDATION_INTEGER",
      `${field} must be an integer between ${min} and ${max}`,
      field,
    );
  }
  return value as number;
}

function literal<T extends string>(value: unknown, expected: T, field: string): T {
  if (value !== expected) {
    throw new ValidationError(
      "INVALID_SAGA_FOUNDATION_LITERAL",
      `${field} must equal ${expected}`,
      field,
    );
  }
  return expected;
}

function meaningfullyContains(value: string, protectedValue: string): boolean {
  const candidate = normalize(value);
  const protectedText = normalize(protectedValue);
  if (candidate === protectedText) return true;
  if (protectedText.length < 24) return false;
  return candidate.includes(protectedText) || protectedText.includes(candidate);
}

function contradictsExplicitly(left: string, right: string): boolean {
  const negativeTokens = ["no ", "not ", "never ", "without "];
  return negativeTokens.some(
    (token) =>
      left.includes(token) &&
      right.replace(token, "").length > 12 &&
      left.includes(right.replace(token, "")),
  );
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
