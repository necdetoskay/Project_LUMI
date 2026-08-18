import { createHash } from "node:crypto";

import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  type OnboardingSuggestionGenerationResult,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";

export type CharacterOnboardingTestLabPhase =
  | "character_first_identity_suggestions"
  | "world_suggestions"
  | "compatibility"
  | "region_suggestions"
  | "origin_suggestions"
  | "core_saga";

export interface CharacterOnboardingTestLabExecutionInput {
  userId: string;
  householdId: string;
  childProfileId: string;
  phaseId: CharacterOnboardingTestLabPhase;
  parentState: Record<string, unknown>;
  modelSlug: string;
  promptVersion?: number;
}

export interface CharacterOnboardingTestLabCandidate {
  payload: Record<string, unknown>;
  candidateState: Record<string, unknown>;
}

export interface CharacterOnboardingTestLabExecutionResult {
  output: { suggestions: Record<string, unknown>[] };
  candidates: CharacterOnboardingTestLabCandidate[];
  provenance: {
    promptKey: string;
    promptVersion: number;
    renderedPromptFingerprint: string;
    contextFingerprint: string;
    modelSlug: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    latencyMs: number;
    estimatedCostUsd: number | null;
  };
}

type Suggestion = Record<string, unknown>;
const pickSuggestions = pickSuggestionArray<Suggestion>;

export async function executeCharacterOnboardingTestLabPhase(
  input: CharacterOnboardingTestLabExecutionInput,
): Promise<CharacterOnboardingTestLabExecutionResult> {
  const definition = phaseDefinition(input.phaseId);
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    input.userId,
    {
      householdId: input.householdId,
      childProfileId: input.childProfileId,
    },
    definition.spec,
    {
      creationOverride: {
        startDirection: "character_first",
        previousSelections: input.parentState,
      },
      modelOverride: input.modelSlug,
      ...(input.promptVersion === undefined
        ? {}
        : { promptVersionOverride: input.promptVersion }),
      recordTrace: false,
    },
  );

  const suggestions = result.suggestions.map(asRecord);
  return {
    output: { suggestions },
    candidates: suggestions.map((suggestion) => ({
      payload: structuredClone(suggestion),
      candidateState: {
        ...structuredClone(input.parentState),
        [definition.writesStateKey]: structuredClone(suggestion),
      },
    })),
    provenance: toProvenance(result),
  };
}

function phaseDefinition(phaseId: CharacterOnboardingTestLabPhase): {
  writesStateKey: string;
  spec: OnboardingSuggestionGenerationSpec<Suggestion>;
} {
  switch (phaseId) {
    case "character_first_identity_suggestions":
      return {
        writesStateKey: "characterIdentity",
        spec: {
          promptKey:
            "character_onboarding.character_first_identity_suggestions",
          taskType: "character_identity_suggestions",
          summaryGuard(summary) {
            if (!summary.characterType)
              throw new Error("CHARACTER_TYPE_CONTEXT_REQUIRED");
          },
          contextExtras: (summary) => ({
            characterType: summary.characterType as object,
          }),
          pick: pickSuggestions,
        },
      };
    case "world_suggestions":
      return {
        writesStateKey: "world",
        spec: {
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
          pick: pickSuggestions,
        },
      };
    case "compatibility":
      return {
        writesStateKey: "compatibility",
        spec: {
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
          pick: pickSuggestions,
        },
      };
    case "region_suggestions":
      return {
        writesStateKey: "region",
        spec: {
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
          pick: pickSuggestions,
        },
      };
    case "origin_suggestions":
      return {
        writesStateKey: "origin",
        spec: {
          promptKey: "character_onboarding.character_origin_suggestions",
          taskType: "character_origin_suggestions",
          summaryGuard(summary) {
            if (!summary.world || !summary.region || !summary.characterIdentity)
              throw new Error("CHARACTER_ORIGIN_CONTEXT_REQUIRED");
          },
          contextExtras: (summary) => {
            const world = summary.world as {
              name?: string;
              ecology?: string;
              adventureTone?: string;
            };
            const region = summary.region as {
              name?: string;
              biome?: string;
              description?: string;
            };
            return {
              worldFeeling: `${world.name ?? "selected world"}; ${world.ecology ?? ""}; ${world.adventureTone ?? ""}`,
              characterArchetype: {
                characterType: summary.characterType,
                world,
                region,
              },
              characterIdentity: summary.characterIdentity as object,
            };
          },
          pick: pickSuggestions,
        },
      };
    case "core_saga":
      return {
        writesStateKey: "coreSaga",
        spec: {
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
          pick: pickSuggestions,
        },
      };
  }
}

function toProvenance(
  result: OnboardingSuggestionGenerationResult<Suggestion>,
): CharacterOnboardingTestLabExecutionResult["provenance"] {
  return {
    promptKey: result.promptKey,
    promptVersion: result.promptVersion,
    renderedPromptFingerprint: fingerprint({
      system: result.systemPrompt,
      user: result.userPrompt,
    }),
    contextFingerprint: fingerprint(result.inputContext),
    modelSlug: result.modelId,
    promptTokens: result.generated.promptTokens,
    completionTokens: result.generated.completionTokens,
    totalTokens: result.generated.totalTokens,
    latencyMs: result.generated.latencyMs,
    estimatedCostUsd:
      result.generated.cost === null
        ? null
        : result.generated.cost.estimatedCostUsdMicros / 1_000_000,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("ONBOARDING_SUGGESTION_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
