import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  type OnboardingSuggestionGenerationOptions,
} from "./onboarding-suggestion-generation-core";

export interface WorldCharacterSuggestion {
  key: string;
  name: string;
  description: string;
  fitReason: string;
}

export interface WorldCharacterSuggestionResult {
  suggestions: WorldCharacterSuggestion[];
}

export async function generateWorldCharacterSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<WorldCharacterSuggestionResult> {
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    {
      promptKey: "character_onboarding.world_character_suggestions",
      taskType: "world_character_suggestions",
      generationGuard(context) {
        if (context.creation.startDirection !== "world_first")
          throw new Error("WORLD_FIRST_CYCLE_REQUIRED");
      },
      summaryGuard(summary) {
        if (typeof summary.worldFeeling !== "string")
          throw new Error("WORLD_FEELING_REQUIRED");
      },
      contextExtras: (summary) => ({
        worldFeeling: summary.worldFeeling as string,
      }),
      pick: pickSuggestionArray<WorldCharacterSuggestion>,
      maxAttempts: 1,
    },
    options,
  );

  return { suggestions: result.suggestions };
}
