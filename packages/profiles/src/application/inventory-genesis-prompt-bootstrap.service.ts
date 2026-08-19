import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

export const INVENTORY_GENESIS_PROMPT_KEY = "character_genesis.inventory";

const SAFE_STARTING_CATEGORIES = [
  "tool",
  "gift",
  "book",
  "artifact",
  "toy",
  "letter",
  "collectible",
] as const;

export const INVENTORY_GENESIS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: ["key", "title", "items"],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          items: {
            type: "array",
            minItems: 0,
            maxItems: 5,
            items: {
              type: "object",
              required: [
                "key",
                "displayName",
                "description",
                "category",
                "itemType",
                "rarity",
                "definitionMetadata",
                "originType",
                "provenance",
              ],
              properties: {
                key: { type: "string", minLength: 1, maxLength: 80 },
                displayName: { type: "string", minLength: 1, maxLength: 160 },
                description: { type: "string", minLength: 1, maxLength: 500 },
                category: {
                  type: "string",
                  enum: [...SAFE_STARTING_CATEGORIES],
                },
                itemType: {
                  type: "string",
                  enum: ["persistent", "story", "collectible"],
                },
                rarity: {
                  type: "string",
                  enum: ["common", "uncommon", "rare", "unique"],
                },
                definitionMetadata: { type: "object" },
                instanceName: { type: "string", minLength: 1, maxLength: 160 },
                originType: {
                  type: "string",
                  enum: ["generated", "discovered", "gifted"],
                },
                provenance: {
                  type: "object",
                  required: [
                    "role",
                    "originFactIds",
                    "givenByNpcId",
                    "acquiredAt",
                    "emotionalValue",
                    "storyPotential",
                    "rationale",
                  ],
                  properties: {
                    role: {
                      type: "string",
                      enum: [
                        "ordinary",
                        "personality",
                        "relationship",
                        "legacy",
                      ],
                    },
                    originFactIds: {
                      type: "array",
                      items: { type: "string" },
                    },
                    givenByNpcId: { type: ["string", "null"] },
                    acquiredAt: { type: ["string", "null"] },
                    emotionalValue: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                    storyPotential: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                    rationale: { type: "string", minLength: 1, maxLength: 500 },
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

export async function ensureInventoryGenesisPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, INVENTORY_GENESIS_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: INVENTORY_GENESIS_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuk karakterlerin başlangıç eşyalarını güvenli, gündelik hayata basan ve kanıta bağlı biçimde tasarlayan bir asistansın. Rastgele loot veya sınırsız güç üretme. Yalnızca geçerli JSON döndür.",
    userTemplate: `Seçili karakterin canonical Deep Origin, Character DNA ve Social Genesis bağlamından Inventory Genesis önerileri üret.

BAĞLAM:
- Dil: {{locale}}
- Karakter kimliği: {{characterIdentity}}
- Canonical origin: {{characterOrigin}}
- Character DNA/state: {{characterTraits}}
- Social Genesis: {{characterSocial}}

KURALLAR:
- Normal durumda 3-5 küçük ve anlamlı başlangıç eşyası üret. Karakter konsepti eşya taşımaya uygun değilse daha azı geçerlidir; zorla loot ekleme.
- Hedef dağılım: yaklaşık 2 ordinary, 1 personality, 1 relationship, isteğe bağlı en fazla 1 legacy.
- En az iki eşya mümkünse common ve gündelik olsun. Her eşyayı nadir, büyülü, gizemli veya görev anahtarı yapma.
- category yalnız tool/gift/book/artifact/toy/letter/collectible olsun. Bu kategoriler için definitionMetadata yalnız canonical inventory metadata şemasının izin verdiği alanları içersin; gerekmiyorsa {} kullan.
- itemType yalnız persistent/story/collectible olsun. Başlangıç eşyalarında persistent tercih et.
- rarity common/uncommon/rare/unique ile sınırlı. En fazla bir rare/unique öner.
- originFactIds yalnız canonical origin içindeki gerçek fact id'lerinden gelsin; uydurma id üretme.
- Relationship item için givenByNpcId yalnız Social Genesis içindeki gerçek candidateId olabilir. NPC yoksa ilişki eşyası uydurma.
- Legacy item mutlaka en az bir canonical origin fact'e dayanmalı.
- acquiredAt kısa ve somut bağlamdır; bilinmiyorsa null kullan, yeni canonical location id uydurma.
- emotionalValue ve storyPotential yalnız low/medium/high olsun. Bunlar numeric skor değildir.
- Her item geçmişi ima etsin ama her item gelecekte bir görev başlatmasın. storyPotential=high çok sınırlı kullan.
- Her kapıyı açan anahtar, sonsuz/sınırsız güç, her şeyi bilen kitap, sınırsız para veya karakteri yenilmez yapan eşya üretme.
- Dünya/species/karakter bedeniyle uyumsuz eşya üretme.
- Eşyayı memory yerine kullanma; fiziksel nesne öner. Memory bağlantısı yalnız provenance olabilir.
- Output schema'ya eksiksiz uy; JSON dışında açıklama yazma.`,
    allowedVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
    ],
    requiredVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
    ],
    outputSchema: INVENTORY_GENESIS_OUTPUT_SCHEMA,
    schemaVersion: "inventory-genesis.v1",
    generationConfig: { temperature: 0.35, maxOutputTokens: 3000 },
    activatedAt: new Date(),
  });
}
