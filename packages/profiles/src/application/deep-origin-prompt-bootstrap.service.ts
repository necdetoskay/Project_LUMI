import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

export const DEEP_CHARACTER_ORIGIN_PROMPT_KEY = "character_genesis.deep_origin";

const VISIBILITY_VALUES = [
  "user_visible",
  "known_to_character",
  "known_to_family",
  "known_to_npc",
  "unknown_to_character",
  "system_only",
];

export const DEEP_CHARACTER_ORIGIN_OUTPUT_SCHEMA: Record<string, unknown> = {
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
          "summary",
          "narrative",
          "facts",
          "summaryFactIds",
          "unresolvedQuestions",
          "storyHooks",
        ],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          summary: { type: "string", minLength: 20, maxLength: 900 },
          narrative: { type: "string", minLength: 200, maxLength: 6000 },
          facts: {
            type: "array",
            minItems: 4,
            maxItems: 16,
            items: {
              type: "object",
              required: ["id", "kind", "summary", "visibility"],
              properties: {
                id: { type: "string", minLength: 1, maxLength: 100 },
                kind: {
                  type: "string",
                  enum: [
                    "person",
                    "place",
                    "event",
                    "skill",
                    "preference",
                    "possession",
                    "relationship",
                    "secret",
                    "belief",
                    "habit",
                  ],
                },
                summary: { type: "string", minLength: 1, maxLength: 500 },
                visibility: { type: "string", enum: VISIBILITY_VALUES },
                sourceRef: { type: "string", maxLength: 160 },
              },
            },
          },
          summaryFactIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          unresolvedQuestions: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              required: ["id", "summary", "visibility", "relatedFactIds"],
              properties: {
                id: { type: "string", minLength: 1, maxLength: 100 },
                summary: { type: "string", minLength: 1, maxLength: 500 },
                visibility: { type: "string", enum: VISIBILITY_VALUES },
                relatedFactIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
              },
            },
          },
          storyHooks: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: {
              type: "object",
              required: ["id", "summary", "relatedFactIds", "potential"],
              properties: {
                id: { type: "string", minLength: 1, maxLength: 100 },
                summary: { type: "string", minLength: 1, maxLength: 500 },
                relatedFactIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
                potential: { type: "number", minimum: 0, maximum: 1 },
              },
            },
          },
        },
      },
    },
  },
};

export async function ensureDeepCharacterOriginPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, DEEP_CHARACTER_ORIGIN_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: DEEP_CHARACTER_ORIGIN_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuklara uygun, sıcak, tutarlı ve uzun vadede hikaye üretebilen karakter geçmişleri tasarlayan yaratıcı bir asistansın. Yalnızca geçerli JSON döndür.",
    userTemplate: `Seçili karakter için ilk hikayeden ÖNCE yaşanmış, dünya ile tutarlı bir canonical origin üret.

BAĞLAM:
- Dil: {{locale}}
- Karakter tipi: {{characterType}}
- Karakter kimliği: {{characterIdentity}}
- Dünya: {{world}}
- Bölge: {{region}}

KURALLAR:
- Normal bir karakterde yeterli malzeme varsa deep narrative yaklaşık 300-500 kelime derinliğinde olabilir; bunu katı kelime hedefi yapma, metni doldurma veya sırf limite uymak için kesme.
- summary ve narrative aynı canonical facts kümesinden türemeli; birbiriyle çelişmemeli.
- facts bağımsız olarak geri çağrılabilecek kadar atomik ve anlamlı olsun.
- Önemli kişiler, yerler, geçmiş olaylar, beceriler, tercihler ve eşyalar yalnız gerçekten uygunsa yer alsın; her kategoriyi zorla doldurma.
- En az bir anlamlı unresolved question bırak. Her şeyi açıklama.
- storyHooks geçmişteki gerçek fact'lerden doğsun; rastgele gizem ekleme.
- summaryFactIds yalnız user_visible veya known_to_character fact'lere referans versin. unknown_to_character ve system_only bilgiler operational summary'ye SIZMASIN.
- narrative canonical/omniscient kayıt olabilir; fakat gizli bilgiyi karakterin bildiği gibi yazma.
- Gereksiz travma, yetimlik, şiddet, yetişkin temaları veya karanlık kader kullanma. Yaşa uygun, sıcak ve güvenli kal.
- Seçilen dünya, bölge, tür ve karakter kimliğiyle çelişme.
- Her suggestion farklı ama eşit derecede tutarlı bir geçmiş alternatifi olsun.
- Output schema'ya eksiksiz uy; JSON dışında açıklama yazma.`,
    allowedVariables: [
      "locale",
      "characterType",
      "characterIdentity",
      "world",
      "region",
    ],
    requiredVariables: ["locale", "characterIdentity", "world", "region"],
    outputSchema: DEEP_CHARACTER_ORIGIN_OUTPUT_SCHEMA,
    schemaVersion: "deep-origin.v1",
    generationConfig: { temperature: 0.8, maxTokens: 4200 },
    activatedAt: new Date(),
  });
}
