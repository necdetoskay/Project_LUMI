import { and, eq } from "drizzle-orm";
import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

const ORIGIN_PACKAGES_PROMPT_KEY = "character_onboarding.origin_packages";

const ORIGIN_PACKAGES_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["packages"],
  properties: {
    packages: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "broadKind",
          "characterType",
          "subtype",
          "originConcept",
          "startingRegionArchetype",
          "startingLocation",
          "homeArchetype",
          "nearbyNpcSeed",
          "firstMysterySeed",
          "toneVector",
          "noveltyMarkers",
        ],
        properties: {
          broadKind: {
            type: "string",
            enum: [
              "human",
              "animal",
              "fantasy",
              "robot",
              "sea_creature",
              "sky_creature",
            ],
          },
          characterType: { type: "string" },
          subtype: { type: "string", minLength: 1, maxLength: 80 },
          originConcept: { type: "string", minLength: 1, maxLength: 500 },
          startingRegionArchetype: { type: "string" },
          startingLocation: { type: "string" },
          homeArchetype: { type: "string" },
          nearbyNpcSeed: { type: "string" },
          firstMysterySeed: { type: "string" },
          toneVector: {
            type: "array",
            minItems: 1,
            items: {
              type: "string",
              enum: [
                "wonder",
                "warmth",
                "mystery",
                "humor",
                "courage",
                "curiosity",
              ],
            },
          },
          noveltyMarkers: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

export async function ensureOriginPackagesPrompt() {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, ORIGIN_PACKAGES_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: ORIGIN_PACKAGES_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuk hikayelerine uygun karakter köken paketleri üreten yaratıcı ve güvenli bir asistansın. Yalnızca geçerli JSON döndür.",
    userTemplate: `Çocuk için yaratıcı, güvenli ve yaşa uygun karakter başlangıç konseptleri üret.

Kısıtlamalar:
- Korku, şiddet ve yetişkin temaları yasaktır.
- Yaş grubu: {{ageBand}}.
- İçerik sınırı: {{contentBoundary}}.
- Ebeveyn AI onayı gerekiyor: {{requireParentApprovalForAi}}.
- Dil/locale: {{locale}}.
- Karakter tipi: {{characterType}}.
- Origin modu: {{originMode}}.
- Üretilecek paket sayısı: {{packageCount}}.
- Tercih ipuçları: {{preferenceHints}}.
- Seçilen arketip: {{selectedArchetype}}.
- Generation nonce: {{generationNonce}}.

Her öneri belirgin biçimde farklı olsun. Mümkün olduğunda farklı broadKind kullan. Output schema'ya tam olarak uy ve ek açıklama yazma.`,
    allowedVariables: [
      "ageBand",
      "contentBoundary",
      "requireParentApprovalForAi",
      "locale",
      "characterType",
      "originMode",
      "packageCount",
      "preferenceHints",
      "selectedArchetype",
      "generationNonce",
    ],
    requiredVariables: [
      "ageBand",
      "contentBoundary",
      "requireParentApprovalForAi",
      "locale",
      "characterType",
      "originMode",
      "packageCount",
      "generationNonce",
    ],
    outputSchema: ORIGIN_PACKAGES_OUTPUT_SCHEMA,
    schemaVersion: "v1",
    generationConfig: { temperature: 0.85, maxTokens: 2200 },
    activatedAt: new Date(),
  });
}
