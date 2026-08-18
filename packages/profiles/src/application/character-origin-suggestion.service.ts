import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  type OnboardingSuggestionGenerationOptions,
} from "./onboarding-suggestion-generation-core";

export interface CharacterOriginSuggestion {
  key: string;
  title: string;
  origin: string;
  home: string;
  formativeExperience: string;
  storyHook: string;
}

export interface CharacterOriginSuggestionResult {
  suggestions: CharacterOriginSuggestion[];
}

export async function generateCharacterOriginSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<CharacterOriginSuggestionResult> {
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    {
      promptKey: "character_onboarding.character_origin_suggestions",
      taskType: "character_origin_suggestions",
      summaryGuard(summary) {
        const canonicalFoundation = Boolean(
          summary.world && summary.region && summary.characterIdentity,
        );
        const legacyWorldFirst = Boolean(
          typeof summary.worldFeeling === "string" &&
            summary.characterArchetype &&
            summary.characterIdentity,
        );
        if (!canonicalFoundation && !legacyWorldFirst)
          throw new Error("CHARACTER_ORIGIN_CONTEXT_REQUIRED");
      },
      contextExtras: (summary) => {
        const world = summary.world as
          | { name?: string; ecology?: string; adventureTone?: string }
          | undefined;
        const region = summary.region as
          | { name?: string; biome?: string; description?: string }
          | undefined;
        return {
          worldFeeling:
            typeof summary.worldFeeling === "string"
              ? summary.worldFeeling
              : `${world?.name ?? "selected world"}; ${world?.ecology ?? ""}; ${world?.adventureTone ?? ""}`,
          characterArchetype: (summary.characterArchetype ?? {
            characterType: summary.characterType,
            world,
            region,
          }) as object,
          characterIdentity: summary.characterIdentity as object,
        };
      },
      pick: pickSuggestionArray<CharacterOriginSuggestion>,
      maxAttempts: 1,
    },
    options,
  );

  return { suggestions: result.suggestions };
}
