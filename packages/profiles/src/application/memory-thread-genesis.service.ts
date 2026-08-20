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
import {
  MEMORY_SEED_KINDS,
  MEMORY_SEED_VISIBILITIES,
  ORIGIN_THREAD_INITIAL_STATUSES,
  ORIGIN_THREAD_VISIBILITIES,
  STORY_POTENTIAL_LEVELS,
  type MemoryThreadGenesisSuggestion,
} from "../domain/memory-thread-genesis";

export const MEMORY_THREAD_GENESIS_PROMPT_KEY =
  "character_genesis.memory_threads";

export const MEMORY_THREAD_GENESIS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: ["key", "title", "memories", "threads"],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          memories: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: linkedMemorySchema(),
          },
          threads: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: originThreadSchema(),
          },
        },
      },
    },
  },
};

function stringArraySchema() {
  return { type: "array", items: { type: "string" } };
}

function linkedFields() {
  return {
    originFactIds: stringArraySchema(),
    relatedNpcIds: stringArraySchema(),
    relatedPlaceRefs: stringArraySchema(),
    relatedItemKeys: stringArraySchema(),
    relatedFearIds: stringArraySchema(),
    relatedGoalKeys: stringArraySchema(),
  };
}

function linkedMemorySchema() {
  return {
    type: "object",
    required: [
      "key",
      "summary",
      "kind",
      "visibility",
      "originFactIds",
      "relatedNpcIds",
      "relatedPlaceRefs",
      "relatedItemKeys",
      "relatedFearIds",
      "relatedGoalKeys",
      "rationale",
    ],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 80 },
      summary: { type: "string", minLength: 1, maxLength: 500 },
      kind: { type: "string", enum: [...MEMORY_SEED_KINDS] },
      visibility: { type: "string", enum: [...MEMORY_SEED_VISIBILITIES] },
      ...linkedFields(),
      rationale: { type: "string", minLength: 1, maxLength: 500 },
    },
  };
}

function originThreadSchema() {
  return {
    type: "object",
    required: [
      "key",
      "summary",
      "visibility",
      "initialStatus",
      "storyPotential",
      "originFactIds",
      "sourceQuestionIds",
      "sourceHookIds",
      "relatedNpcIds",
      "relatedPlaceRefs",
      "relatedItemKeys",
      "relatedFearIds",
      "relatedGoalKeys",
      "rationale",
    ],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 80 },
      summary: { type: "string", minLength: 1, maxLength: 500 },
      visibility: { type: "string", enum: [...ORIGIN_THREAD_VISIBILITIES] },
      initialStatus: {
        type: "string",
        enum: [...ORIGIN_THREAD_INITIAL_STATUSES],
      },
      storyPotential: { type: "string", enum: [...STORY_POTENTIAL_LEVELS] },
      ...linkedFields(),
      sourceQuestionIds: stringArraySchema(),
      sourceHookIds: stringArraySchema(),
      rationale: { type: "string", minLength: 1, maxLength: 500 },
    },
  };
}

export interface MemoryThreadGenesisSuggestionValidation {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
  memoryCount: number;
  threadCount: number;
}

export interface GenerateMemoryThreadGenesisOptions {
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

export async function ensureMemoryThreadGenesisPrompt(): Promise<void> {
  const db = getProfileDb();
  const [existing] = await db
    .select({ id: aiPromptVersions.id })
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, MEMORY_THREAD_GENESIS_PROMPT_KEY),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(aiPromptVersions).values({
    promptKey: MEMORY_THREAD_GENESIS_PROMPT_KEY,
    version: 1,
    status: "active",
    systemTemplate:
      "Sen Project LUMI için çocuk karakterlerin geçmişinden güvenli, kanıta bağlı Memory Seeds ve uzun ömürlü Origin Threads çıkaran bir asistansın. Memory ile gizli bilgiyi karıştırma; bilinmeyen sırları karakterin anısı gibi yazma. JSON dışında açıklama döndürme.",
    userTemplate: `Seçili karakterin canonical Deep Origin, Character DNA, Social Genesis ve Inventory Genesis bağlamından Memory Seeds ve persistent Origin Threads üret.\n\nBAĞLAM:\n- Dil: {{locale}}\n- Karakter kimliği: {{characterIdentity}}\n- Canonical origin: {{characterOrigin}}\n- Character DNA/state: {{characterTraits}}\n- Social Genesis: {{characterSocial}}\n- Inventory Genesis: {{characterInventory}}\n\nKURALLAR:\n- Tam 3-5 anlamlı pre-first-story memory seed üret. Bunlar origin anlatısının kopyası değil, gelecekte retrieval için küçük ve somut anchor'lardır.\n- Memory yalnız karakterin gerçekten yaşayarak bildiği şeyi içerebilir. visibility yalnız user_visible veya known_to_character olabilir. Karakterin bilmediği sır, neden, gerçek kimlik veya gizli plan memory olarak yazılamaz.\n- Her memory originFactIds ile gerçek canonical fact id'lerine dayanmalı. Uydurma id üretme.\n- People/place/item/fear/goal bağlantıları yalnız bağlamda mevcut gerçek id/key/ref değerlerinden seçilsin; bağlantı yoksa [] kullan.\n- En az 1 Origin Thread üret. Thread bir quest değildir ve ilk hikâyede kullanılmak zorunda değildir.\n- Thread initialStatus yalnız dormant veya unresolved olsun. active/resolved gibi lifecycle durumlarını Genesis sırasında uydurma.\n- Thread sourceQuestionIds/sourceHookIds yalnız origin içindeki gerçek unresolved question veya story hook id'lerinden gelsin; en az bir source ref olmalı.\n- Hidden thread mümkündür. unknown_to_character veya system_only thread özetinde karaktere açıklanmaması gereken bilgiyi kullanıcı/karakter görünür memory'ye taşıma.\n- storyPotential yalnız low/medium/high semantik seviyesidir; numeric skor üretme.\n- Aynı gizemi farklı cümlelerle çoğaltma. Memory ve thread'ler birbirinin tekrarına dönüşmesin.\n- Çelişkili bilgi üretme. Origin zaten çözmüşse bunu unresolved thread yapma.\n- Gizem yoğunluğunu abartma; gündelik, sıcak ve ilişki temelli geçmiş anıları da koru.\n- 5-10 yaş grubu için güvenli ve uygun içerik kullan.\n- Output schema'ya tam uy ve yalnız JSON döndür.`,
    allowedVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
    ],
    requiredVariables: [
      "locale",
      "characterIdentity",
      "characterOrigin",
      "characterTraits",
      "characterSocial",
      "characterInventory",
    ],
    outputSchema: MEMORY_THREAD_GENESIS_OUTPUT_SCHEMA,
    schemaVersion: "memory-thread-genesis.v1",
    generationConfig: { temperature: 0.3, maxOutputTokens: 3600 },
    activatedAt: new Date(),
  });
}

export async function previewMemoryThreadGenesisPrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateMemoryThreadGenesisOptions = {},
) {
  await ensureMemoryThreadGenesisPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    memoryThreadGenesisSpec(),
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

export async function generateMemoryThreadGenesis(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateMemoryThreadGenesisOptions = {},
) {
  await ensureMemoryThreadGenesisPrompt();
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    memoryThreadGenesisSpec(),
    options,
  );
  return {
    suggestions: result.suggestions,
    validation: result.suggestions.map(validateMemoryThreadGenesisSuggestion),
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

function memoryThreadGenesisSpec(): OnboardingSuggestionGenerationSpec<MemoryThreadGenesisSuggestion> {
  return {
    promptKey: MEMORY_THREAD_GENESIS_PROMPT_KEY,
    taskType: "character_genesis_memory_threads",
    summaryGuard(summary) {
      if (
        !summary.characterIdentity ||
        !getSection(summary, "origin") ||
        !getSection(summary, "traits") ||
        !getSection(summary, "social") ||
        !getSection(summary, "inventory")
      ) {
        throw new Error("MEMORY_THREAD_GENESIS_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getSection(summary, "origin") as object,
      characterTraits: getSection(summary, "traits") as object,
      characterSocial: getSection(summary, "social") as object,
      characterInventory: getSection(summary, "inventory") as object,
    }),
    pick: pickValidatedMemoryThreadGenesis,
    maxAttempts: 3,
  };
}

function getSection(
  summary: Record<string, unknown>,
  key: "origin" | "traits" | "social" | "inventory",
): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: Record<string, object | undefined> }
    | undefined;
  return genesis?.sections?.[key] ?? null;
}

function pickValidatedMemoryThreadGenesis(
  validated: unknown,
): MemoryThreadGenesisSuggestion[] {
  const suggestions =
    pickSuggestionArray<MemoryThreadGenesisSuggestion>(validated);
  for (const suggestion of suggestions) {
    const validation = validateMemoryThreadGenesisSuggestion(suggestion);
    if (!validation.valid) {
      const codes = validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`MEMORY_THREAD_GENESIS_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateMemoryThreadGenesisSuggestion(
  suggestion: MemoryThreadGenesisSuggestion,
): MemoryThreadGenesisSuggestionValidation {
  const issues: MemoryThreadGenesisSuggestionValidation["issues"] = [];
  const memoryKeys = new Set<string>();
  const threadKeys = new Set<string>();

  if (suggestion.memories.length < 3 || suggestion.memories.length > 5) {
    issues.push({
      code: "MEMORY_GENESIS_COUNT_OUT_OF_RANGE",
      message: "A candidate must contain 3-5 memory seeds",
      severity: "error",
    });
  }
  if (suggestion.threads.length === 0 || suggestion.threads.length > 5) {
    issues.push({
      code: "ORIGIN_THREAD_COUNT_OUT_OF_RANGE",
      message: "A candidate must contain 1-5 Origin Threads",
      severity: "error",
    });
  }

  for (const memory of suggestion.memories) {
    const key = memory.key.trim().toLocaleLowerCase("en-US");
    if (!key || memoryKeys.has(key)) {
      issues.push({
        code: "MEMORY_GENESIS_DUPLICATE_KEY",
        message: `Memory key '${memory.key}' must be unique and non-empty`,
        severity: "error",
      });
    }
    memoryKeys.add(key);
    if (!MEMORY_SEED_VISIBILITIES.includes(memory.visibility)) {
      issues.push({
        code: "MEMORY_GENESIS_HIDDEN_KNOWLEDGE",
        message: `${memory.key} uses a visibility not allowed for character memory`,
        severity: "error",
      });
    }
    if (memory.originFactIds.length === 0) {
      issues.push({
        code: "MEMORY_GENESIS_ORIGIN_FACT_REQUIRED",
        message: `${memory.key} must cite at least one canonical origin fact`,
        severity: "error",
      });
    }
  }

  for (const thread of suggestion.threads) {
    const key = thread.key.trim().toLocaleLowerCase("en-US");
    if (!key || threadKeys.has(key)) {
      issues.push({
        code: "ORIGIN_THREAD_DUPLICATE_KEY",
        message: `Thread key '${thread.key}' must be unique and non-empty`,
        severity: "error",
      });
    }
    threadKeys.add(key);
    if (
      thread.sourceQuestionIds.length === 0 &&
      thread.sourceHookIds.length === 0
    ) {
      issues.push({
        code: "ORIGIN_THREAD_SOURCE_REQUIRED",
        message: `${thread.key} must cite an unresolved question or story hook`,
        severity: "error",
      });
    }
    if (thread.originFactIds.length === 0) {
      issues.push({
        code: "ORIGIN_THREAD_ORIGIN_FACT_REQUIRED",
        message: `${thread.key} must cite at least one canonical origin fact`,
        severity: "error",
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    memoryCount: suggestion.memories.length,
    threadCount: suggestion.threads.length,
  };
}
