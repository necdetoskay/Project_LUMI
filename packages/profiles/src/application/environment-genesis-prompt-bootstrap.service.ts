import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

export const ENVIRONMENT_GENESIS_PROMPT_KEY = "character_genesis.environment";

const TREND_ENUM = [
  "strongly_decreasing",
  "decreasing",
  "stable",
  "increasing",
  "strongly_increasing",
] as const;

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
          "binding",
          "regionProfile",
          "calendar",
          "temporal",
          "local",
          "sourceSignal",
        ],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 160 },
          sourceSignal: {
            type: "string",
            enum: [
              "world_lore",
              "canonical_origin_home",
              "region_climate",
              "universe_calendar",
              "character_concept",
              "character_dna",
              "child_interests",
              "real_world_calendar",
              "seeded_diversity",
            ],
          },
          binding: {
            type: "object",
            properties: {
              worldId: { type: ["string", "null"] },
              regionId: { type: ["string", "null"] },
              locationId: { type: ["string", "null"] },
              homeId: { type: ["string", "null"] },
            },
          },
          regionProfile: {
            type: "object",
            required: [
              "habitatType",
              "terrain",
              "vegetation",
              "waterFeatures",
              "environmentalFeatures",
              "climate",
              "loreConstraints",
            ],
            properties: {
              habitatType: { type: "string", minLength: 1, maxLength: 160 },
              terrain: {
                type: "array",
                items: { type: "string" },
                maxItems: 8,
              },
              vegetation: {
                type: "array",
                items: { type: "string" },
                maxItems: 8,
              },
              waterFeatures: {
                type: "array",
                items: { type: "string" },
                maxItems: 8,
              },
              environmentalFeatures: {
                type: "array",
                items: { type: "string" },
                maxItems: 10,
              },
              loreConstraints: {
                type: "array",
                items: { type: "string" },
                maxItems: 10,
              },
              climate: {
                type: "object",
                required: [
                  "climateType",
                  "temperatureBand",
                  "precipitationBand",
                  "seasonalVariation",
                ],
                properties: {
                  climateType: { type: "string", minLength: 1, maxLength: 120 },
                  temperatureBand: {
                    type: "string",
                    minLength: 1,
                    maxLength: 80,
                  },
                  precipitationBand: {
                    type: "string",
                    minLength: 1,
                    maxLength: 80,
                  },
                  humidityBand: { type: ["string", "null"] },
                  seasonalVariation: {
                    type: "string",
                    enum: ["low", "moderate", "high", "extreme"],
                  },
                },
              },
            },
          },
          calendar: {
            type: "object",
            required: ["calendarId", "displayName", "seasons"],
            properties: {
              calendarId: { type: "string", minLength: 1, maxLength: 120 },
              displayName: { type: "string", minLength: 1, maxLength: 160 },
              seasons: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: {
                  type: "object",
                  required: ["id", "displayName", "order", "semantics"],
                  properties: {
                    id: { type: "string", minLength: 1, maxLength: 100 },
                    displayName: {
                      type: "string",
                      minLength: 1,
                      maxLength: 120,
                    },
                    order: { type: "integer", minimum: 0, maximum: 99 },
                    semantics: {
                      type: "object",
                      required: [
                        "temperatureTrend",
                        "precipitationTrend",
                        "daylightTrend",
                      ],
                      properties: {
                        temperatureTrend: {
                          type: "string",
                          enum: [...TREND_ENUM],
                        },
                        precipitationTrend: {
                          type: "string",
                          enum: [...TREND_ENUM],
                        },
                        daylightTrend: {
                          type: "string",
                          enum: [...TREND_ENUM],
                        },
                        vegetationPhase: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
          temporal: {
            type: "object",
            required: ["calendarId", "seasonId", "source"],
            properties: {
              calendarId: { type: "string" },
              seasonId: { type: "string" },
              seasonPhase: {
                type: ["string", "null"],
                enum: ["early", "mid", "late", "transition", null],
              },
              universeTimeMarker: { type: ["string", "null"] },
              source: {
                type: "string",
                enum: [
                  "world_lore",
                  "universe_calendar",
                  "real_world_soft",
                  "seeded_default",
                ],
              },
            },
          },
          local: {
            type: "object",
            required: ["localConditions", "exceptions"],
            properties: {
              weather: { type: ["string", "null"] },
              dayPhase: { type: ["string", "null"] },
              localConditions: {
                type: "array",
                items: { type: "string" },
                maxItems: 10,
              },
              exceptions: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  required: ["sourceType", "explanation"],
                  properties: {
                    sourceType: {
                      type: "string",
                      enum: [
                        "world_lore",
                        "world_event",
                        "magic",
                        "story_consequence",
                      ],
                    },
                    sourceId: { type: ["string", "null"] },
                    explanation: {
                      type: "string",
                      minLength: 1,
                      maxLength: 500,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

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
      "Sen Project LUMI için çocuk karakterlerin ilk hikaye öncesi çevresel durumunu tasarlayan bir asistansın. Kalıcı habitat/iklim ile geçici mevsim/hava durumunu karıştırma. Canonical origin ve dünya gerçeklerini bozma. Yalnızca geçerli JSON döndür.",
    userTemplate: `Seçili karakter için Initial World / Season State adayları üret.

BAĞLAM:
- Dil: {{locale}}
- Karakter kimliği: {{characterIdentity}}
- Canonical origin: {{characterOrigin}}
- Character DNA/state: {{characterTraits}}
- Social Genesis: {{characterSocial}}
- Inventory Genesis: {{characterInventory}}
- Memory / Origin Threads: {{characterMemoryThreads}}

ÖNCELİK VE KURALLAR:
- World lore ve canonical origin/home gerçeklerini koru. DNA ve çocuk ilgi alanları sadece soft uyumluluk sinyalidir.
- Habitat ve climate yavaş değişen gerçeklerdir; season, weather, dayPhase ve localConditions ayrı state olarak üret.
- Dünya özel/fantastik sezonlar kullanabilir. Böyle bir sezon için displayName yanında temperatureTrend, precipitationTrend, daylightTrend ve gerekiyorsa vegetationPhase üret.
- Gerçek dünya takvimi yalnız en düşük öncelikli soft başlangıç sinyalidir. Dünya lore'unu veya fantasy calendar'ı override etmez.
- Tropical iklimde heavy snow/blizzard gibi sıra dışı bir durum üretirsen exceptions içinde world_lore/world_event/magic/story_consequence provenance ve açıklama zorunludur.
- Canonical ID bilmiyorsan yeni worldId/regionId/locationId/homeId uydurma; null bırak. ID'ler commit aşamasında canonical materializer tarafından bağlanabilir.
- Origin belirli bir liman/şehir/orman/ev gerçekliği kurmuşsa habitat bunu sessizce değiştiremez.
- sourceSignal adayın asıl dayandığı yüksek öncelikli sinyali ifade etsin.
- Full story, quest veya Story Opportunity üretme. Sadece başlangıç environment state üret.
- JSON dışında açıklama yazma.`,
    allowedVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
      "characterMemoryThreads",
    ],
    requiredVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
      "characterMemoryThreads",
    ],
    outputSchema: ENVIRONMENT_GENESIS_OUTPUT_SCHEMA,
    schemaVersion: "environment-genesis.v1",
    generationConfig: { temperature: 0.25, maxOutputTokens: 4200 },
    activatedAt: new Date(),
  });
}
