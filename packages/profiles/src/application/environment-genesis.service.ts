import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";
import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";

export const ENVIRONMENT_GENESIS_PROMPT_KEY = "character_genesis.environment";

export const ENVIRONMENT_REGION_TYPES = [
  "wilderness",
  "settlement",
  "water",
  "mountain",
  "forest",
  "sky",
  "underground",
  "magical",
  "urban",
  "coastal",
  "island",
  "custom",
] as const;

export const ENVIRONMENT_TEMPERATURE_BANDS = [
  "freezing",
  "cold",
  "cool",
  "temperate",
  "warm",
  "hot",
] as const;
export const ENVIRONMENT_MOISTURE_BANDS = [
  "arid",
  "dry",
  "balanced",
  "humid",
  "wet",
] as const;
export const ENVIRONMENT_PRECIPITATION_BANDS = [
  "rare",
  "low",
  "seasonal",
  "regular",
  "heavy",
] as const;
export const ENVIRONMENT_THERMAL_SHIFTS = [
  "much_colder",
  "colder",
  "neutral",
  "warmer",
  "much_warmer",
] as const;
export const ENVIRONMENT_MOISTURE_SHIFTS = [
  "much_drier",
  "drier",
  "neutral",
  "wetter",
  "much_wetter",
] as const;
export const ENVIRONMENT_DAYLIGHT_SHIFTS = [
  "much_shorter",
  "shorter",
  "neutral",
  "longer",
  "much_longer",
] as const;
export const ENVIRONMENT_WEATHER_CONDITIONS = [
  "clear",
  "cloudy",
  "drizzle",
  "rain",
  "snow",
  "sleet",
  "storm",
  "fog",
  "wind",
  "heat",
  "custom",
] as const;
export const ENVIRONMENT_WEATHER_INTENSITIES = [
  "light",
  "moderate",
  "strong",
] as const;
export const ENVIRONMENT_DAY_PHASES = [
  "dawn",
  "morning",
  "noon",
  "afternoon",
  "evening",
  "dusk",
  "night",
] as const;
export const ENVIRONMENT_HABITAT_SOURCES = [
  "world_lore",
  "region_climate",
  "character_concept",
] as const;
export const ENVIRONMENT_CLIMATE_SOURCES = [
  "world_lore",
  "region_climate",
  "character_concept",
] as const;
export const ENVIRONMENT_SEASON_SOURCES = [
  "world_lore",
  "region_climate",
  "universe_calendar",
  "real_world_soft_hint",
] as const;
export const ENVIRONMENT_LORE_EXCEPTION_KINDS = [
  "season_climate",
  "weather_temperature",
  "weather_precipitation",
] as const;

export interface EnvironmentGenesisSuggestion {
  key: string;
  title: string;
  habitat: {
    key: string;
    displayName: string;
    regionType: (typeof ENVIRONMENT_REGION_TYPES)[number];
    tags: string[];
    source: (typeof ENVIRONMENT_HABITAT_SOURCES)[number];
    sourceRefs: string[];
    rationale: string;
  };
  climate: {
    temperatureBand: (typeof ENVIRONMENT_TEMPERATURE_BANDS)[number];
    moistureBand: (typeof ENVIRONMENT_MOISTURE_BANDS)[number];
    precipitationBand: (typeof ENVIRONMENT_PRECIPITATION_BANDS)[number];
    source: (typeof ENVIRONMENT_CLIMATE_SOURCES)[number];
    sourceRefs: string[];
    rationale: string;
  };
  season: {
    key: string;
    displayName: string;
    thermalShift: (typeof ENVIRONMENT_THERMAL_SHIFTS)[number];
    moistureShift: (typeof ENVIRONMENT_MOISTURE_SHIFTS)[number];
    daylightShift: (typeof ENVIRONMENT_DAYLIGHT_SHIFTS)[number];
    source: (typeof ENVIRONMENT_SEASON_SOURCES)[number];
    sourceRefs: string[];
    rationale: string;
  };
  weather: {
    condition: (typeof ENVIRONMENT_WEATHER_CONDITIONS)[number];
    intensity: (typeof ENVIRONMENT_WEATHER_INTENSITIES)[number];
    customLabel?: string;
    rationale: string;
  };
  dayPhase: (typeof ENVIRONMENT_DAY_PHASES)[number];
  loreExceptions: Array<{
    kind: (typeof ENVIRONMENT_LORE_EXCEPTION_KINDS)[number];
    reason: string;
    sourceRefs: string[];
  }>;
}

export interface EnvironmentGenesisSuggestionValidation {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
}

export interface GenerateEnvironmentGenesisOptions {
  modelOverride?: string | null;
  promptVersionOverride?: number;
  promptOverride?: OnboardingPromptOverride;
  localeOverride?: string;
  initialSeasonHint?: string | null;
  realWorldDateHint?: string | null;
  creationOverride?: {
    startDirection: "character_first";
    previousSelections: Record<string, unknown>;
  };
  recordTrace?: boolean;
}

export const ENVIRONMENT_GENESIS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: [
          "key",
          "title",
          "habitat",
          "climate",
          "season",
          "weather",
          "dayPhase",
          "loreExceptions",
        ],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          habitat: {
            type: "object",
            required: [
              "key",
              "displayName",
              "regionType",
              "tags",
              "source",
              "sourceRefs",
              "rationale",
            ],
            properties: {
              key: { type: "string", minLength: 1, maxLength: 80 },
              displayName: { type: "string", minLength: 1, maxLength: 160 },
              regionType: { type: "string", enum: [...ENVIRONMENT_REGION_TYPES] },
              tags: stringArraySchema(),
              source: { type: "string", enum: [...ENVIRONMENT_HABITAT_SOURCES] },
              sourceRefs: stringArraySchema(),
              rationale: { type: "string", minLength: 1, maxLength: 600 },
            },
          },
          climate: {
            type: "object",
            required: [
              "temperatureBand",
              "moistureBand",
              "precipitationBand",
              "source",
              "sourceRefs",
              "rationale",
            ],
            properties: {
              temperatureBand: {
                type: "string",
                enum: [...ENVIRONMENT_TEMPERATURE_BANDS],
              },
              moistureBand: {
                type: "string",
                enum: [...ENVIRONMENT_MOISTURE_BANDS],
              },
              precipitationBand: {
                type: "string",
                enum: [...ENVIRONMENT_PRECIPITATION_BANDS],
              },
              source: { type: "string", enum: [...ENVIRONMENT_CLIMATE_SOURCES] },
              sourceRefs: stringArraySchema(),
              rationale: { type: "string", minLength: 1, maxLength: 600 },
            },
          },
          season: {
            type: "object",
            required: [
              "key",
              "displayName",
              "thermalShift",
              "moistureShift",
              "daylightShift",
              "source",
              "sourceRefs",
              "rationale",
            ],
            properties: {
              key: { type: "string", minLength: 1, maxLength: 80 },
              displayName: { type: "string", minLength: 1, maxLength: 160 },
              thermalShift: {
                type: "string",
                enum: [...ENVIRONMENT_THERMAL_SHIFTS],
              },
              moistureShift: {
                type: "string",
                enum: [...ENVIRONMENT_MOISTURE_SHIFTS],
              },
              daylightShift: {
                type: "string",
                enum: [...ENVIRONMENT_DAYLIGHT_SHIFTS],
              },
              source: { type: "string", enum: [...ENVIRONMENT_SEASON_SOURCES] },
              sourceRefs: stringArraySchema(),
              rationale: { type: "string", minLength: 1, maxLength: 600 },
            },
          },
          weather: {
            type: "object",
            required: ["condition", "intensity", "rationale"],
            properties: {
              condition: {
                type: "string",
                enum: [...ENVIRONMENT_WEATHER_CONDITIONS],
              },
              intensity: {
                type: "string",
                enum: [...ENVIRONMENT_WEATHER_INTENSITIES],
              },
              customLabel: { type: "string", minLength: 1, maxLength: 120 },
              rationale: { type: "string", minLength: 1, maxLength: 600 },
            },
          },
          dayPhase: { type: "string", enum: [...ENVIRONMENT_DAY_PHASES] },
          loreExceptions: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              required: ["kind", "reason", "sourceRefs"],
              properties: {
                kind: {
                  type: "string",
                  enum: [...ENVIRONMENT_LORE_EXCEPTION_KINDS],
                },
                reason: { type: "string", minLength: 1, maxLength: 600 },
                sourceRefs: stringArraySchema(),
              },
            },
          },
        },
      },
    },
  },
};

function stringArraySchema() {
  return { type: "array", items: { type: "string" } };
}

export async function ensureEnvironmentGenesisPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, ENVIRONMENT_GENESIS_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: ENVIRONMENT_GENESIS_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için karakterin kalıcı yaşam alanını, uzun vadeli iklimini ve kısa ömürlü çevre durumunu birbirine karıştırmadan üreten bir Character Genesis asistansın. Dünya lore'u ve canonical bağlam her zaman gerçek dünya takviminden üstündür. JSON dışında açıklama döndürme.",
    userTemplate: `Seçili karakter için Habitat + Climate + Season + Initial World State üret.\n\nBAĞLAM:\n- Dil: {{locale}}\n- Karakter kimliği: {{characterIdentity}}\n- Deep Origin: {{characterOrigin}}\n- Character DNA/state: {{characterTraits}}\n- Social Genesis: {{characterSocial}}\n- Inventory Genesis: {{characterInventory}}\n- Memory Seeds / Origin Threads: {{characterMemoryThreads}}\n- Dünya bağlamı: {{worldContext}}\n- Test/Universe başlangıç season hint: {{initialSeasonHint}}\n- Gerçek dünya tarih hint'i: {{realWorldDateHint}}\n\nKURALLAR:\n- habitat kalıcı yaşam çevresidir; season veya weather değişti diye habitat/region/home değişmez.\n- climate uzun vadeli bölge semantiğidir. temperatureBand, moistureBand ve precipitationBand ayrı verilsin. Numeric iklim skoru üretme.\n- season ayrı canonical state'tir. Fantasy dünyalarda Bahar/Yaz/Kış kullanmak zorunlu değildir; örneğin Ayçiçeği Mevsimi gibi özel isim kullanılabilir. Fakat thermalShift, moistureShift ve daylightShift ile semantik mapping mutlaka verilsin.\n- weather ve dayPhase kısa ömürlü initial koşuldur; climate veya habitat yerine kullanma.\n- Öncelik kesin: world_lore > region_climate > universe_calendar > real_world_soft_hint. Gerçek tarih sadece soft initialization hint'tir; lore'u asla override edemez.\n- initialSeasonHint bir universe-calendar ipucudur, emir değildir. Dünya lore'u veya bölge iklimi ile çelişiyorsa daha yüksek öncelikli kaynak kazanır.\n- world_lore veya region_climate kaynaklı bir değer için bağlamdaki gerçek sourceRef/id/key değerlerini sourceRefs'e koy. Uydurma ref üretme. Kanıt yoksa character_concept veya daha düşük uygun source kullan.\n- Karakter konseptine biyolojik/fiziksel olarak mantıklı habitat seç; ama canonical dünya bağlamı varsa onu değiştirme.\n- İmkânsız climate/season/weather kombinasyonu üretme. Lore istisnası gerekiyorsa loreExceptions içine açık reason ve gerçek sourceRefs ekle; kanıtsız istisna uydurma.\n- 5-10 yaş grubu için güvenli, anlaşılır ve hikâye açısından verimli bir başlangıç çevresi üret.\n- Output schema'ya tam uy ve yalnız JSON döndür.`,
    allowedVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
      "characterMemoryThreads",
      "worldContext",
      "initialSeasonHint",
      "realWorldDateHint",
    ],
    requiredVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
      "characterMemoryThreads",
      "worldContext",
      "initialSeasonHint",
      "realWorldDateHint",
    ],
    outputSchema: ENVIRONMENT_GENESIS_OUTPUT_SCHEMA,
    schemaVersion: "environment-genesis.v1",
    generationConfig: { temperature: 0.25, maxOutputTokens: 3200 },
    activatedAt: new Date(),
  });
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
    environmentGenesisSpec(options),
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
    environmentGenesisSpec(options),
    options,
  );
  return {
    suggestions: result.suggestions,
    validation: result.suggestions.map(validateEnvironmentGenesisSuggestion),
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

function environmentGenesisSpec(
  options: GenerateEnvironmentGenesisOptions,
): OnboardingSuggestionGenerationSpec<EnvironmentGenesisSuggestion> {
  return {
    promptKey: ENVIRONMENT_GENESIS_PROMPT_KEY,
    taskType: "character_genesis_environment",
    summaryGuard(summary) {
      if (!summary.characterIdentity || !getSection(summary, "origin")) {
        throw new Error("ENVIRONMENT_GENESIS_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getSection(summary, "origin") ?? {},
      characterTraits: getSection(summary, "traits") ?? {},
      characterSocial: getSection(summary, "social") ?? {},
      characterInventory: getSection(summary, "inventory") ?? {},
      characterMemoryThreads: getSection(summary, "memoryAndThreads") ?? {},
      worldContext: readWorldContext(summary),
      initialSeasonHint: options.initialSeasonHint?.trim() || "none",
      realWorldDateHint: options.realWorldDateHint?.trim() || "none",
    }),
    pick: pickValidatedEnvironmentGenesis,
    maxAttempts: 3,
  };
}

function getSection(
  summary: Record<string, unknown>,
  key:
    | "origin"
    | "traits"
    | "social"
    | "inventory"
    | "memoryAndThreads"
    | "environment",
): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: Record<string, object | undefined> }
    | undefined;
  return genesis?.sections?.[key] ?? null;
}

function readWorldContext(summary: Record<string, unknown>): object {
  return {
    worldFeeling: summary.worldFeeling ?? null,
    worldCharacterSuggestion: summary.worldCharacterSuggestion ?? null,
    selectedWorld: summary.selectedWorld ?? summary.worldSelection ?? null,
    existingEnvironment: getSection(summary, "environment"),
  };
}

function pickValidatedEnvironmentGenesis(
  validated: unknown,
): EnvironmentGenesisSuggestion[] {
  const suggestions = pickSuggestionArray<EnvironmentGenesisSuggestion>(validated);
  for (const suggestion of suggestions) {
    const validation = validateEnvironmentGenesisSuggestion(suggestion);
    if (!validation.valid) {
      const codes = validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`ENVIRONMENT_GENESIS_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateEnvironmentGenesisSuggestion(
  suggestion: EnvironmentGenesisSuggestion,
): EnvironmentGenesisSuggestionValidation {
  const issues: EnvironmentGenesisSuggestionValidation["issues"] = [];

  if (!suggestion.key.trim() || !suggestion.habitat.key.trim()) {
    issues.push({
      code: "ENVIRONMENT_GENESIS_IDENTITY_REQUIRED",
      message: "Candidate and habitat keys must be non-empty",
      severity: "error",
    });
  }
  if (
    suggestion.habitat.source !== "character_concept" &&
    suggestion.habitat.sourceRefs.length === 0
  ) {
    issues.push({
      code: "ENVIRONMENT_GENESIS_HABITAT_SOURCE_REQUIRED",
      message: "Canonical habitat sources require evidence refs",
      severity: "error",
    });
  }
  if (
    suggestion.climate.source !== "character_concept" &&
    suggestion.climate.sourceRefs.length === 0
  ) {
    issues.push({
      code: "ENVIRONMENT_GENESIS_CLIMATE_SOURCE_REQUIRED",
      message: "Canonical climate sources require evidence refs",
      severity: "error",
    });
  }
  if (
    ["world_lore", "region_climate"].includes(suggestion.season.source) &&
    suggestion.season.sourceRefs.length === 0
  ) {
    issues.push({
      code: "ENVIRONMENT_GENESIS_SEASON_SOURCE_REQUIRED",
      message: "Lore/region season sources require evidence refs",
      severity: "error",
    });
  }
  if (
    suggestion.weather.condition === "custom" &&
    !suggestion.weather.customLabel?.trim()
  ) {
    issues.push({
      code: "ENVIRONMENT_GENESIS_CUSTOM_WEATHER_LABEL_REQUIRED",
      message: "Custom weather requires a display label",
      severity: "error",
    });
  }

  for (const exception of suggestion.loreExceptions) {
    if (!exception.reason.trim() || exception.sourceRefs.length === 0) {
      issues.push({
        code: "ENVIRONMENT_GENESIS_UNGROUNDED_LORE_EXCEPTION",
        message: `${exception.kind} must cite explicit lore evidence`,
        severity: "error",
      });
    }
  }

  if (suggestion.season.source === "real_world_soft_hint") {
    issues.push({
      code: "ENVIRONMENT_GENESIS_REAL_WORLD_SOFT_ONLY",
      message:
        "Real-world date is only a soft initializer and must lose to canonical lore/calendar sources",
      severity: "warning",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
