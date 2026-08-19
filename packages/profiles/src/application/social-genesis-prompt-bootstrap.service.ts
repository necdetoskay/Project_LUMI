import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

export const SOCIAL_GENESIS_PROMPT_KEY = "character_genesis.social";

export const SOCIAL_GENESIS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: ["key", "title", "characterIdentityKey", "npcs", "relationships"],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          characterIdentityKey: { type: "string", minLength: 1, maxLength: 120 },
          npcs: {
            type: "array",
            maxItems: 6,
            items: {
              type: "object",
              required: [
                "identityKey",
                "displayName",
                "role",
                "source",
                "originFactIds",
                "personality",
              ],
              properties: {
                identityKey: { type: "string", minLength: 1, maxLength: 120 },
                displayName: { type: "string", minLength: 1, maxLength: 120 },
                role: {
                  type: "string",
                  enum: [
                    "caregiver",
                    "family",
                    "friend",
                    "rival",
                    "mentor",
                    "neighbor",
                    "community",
                    "acquaintance",
                  ],
                },
                source: { type: "string", enum: ["origin", "derived"] },
                originFactIds: {
                  type: "array",
                  items: { type: "string" },
                },
                aliases: {
                  type: "array",
                  items: { type: "string" },
                },
                personality: {
                  type: "object",
                  required: ["traits", "interactionStyle", "futureInteractionPotential"],
                  properties: {
                    traits: {
                      type: "array",
                      minItems: 1,
                      maxItems: 5,
                      items: { type: "string" },
                    },
                    interactionStyle: {
                      type: "string",
                      minLength: 1,
                      maxLength: 240,
                    },
                    futureInteractionPotential: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                  },
                },
              },
            },
          },
          relationships: {
            type: "array",
            maxItems: 72,
            items: {
              type: "object",
              required: [
                "fromIdentityKey",
                "toIdentityKey",
                "dimension",
                "direction",
                "strength",
                "sourceFactIds",
                "rationale",
              ],
              properties: {
                fromIdentityKey: { type: "string", minLength: 1, maxLength: 120 },
                toIdentityKey: { type: "string", minLength: 1, maxLength: 120 },
                dimension: {
                  type: "string",
                  enum: [
                    "trust",
                    "affection",
                    "familiarity",
                    "respect",
                    "tension",
                    "dependence",
                  ],
                },
                direction: {
                  type: "string",
                  enum: ["low", "neutral", "high"],
                },
                strength: {
                  type: "string",
                  enum: ["weak", "moderate", "strong"],
                },
                sourceFactIds: {
                  type: "array",
                  items: { type: "string" },
                },
                rationale: { type: "string", minLength: 1, maxLength: 500 },
              },
            },
          },
        },
      },
    },
  },
};

export async function ensureSocialGenesisPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, SOCIAL_GENESIS_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: SOCIAL_GENESIS_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuk karakterlerin başlangıç sosyal çevresini güvenli, ayırt edilebilir ve kanıta bağlı biçimde tasarlayan bir asistansın. Numeric relationship değeri üretme. Yalnızca geçerli JSON döndür.",
    userTemplate: `Seçili karakter, canonical Deep Origin ve Character DNA bağlamından Social Genesis önerileri üret.

BAĞLAM:
- Dil: {{locale}}
- Karakter kimliği: {{characterIdentity}}
- Canonical origin: {{characterOrigin}}
- Character DNA/state: {{characterTraits}}

KURALLAR:
- Uygunsa 3-6 anlamlı başlangıç NPC'si üret. Karakter konsepti doğal olarak izoleyse 0-2 NPC de geçerlidir; zorla aile/arkadaş ekleme.
- Roller caregiver/family/friend/rival/mentor/neighbor/community/acquaintance ile sınırlı olsun.
- role ilişki kalitesini belirlemez. Örneğin family otomatik yüksek trust/affection demek değildir.
- Origin'de açıkça bulunan kişileri source=origin olarak taşı ve sourceFactIds ile kanıtla.
- Yeni ama bağlama uygun sosyal kişi gerekiyorsa source=derived kullan. Derived NPC'yi origin'de varmış gibi gösterme.
- Aynı kişiyi farklı isimlerle tekrar üretme. Aynı kişi için aynı identityKey kullan; aliases alanına alternatif adları koy.
- Her NPC için hafif personality profile üret: kısa traits, interactionStyle ve futureInteractionPotential.
- Relationship graph yönlüdür. A->B ile B->A farklı olabilir; gerekliyse her yön için ayrı evidence üret.
- Numeric trust/affection/familiarity/respect/tension/dependence değeri ÜRETME. Her dimension için direction yalnız low/neutral/high, strength yalnız weak/moderate/strong olsun.
- Relationship evidence somut gerekçeye dayanmalı. Origin-backed evidence sourceFactIds ile canonical fact id'lerine bağlansın.
- Derived sosyal gözlem yalnız gerçekten origin fact'i gerektirmiyorsa sourceFactIds boş olabilir; rationale bunu açıkça belirtmeli.
- Büyük nüfus oluşturma. Latent community yalnız role=community ile hafif temsil edilsin; onlarca kişi üretme.
- Çocuğa uygun olmayan yetişkin ilişki temaları, klinik etiketler veya ağır sosyal çatışma üretme.
- Distinctiveness: NPC'ler birbirinin kopyası olmasın.
- Coherence: NPC ve relationship'ler character identity/origin/DNA ile çelişmesin.
- Future interaction potential: en az birkaç NPC gelecekte doğal hikâye fırsatı taşısın ama her NPC'yi görev dağıtıcısına çevirme.
- Output schema'ya eksiksiz uy; JSON dışında açıklama yazma.`,
    allowedVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
    ],
    requiredVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
    ],
    outputSchema: SOCIAL_GENESIS_OUTPUT_SCHEMA,
    schemaVersion: "social-genesis.v1",
    generationConfig: { temperature: 0.4, maxOutputTokens: 3600 },
    activatedAt: new Date(),
  });
}
