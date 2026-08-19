import { and, eq } from "drizzle-orm";

import { aiPromptVersions } from "../db/schema/profile";
import { getProfileDb } from "./db";

export const CHARACTER_DNA_PROMPT_KEY = "character_genesis.character_dna";

export const CHARACTER_DNA_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: ["key", "title", "evidence", "contextual"],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 22,
            items: {
              type: "object",
              required: [
                "axis",
                "direction",
                "strength",
                "sourceFactIds",
                "rationale",
              ],
              properties: {
                axis: {
                  type: "string",
                  enum: [
                    "curiosity",
                    "courage",
                    "empathy",
                    "sociability",
                    "patience",
                    "imagination",
                    "persistence",
                    "independence",
                    "playfulness",
                    "caution",
                    "adaptability",
                  ],
                },
                direction: { type: "string", enum: ["low", "neutral", "high"] },
                strength: {
                  type: "string",
                  enum: ["weak", "moderate", "strong"],
                },
                sourceFactIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
                rationale: { type: "string", minLength: 1, maxLength: 500 },
              },
            },
          },
          contextual: {
            type: "array",
            maxItems: 8,
            items: {
              type: "object",
              required: [
                "id",
                "kind",
                "context",
                "intensity",
                "sourceFactIds",
              ],
              properties: {
                id: { type: "string", minLength: 1, maxLength: 100 },
                kind: {
                  type: "string",
                  enum: ["fear", "comfort", "sensitivity"],
                },
                context: { type: "string", minLength: 1, maxLength: 300 },
                intensity: {
                  type: "string",
                  enum: ["weak", "moderate", "strong"],
                },
                sourceFactIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function ensureCharacterDnaPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, CHARACTER_DNA_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: CHARACTER_DNA_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuk karakterlerin kişilik kanıtlarını güvenli ve tutarlı biçimde sınıflandıran bir asistansın. Sayısal DNA değeri üretme. Yalnızca geçerli JSON döndür.",
    userTemplate: `Seçili karakter kimliği ve canonical origin facts üzerinden Character DNA için SEMANTİK KANIT çıkar.

BAĞLAM:
- Dil: {{locale}}
- Karakter kimliği: {{characterIdentity}}
- Canonical origin: {{characterOrigin}}

KURALLAR:
- DNA için doğrudan 0.0-1.0 sayı ÜRETME. Numeric DNA uygulama kodunda deterministik türetilecek.
- Yalnız şu 11 ekseni kullan: curiosity, courage, empathy, sociability, patience, imagination, persistence, independence, playfulness, caution, adaptability.
- Her evidence kaydı için direction yalnız low/neutral/high, strength yalnız weak/moderate/strong olsun.
- sourceFactIds yalnız verilen canonical origin facts içindeki gerçek id'lere referans versin.
- Bir trait için yeterli kanıt yoksa sırf tüm eksenleri doldurmak için uydurma evidence üretme; eksik eksen uygulamada neutral baseline alır.
- Kimlik veya origin ile çelişen güçlü kanıtları gizleme; gerçekten iki yönlü kanıt varsa ayrı evidence kayıtları halinde koru. Validator contradiction olarak işaretleyebilir.
- fear, courage'ın tersi değildir. Korku/rahatlık/hassasiyet yalnız belirli bir bağlama bağlıysa contextual listesine koy.
- contextual intensity için de sayı üretme; yalnız weak/moderate/strong kullan.
- Çocuğa uygun olmayan klinik teşhis, yetişkin psikolojisi veya travma etiketi üretme.
- Rationale kısa, somut ve kanıta bağlı olsun.
- Output schema'ya eksiksiz uy; JSON dışında açıklama yazma.`,
    allowedVariables: ["locale", "characterIdentity", "characterOrigin"],
    requiredVariables: ["locale", "characterIdentity", "characterOrigin"],
    outputSchema: CHARACTER_DNA_OUTPUT_SCHEMA,
    schemaVersion: "character-dna-evidence.v1",
    generationConfig: { temperature: 0.35, maxOutputTokens: 2600 },
    activatedAt: new Date(),
  });
}
