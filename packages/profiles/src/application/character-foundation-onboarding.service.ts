import { and, eq } from "drizzle-orm";

import {
  characterCreationCycles,
  characterCreationSelections,
  characterGoals,
  childProfiles,
  lumiCharacters,
  parentalSettings,
} from "../db/schema/profile";
import type {
  AgeBand,
  BroadCharacterKind,
  CharacterType,
} from "../domain/types";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import { getProfileDb } from "./db";
import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import { buildGenerationContext } from "./generation-context.service";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";

export type CanonicalCharacterType =
  | "human"
  | "animal"
  | "fantastic"
  | "synthetic";

export interface WorldSuggestion {
  key: string;
  name: string;
  description: string;
  ecology: string;
  climate: string;
  magicTechnology: string;
  adventureTone: string;
}

export interface CompatibilitySuggestion {
  key: string;
  classification: "natural" | "requires_explanation" | "low" | "incompatible";
  explanation: string;
  adaptationPremise: string;
}

export interface RegionSuggestion {
  key: string;
  name: string;
  biome: string;
  tone: string;
  mystery: string;
  description: string;
}

export interface CoreSagaSuggestion {
  key: string;
  title: string;
  premise: string;
  longTermGoal: string;
  motivation: string;
  themes: string[];
  futureBranches: string[];
  specificity: string;
}

export interface FoundationOriginSelection {
  key: string;
  title: string;
  origin: string;
  home: string;
  formativeExperience: string;
  storyHook: string;
}

type GenerationSpec<T> = {
  promptKey: string;
  taskType: string;
  summaryGuard: (summary: Record<string, unknown>) => void;
  contextExtras?: (summary: Record<string, unknown>) => Record<string, unknown>;
  pick: (value: unknown) => T[];
};

async function generateSuggestions<T>(
  userId: string,
  input: { householdId: string; childProfileId: string },
  spec: GenerationSpec<T>,
): Promise<{ suggestions: T[]; modelId: string; promptVersion: number }> {
  const generationContext = await buildGenerationContext(userId, {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    profile: "character_onboarding",
  });
  const summary = generationContext.creation.previousSelections;
  spec.summaryGuard(summary);
  const assembled = assembleGenerationContext(generationContext);
  const context = {
    ...toPromptGenerationContext(assembled),
    previousSelections: summary,
    ...(spec.contextExtras?.(summary) ?? {}),
  };
  const prompt = await resolveActivePrompt(spec.promptKey, context);
  const generated = await generateTextWithLlm({
    userId,
    householdId: input.householdId,
    taskType: spec.taskType,
    system: prompt.system,
    user: prompt.user,
    modelOverride: prompt.modelOverride,
    generationConfig: prompt.generationConfig,
  });
  try {
    const validated = parseAndValidatePromptOutput(
      generated.content,
      prompt.outputSchema,
    );
    const suggestions = spec.pick(validated);
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId,
      taskType: spec.taskType,
      promptKey: prompt.promptKey,
      promptVersion: prompt.promptVersion,
      inputContext: context,
      outputPayload: { suggestions },
      validationStatus: "valid",
      generated,
    });
    return {
      suggestions,
      modelId: generated.model,
      promptVersion: prompt.promptVersion,
    };
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId,
      taskType: spec.taskType,
      promptKey: prompt.promptKey,
      promptVersion: prompt.promptVersion,
      inputContext: context,
      outputPayload: { raw: generated.content },
      validationStatus: "invalid",
      generated,
    });
    throw error;
  }
}

function asSuggestions<T>(value: unknown): T[] {
  const suggestions = (value as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length === 0)
    throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");
  return suggestions as T[];
}

async function persistSelection(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    expectedStep: string | string[];
    stepKey: string;
    selectionKey: string;
    selectionPayload: Record<string, unknown>;
    summaryKey: string;
    nextStep: string;
  },
) {
  const cycle = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  const expected = Array.isArray(input.expectedStep)
    ? input.expectedStep
    : [input.expectedStep];
  if (!expected.includes(cycle.currentStep))
    throw new Error(
      `ONBOARDING_STEP_OUT_OF_ORDER:${cycle.currentStep}:${input.stepKey}`,
    );
  const latestSummary = {
    ...(cycle.latestSummary ?? {}),
    [input.summaryKey]: input.selectionPayload,
  };
  const db = getProfileDb();
  await db.transaction(async (tx) => {
    await tx.insert(characterCreationSelections).values({
      id: crypto.randomUUID(),
      cycleId: cycle.id,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      stepKey: input.stepKey,
      selectionKey: input.selectionKey,
      selectionPayload: input.selectionPayload,
      selectedBy: "user",
    });
    await tx
      .update(characterCreationCycles)
      .set({
        currentStep: input.nextStep,
        latestSummary,
        updatedAt: new Date(),
      })
      .where(eq(characterCreationCycles.id, cycle.id));
  });
  return { id: cycle.id, currentStep: input.nextStep, latestSummary };
}

export async function chooseCanonicalCharacterType(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    characterType: CanonicalCharacterType;
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "character_type",
    stepKey: "character_type",
    selectionKey: input.characterType,
    selectionPayload: { characterType: input.characterType },
    summaryKey: "characterType",
    nextStep: "character_identity",
  });
}

export async function chooseUniverse(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    universe: { key: string; name: string };
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "universe",
    stepKey: "universe",
    selectionKey: input.universe.key,
    selectionPayload: input.universe,
    summaryKey: "universe",
    nextStep: "world",
  });
}

export async function generateWorldSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  return generateSuggestions<WorldSuggestion>(userId, input, {
    promptKey: "character_onboarding.world_suggestions",
    taskType: "character_world_suggestions",
    summaryGuard(summary) {
      if (!summary.characterIdentity || !summary.universe)
        throw new Error("WORLD_SUGGESTION_CONTEXT_REQUIRED");
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      universe: summary.universe as object,
      characterType: summary.characterType as object,
    }),
    pick: asSuggestions<WorldSuggestion>,
  });
}

export async function chooseWorldSuggestion(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    suggestion: WorldSuggestion;
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "world",
    stepKey: "world",
    selectionKey: input.suggestion.key,
    selectionPayload: { ...input.suggestion },
    summaryKey: "world",
    nextStep: "compatibility",
  });
}

export async function generateCompatibilitySuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  return generateSuggestions<CompatibilitySuggestion>(userId, input, {
    promptKey: "character_onboarding.compatibility",
    taskType: "character_world_compatibility",
    summaryGuard(summary) {
      if (!summary.characterIdentity || !summary.world)
        throw new Error("COMPATIBILITY_CONTEXT_REQUIRED");
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      world: summary.world as object,
    }),
    pick: asSuggestions<CompatibilitySuggestion>,
  });
}

export async function chooseCompatibility(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    suggestion: CompatibilitySuggestion;
  },
) {
  if (input.suggestion.classification === "incompatible")
    throw new Error("INCOMPATIBLE_FOUNDATION_SELECTION");
  return persistSelection(userId, {
    ...input,
    expectedStep: "compatibility",
    stepKey: "compatibility",
    selectionKey: input.suggestion.key,
    selectionPayload: { ...input.suggestion },
    summaryKey: "compatibility",
    nextStep: "region",
  });
}

export async function generateRegionSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  return generateSuggestions<RegionSuggestion>(userId, input, {
    promptKey: "character_onboarding.region_suggestions",
    taskType: "character_region_suggestions",
    summaryGuard(summary) {
      if (!summary.world || !summary.compatibility)
        throw new Error("REGION_CONTEXT_REQUIRED");
    },
    contextExtras: (summary) => ({
      world: summary.world as object,
      compatibility: summary.compatibility as object,
      characterIdentity: summary.characterIdentity as object,
    }),
    pick: asSuggestions<RegionSuggestion>,
  });
}

export async function chooseRegionSuggestion(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    suggestion: RegionSuggestion;
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "region",
    stepKey: "region",
    selectionKey: input.suggestion.key,
    selectionPayload: { ...input.suggestion },
    summaryKey: "region",
    nextStep: "origin",
  });
}

export async function chooseOriginSuggestion(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    suggestion: FoundationOriginSelection;
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "origin",
    stepKey: "origin",
    selectionKey: input.suggestion.key,
    selectionPayload: { ...input.suggestion },
    summaryKey: "origin",
    nextStep: "core_saga",
  });
}

export async function generateCoreSagaSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  return generateSuggestions<CoreSagaSuggestion>(userId, input, {
    promptKey: "character_onboarding.core_saga",
    taskType: "character_core_saga",
    summaryGuard(summary) {
      if (
        !summary.world ||
        !summary.region ||
        !summary.origin ||
        !summary.characterIdentity
      )
        throw new Error("CORE_SAGA_CONTEXT_REQUIRED");
    },
    contextExtras: (summary) => ({
      world: summary.world as object,
      region: summary.region as object,
      origin: summary.origin as object,
      characterIdentity: summary.characterIdentity as object,
    }),
    pick: asSuggestions<CoreSagaSuggestion>,
  });
}

export async function chooseCoreSagaSuggestion(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    suggestion: CoreSagaSuggestion;
  },
) {
  return persistSelection(userId, {
    ...input,
    expectedStep: "core_saga",
    stepKey: "core_saga",
    selectionKey: input.suggestion.key,
    selectionPayload: { ...input.suggestion },
    summaryKey: "coreSaga",
    nextStep: "final_review",
  });
}

function broadKindFromCanonical(value: unknown): BroadCharacterKind {
  const type =
    typeof value === "object" && value
      ? (value as { characterType?: unknown }).characterType
      : value;
  if (type === "human") return "human";
  if (type === "animal") return "animal";
  if (type === "synthetic") return "robot";
  return "fantasy";
}

function roleFromIdentity(identity: { traits?: unknown }): CharacterType {
  const text = JSON.stringify(identity.traits ?? []).toLowerCase();
  if (text.includes("yardım") || text.includes("empati")) return "helper";
  if (text.includes("icat") || text.includes("merak")) return "inventor";
  if (text.includes("hik") || text.includes("anlat")) return "storyteller";
  if (text.includes("hayal") || text.includes("dream")) return "dreamer";
  return "explorer";
}

export async function finalizeCharacterFoundation(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  const cycle = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  if (!cycle || cycle.currentStep !== "final_review")
    throw new Error("FINAL_REVIEW_REQUIRED");
  const summary = cycle.latestSummary ?? {};
  const identity = summary.characterIdentity as
    | {
        key: string;
        name: string;
        identity: string;
        traits: [string, string, string];
      }
    | undefined;
  const universe = summary.universe as
    | { key: string; name: string }
    | undefined;
  const world = summary.world as WorldSuggestion | undefined;
  const region = summary.region as RegionSuggestion | undefined;
  const origin = summary.origin as FoundationOriginSelection | undefined;
  const saga = summary.coreSaga as CoreSagaSuggestion | undefined;
  if (!identity || !universe || !world || !region || !origin || !saga)
    throw new Error("FOUNDATION_INCOMPLETE");

  const db = getProfileDb();
  const [child] = await db
    .select({ ageBand: childProfiles.ageBand })
    .from(childProfiles)
    .where(
      and(
        eq(childProfiles.id, input.childProfileId),
        eq(childProfiles.householdId, input.householdId),
      ),
    )
    .limit(1);
  const [policy] = await db
    .select({
      contentBoundary: parentalSettings.contentBoundary,
      requireParentApprovalForAi: parentalSettings.requireParentApprovalForAi,
    })
    .from(parentalSettings)
    .where(eq(parentalSettings.householdId, input.householdId))
    .limit(1);
  if (!child || !policy) throw new Error("FOUNDATION_SCOPE_DATA_REQUIRED");

  const characterId = crypto.randomUUID();
  const firstOriginPackageId = crypto.randomUUID();
  const role = roleFromIdentity(identity);
  const broadKind = broadKindFromCanonical(summary.characterType);
  const subtype = identity.identity.slice(0, 80) || identity.name.slice(0, 80);
  const latestSummary = {
    ...summary,
    committedCharacterId: characterId,
  };

  await db.transaction(async (tx) => {
    await tx.insert(lumiCharacters).values({
      id: characterId,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      name: identity.name.slice(0, 120),
      broadKind,
      characterType: role,
      subtype,
      originMode: "manual",
      firstOriginPackageId,
      originConcept: origin.origin.slice(0, 500),
      startingRegionArchetype: region.name.slice(0, 120),
      startingLocation: region.description.slice(0, 200),
      homeArchetype: origin.home.slice(0, 120),
      nearbyNpcSeed: origin.formativeExperience.slice(0, 500),
      firstMysterySeed: origin.storyHook.slice(0, 500),
      universeSeed: universe.key.slice(0, 120),
      safetyBounds: {
        ageBand: child.ageBand as AgeBand,
        contentBoundary: policy.contentBoundary as
          | "strict"
          | "moderate"
          | "open",
        requireParentApprovalForAi: policy.requireParentApprovalForAi,
      },
    });
    await tx.insert(characterGoals).values({
      id: crypto.randomUUID(),
      characterId,
      needType: "core_saga",
      description: `${saga.title}: ${saga.longTermGoal}`.slice(0, 500),
      priority: 1,
      status: "active",
    });
    await tx.insert(characterCreationSelections).values({
      id: crypto.randomUUID(),
      cycleId: cycle.id,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      stepKey: "final_review",
      selectionKey: "commit",
      selectionPayload: { characterId, worldKey: world.key, sagaKey: saga.key },
      selectedBy: "user",
    });
    await tx
      .update(characterCreationCycles)
      .set({
        status: "completed",
        currentStep: "completed",
        latestSummary,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(characterCreationCycles.id, cycle.id));
  });

  return {
    characterId,
    cycleId: cycle.id,
    foundation: {
      identity,
      universe,
      world,
      region,
      origin,
      saga,
      broadKind,
      role,
    },
  };
}
