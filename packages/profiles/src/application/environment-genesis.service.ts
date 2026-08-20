import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";
import {
  ENVIRONMENT_GENESIS_PROMPT_KEY,
  ensureEnvironmentGenesisPrompt,
} from "./environment-genesis-prompt-bootstrap.service";

export interface EnvironmentGenesisCandidateDto {
  key: string;
  title: string;
  sourceSignal:
    | "world_lore"
    | "canonical_origin_home"
    | "region_climate"
    | "universe_calendar"
    | "character_concept"
    | "character_dna"
    | "child_interests"
    | "real_world_calendar"
    | "seeded_diversity";
  binding: {
    worldId?: string | null;
    regionId?: string | null;
    locationId?: string | null;
    homeId?: string | null;
  };
  regionProfile: {
    habitatType: string;
    terrain: string[];
    vegetation: string[];
    waterFeatures: string[];
    environmentalFeatures: string[];
    climate: {
      climateType: string;
      temperatureBand: string;
      precipitationBand: string;
      humidityBand?: string | null;
      seasonalVariation: "low" | "moderate" | "high" | "extreme";
    };
    loreConstraints: string[];
  };
  calendar: {
    calendarId: string;
    displayName: string;
    seasons: Array<{
      id: string;
      displayName: string;
      order: number;
      semantics: {
        temperatureTrend:
          | "strongly_decreasing"
          | "decreasing"
          | "stable"
          | "increasing"
          | "strongly_increasing";
        precipitationTrend:
          | "strongly_decreasing"
          | "decreasing"
          | "stable"
          | "increasing"
          | "strongly_increasing";
        daylightTrend:
          | "strongly_decreasing"
          | "decreasing"
          | "stable"
          | "increasing"
          | "strongly_increasing";
        vegetationPhase?: string | null;
      };
    }>;
  };
  temporal: {
    calendarId: string;
    seasonId: string;
    seasonPhase?: "early" | "mid" | "late" | "transition" | null;
    universeTimeMarker?: string | null;
    source:
      | "world_lore"
      | "universe_calendar"
      | "real_world_soft"
      | "seeded_default";
  };
  local: {
    weather?: string | null;
    dayPhase?: string | null;
    localConditions: string[];
    exceptions: Array<{
      sourceType: "world_lore" | "world_event" | "magic" | "story_consequence";
      sourceId?: string | null;
      explanation: string;
    }>;
  };
}

export interface GenerateEnvironmentGenesisOptions {
  modelOverride?: string | null;
  promptVersionOverride?: number;
  promptOverride?: OnboardingPromptOverride;
  localeOverride?: string;
  creationOverride?: {
    startDirection: "character_first";
    previousSelections: Record<string, unknown>;
  };
  recordTrace?: boolean;
}

export async function previewEnvironmentGenesisPrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateEnvironmentGenesisOptions = {},
) {
  await ensureEnvironmentGenesisPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    environmentGenesisSpec(),
    options,
  );
  return {
    promptKey: prepared.promptKey,
    promptVersion: prepared.promptVersion,
    renderedPrompt: {
      system: prepared.systemPrompt,
      user: prepared.userPrompt,
    },
    inputContext: prepared.inputContext,
    modelOverride: prepared.modelOverride,
  };
}

export async function generateEnvironmentGenesis(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateEnvironmentGenesisOptions = {},
) {
  await ensureEnvironmentGenesisPrompt();
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    environmentGenesisSpec(),
    options,
  );

  return {
    suggestions: result.suggestions,
    rawProviderOutput: result.generated.content,
    provenance: {
      modelId: result.modelId,
      promptKey: result.promptKey,
      promptVersion: result.promptVersion,
      promptTemplateSnapshot: {
        system: result.systemTemplate,
        user: result.userTemplate,
      },
      renderedPrompt: {
        system: result.systemPrompt,
        user: result.userPrompt,
      },
      finalProviderRequest: result.generated.requestSnapshot
        ? structuredClone(result.generated.requestSnapshot)
        : null,
      promptTokens: result.generated.promptTokens,
      completionTokens: result.generated.completionTokens,
      totalTokens: result.generated.totalTokens,
      latencyMs: result.generated.latencyMs,
      estimatedCostUsd:
        result.generated.cost === null
          ? null
          : result.generated.cost.estimatedCostUsdMicros / 1_000_000,
    },
  };
}

function environmentGenesisSpec(): OnboardingSuggestionGenerationSpec<EnvironmentGenesisCandidateDto> {
  return {
    promptKey: ENVIRONMENT_GENESIS_PROMPT_KEY,
    taskType: "character_genesis_environment",
    summaryGuard(summary) {
      if (
        !summary.characterIdentity ||
        !getSection(summary, "origin") ||
        !getSection(summary, "traits") ||
        !getSection(summary, "social") ||
        !getSection(summary, "inventory") ||
        !getSection(summary, "memoryAndThreads")
      ) {
        throw new Error("ENVIRONMENT_GENESIS_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getSection(summary, "origin") as object,
      characterTraits: getSection(summary, "traits") as object,
      characterSocial: getSection(summary, "social") as object,
      characterInventory: getSection(summary, "inventory") as object,
      characterMemoryThreads: getSection(summary, "memoryAndThreads") as object,
    }),
    pick: pickEnvironmentGenesis,
    maxAttempts: 3,
  };
}

function getSection(
  summary: Record<string, unknown>,
  key: "origin" | "traits" | "social" | "inventory" | "memoryAndThreads",
): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: Record<string, object | undefined> }
    | undefined;
  return genesis?.sections?.[key] ?? null;
}

function pickEnvironmentGenesis(
  validated: unknown,
): EnvironmentGenesisCandidateDto[] {
  const suggestions =
    pickSuggestionArray<EnvironmentGenesisCandidateDto>(validated);
  for (const suggestion of suggestions) {
    if (!suggestion.regionProfile?.habitatType?.trim()) {
      throw new Error("ENVIRONMENT_GENESIS_HABITAT_REQUIRED");
    }
    if (!suggestion.regionProfile?.climate?.climateType?.trim()) {
      throw new Error("ENVIRONMENT_GENESIS_CLIMATE_REQUIRED");
    }
    if (!suggestion.calendar?.seasons?.length) {
      throw new Error("ENVIRONMENT_GENESIS_SEASON_DEFINITION_REQUIRED");
    }
    if (!suggestion.temporal?.seasonId?.trim()) {
      throw new Error("ENVIRONMENT_GENESIS_ACTIVE_SEASON_REQUIRED");
    }
  }
  return suggestions;
}
