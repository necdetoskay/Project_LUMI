import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  type OnboardingSuggestionGenerationOptions,
} from "./onboarding-suggestion-generation-core";

export interface CharacterIdentitySuggestion {
  key: string;
  name: string;
  identity: string;
  traits: [string, string, string];
  fitReason: string;
}

export interface CharacterIdentitySuggestionResult {
  suggestions: CharacterIdentitySuggestion[];
}

export async function generateCharacterIdentitySuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<CharacterIdentitySuggestionResult> {
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    {
      promptKey: "character_onboarding.character_identity_suggestions",
      taskType: "character_identity_suggestions",
      summaryGuard(summary) {
        if (
          typeof summary.worldFeeling !== "string" ||
          !summary.characterArchetype
        )
          throw new Error("CHARACTER_IDENTITY_CONTEXT_REQUIRED");
      },
      contextExtras: (summary) => ({
        worldFeeling: summary.worldFeeling as string,
        characterArchetype: summary.characterArchetype as object,
      }),
      pick: pickSuggestionArray<CharacterIdentitySuggestion>,
      maxAttempts: 1,
    },
    options,
  );

  return { suggestions: result.suggestions };
}
