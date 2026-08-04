import { getProfileDb } from "../db";
import {
  DrizzleHouseholdRepository,
  DrizzleChildProfileRepository,
  DrizzleParentPolicyRepository,
  DrizzleLlmProviderSettingsRepository,
  DrizzleLlmTaskModelSettingsRepository,
  DrizzleArchetypeSuggestionBatchRepository,
} from "../../db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../domain";
import { LlmGenerationError, LlmConfigError } from "./origin-generator";
import type { CharacterType } from "../../domain/types";
import { decryptApiKey } from "./encryption";
import { callOpenRouter } from "./openrouter-client";

export { LlmGenerationError, LlmConfigError };

const ARCHETYPE_BATCH_TTL_MS = 60 * 60 * 1000;

export interface ArchetypeSuggestion {
  id: string;
  canonicalType: CharacterType;
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
  themeTags: string[];
}

export interface ArchetypeResult {
  batchId: string;
  archetypes: ArchetypeSuggestion[];
  modelId: string | null;
  generationNonce: string;
  expiresAt: string;
}

export interface ArchetypeExcludedConcept {
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
}

interface ArchetypeGenerationParams {
  ageBand: string;
  householdId: string;
  childProfileId: string;
  userId: string;
  locale: string;
  preferenceHints: Record<string, unknown> | undefined;
  contentBoundary: string;
  requireParentApprovalForAi: boolean;
  excludedConcepts: ArchetypeExcludedConcept[];
  generationNonce: string;
}

const VALID_CANONICAL_TYPES: CharacterType[] = [
  "explorer",
  "inventor",
  "storyteller",
  "helper",
  "dreamer",
];

function getRepos(db: ReturnType<typeof getProfileDb> = getProfileDb()) {
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
    policyRepo: new DrizzleParentPolicyRepository(db),
    providerRepo: new DrizzleLlmProviderSettingsRepository(db),
    taskRepo: new DrizzleLlmTaskModelSettingsRepository(db),
    batchRepo: new DrizzleArchetypeSuggestionBatchRepository(db),
  };
}

function validateArchetypeFields(
  raw: Record<string, unknown>,
  index: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const pre = `archetype[${index}]`;

  const ct = raw.canonicalType;
  if (
    typeof ct !== "string" ||
    !VALID_CANONICAL_TYPES.includes(ct as CharacterType)
  ) {
    errors.push(
      `${pre}.canonicalType: must be one of ${VALID_CANONICAL_TYPES.join(", ")}`,
    );
  }
  const title = raw.title;
  if (
    typeof title !== "string" ||
    title.trim().length < 2 ||
    title.length > 100
  ) {
    errors.push(`${pre}.title: must be 2-100 chars`);
  }
  const desc = raw.description;
  if (
    typeof desc !== "string" ||
    desc.trim().length < 10 ||
    desc.length > 400
  ) {
    errors.push(`${pre}.description: must be 10-400 chars`);
  }
  const hook = raw.personalityHook;
  if (typeof hook !== "string" || hook.trim().length < 5 || hook.length > 300) {
    errors.push(`${pre}.personalityHook: must be 5-300 chars`);
  }
  const promise = raw.storyPromise;
  if (
    typeof promise !== "string" ||
    promise.trim().length < 5 ||
    promise.length > 300
  ) {
    errors.push(`${pre}.storyPromise: must be 5-300 chars`);
  }
  const tags = raw.themeTags;
  if (!Array.isArray(tags) || tags.length < 2 || tags.length > 6) {
    errors.push(`${pre}.themeTags: must be array of 2-6 strings`);
  } else {
    for (let i = 0; i < tags.length; i++) {
      if (typeof tags[i] !== "string" || String(tags[i]).trim().length < 2) {
        errors.push(`${pre}.themeTags[${i}]: must be non-empty string`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function extractAndParseArchetypeJson(raw: string): Record<string, unknown>[] {
  const trimmed = raw.trim();
  const codeMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr = codeMatch ? codeMatch[1]!.trim() : trimmed;
  const braceStart = jsonStr.indexOf("{");
  const braceEnd = jsonStr.lastIndexOf("}");
  if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
    throw new LlmGenerationError("Failed to extract JSON from LLM response");
  }
  let topLevel: Record<string, unknown>;
  try {
    topLevel = JSON.parse(jsonStr.slice(braceStart, braceEnd + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    throw new LlmGenerationError("Failed to parse LLM response as JSON");
  }
  const rawArchs = topLevel.archetypes;
  if (!Array.isArray(rawArchs) || rawArchs.length === 0) {
    throw new LlmGenerationError(
      "LLM response missing valid 'archetypes' array",
    );
  }
  return rawArchs as Record<string, unknown>[];
}

function buildArchetypePrompt(params: ArchetypeGenerationParams): string {
  let excludedStr = "";
  if (params.excludedConcepts.length > 0) {
    const descriptions = params.excludedConcepts
      .map(
        (ec, i) => `#${i + 1}: "${ec.title}" — ${ec.description.slice(0, 80)}`,
      )
      .join("\n");
    excludedStr = `Daha önce gösterilen konseptler (BUNLARI KULLANMA, benzer fikirler üretme):\n${descriptions}\n`;
  }

  return `Sen Project LUMI için karakter arketipi önerileri üreten bir AI asistanısın.

Görev: Çocuk kullanıcılar için yaratıcı, güvenli ve yaşa uygun karakter arketipi önerileri üret.

Kısıtlamalar:
- Korku, şiddet, yetişkin teması KESİNLİKLE yasak.
- ${params.ageBand} yaş grubuna uygun.
- Her öneri birbirinden belirgin şekilde farklı olmalı.
- İçerik sınırı: ${params.contentBoundary}.
- Ebeveyn onayı gerekiyor: ${params.requireParentApprovalForAi ? "evet" : "hayır"}.
- Dil: ${params.locale}.
- Sadece geçerli JSON çıktısı ver, ek metin ekleme.
- Çocuğun gerçek adı veya kişisel bilgileri KESİNLİKLE kullanılmamalı.
- Generation nonce (her çağrıda farklı üretim için): ${params.generationNonce}

${excludedStr}
Tam olarak 5 (beş) arketip önerisi üret. Her biri farklı bir canonicalType olmalı.
${params.preferenceHints ? `Tercih ipuçları: ${JSON.stringify(params.preferenceHints)}` : ""}

Geçerli canonicalType değerleri: explorer, inventor, storyteller, helper, dreamer.

JSON şeması (kesinlikle uy):
{
  "archetypes": [
    {
      "canonicalType": "explorer",
      "title": "Türkçe yaratıcı bir başlık (2-100 karakter)",
      "description": "kısa açıklama (10-400 karakter)",
      "personalityHook": "kişilik ipucu (5-300 karakter)",
      "storyPromise": "hikayenin vaat ettiği şey (5-300 karakter)",
      "themeTags": ["tag1", "tag2"]
    }
  ]
}

Her canonicalType yukarıdaki 5 değerden biri olmalı. 5 önerinin tamamı farklı canonicalType değerlerine sahip olmalı.`;
}

interface LlmArchetypeResult {
  archetypes: ArchetypeSuggestion[];
  modelId: string;
}

async function attemptLlmGeneration(
  params: ArchetypeGenerationParams,
  apiKey: string,
  modelId: string,
  temperature: number,
  maxTokens: number,
): Promise<LlmArchetypeResult> {
  const prompt = buildArchetypePrompt(params);

  const response = await callOpenRouter(apiKey, {
    model: modelId,
    messages: [
      {
        role: "system",
        content:
          "Sen çocuk hikayeleri için karakter arketipi önerileri üreten yaratıcı bir asistansın. Sadece geçerli JSON döndür.",
      },
      { role: "user", content: prompt },
    ],
    temperature,
    maxTokens,
  });

  const rawArchetypes = extractAndParseArchetypeJson(response.content);

  const archetypes: ArchetypeSuggestion[] = [];
  const seenTypes = new Set<string>();
  const seenTitles = new Set<string>();

  for (let i = 0; i < rawArchetypes.length; i++) {
    const raw = rawArchetypes[i]!;
    const validation = validateArchetypeFields(raw, i);
    if (!validation.valid) {
      throw new LlmGenerationError(
        `Archetype validation failed: ${validation.errors.join("; ")}`,
      );
    }
    const ct = raw.canonicalType as string;
    if (seenTypes.has(ct)) {
      throw new LlmGenerationError(
        `Duplicate canonicalType in LLM response: ${ct}`,
      );
    }
    seenTypes.add(ct);
    const titleLower = String(raw.title ?? "")
      .toLowerCase()
      .trim();
    if (seenTitles.has(titleLower)) {
      throw new LlmGenerationError(
        `Duplicate title in LLM response: ${raw.title}`,
      );
    }
    seenTitles.add(titleLower);
    archetypes.push({
      id: crypto.randomUUID(),
      canonicalType: ct as CharacterType,
      title: String(raw.title ?? "").trim(),
      description: String(raw.description ?? "").trim(),
      personalityHook: String(raw.personalityHook ?? "").trim(),
      storyPromise: String(raw.storyPromise ?? "").trim(),
      themeTags: (raw.themeTags as string[]).map((t) => String(t).trim()),
    });
  }

  if (archetypes.length !== 5) {
    throw new LlmGenerationError(
      `Expected exactly 5 archetypes, got ${archetypes.length}`,
    );
  }

  return { archetypes, modelId: response.model };
}

function hasSimilarConcepts(
  existing: ArchetypeExcludedConcept[],
  candidate: { title: string; description: string; personalityHook: string },
): boolean {
  const wordsA = new Set(
    (
      candidate.title +
      " " +
      candidate.description +
      " " +
      candidate.personalityHook
    )
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  if (wordsA.size === 0) return false;
  for (const ex of existing) {
    const wordsB = new Set(
      (ex.title + " " + ex.description + " " + ex.personalityHook)
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const ratio = intersection.size / Math.min(wordsA.size, wordsB.size);
    if (ratio > 0.35) return true;
  }
  return false;
}

export async function generateArchetypes(
  userId: string,
  householdId: string,
  childProfileId: string,
  excludedConcepts?: ArchetypeExcludedConcept[],
  preferenceHints?: Record<string, unknown>,
): Promise<ArchetypeResult> {
  const repos = getRepos();

  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }

  const profile = await repos.childRepo.findById(childProfileId, householdId);
  if (!profile) {
    throw new NotFoundError("ChildProfile", childProfileId);
  }
  if (profile.deletedAt) {
    throw new ValidationError(
      "PROFILE_ARCHIVED",
      "Character archetype generation cannot be started from an archived child profile",
      "childProfileId",
    );
  }

  const policy = await repos.policyRepo.findByHousehold(householdId, userId);
  if (!policy) {
    throw new ValidationError(
      "MISSING_PARENT_POLICY",
      "Parent policy must exist before character archetype generation",
      "householdId",
    );
  }

  const llmSettings = await repos.taskRepo.findByTaskType(
    userId,
    householdId,
    "character_origin_generation",
  );
  const providerSettings = await repos.providerRepo.findByUserAndHousehold(
    userId,
    householdId,
    "openrouter",
  );

  if (!providerSettings?.encryptedApiKey) {
    throw new LlmConfigError(
      "LLM_KEY_MISSING",
      "OpenRouter API key not configured. Go to Settings > AI Bağlantısı to add your key.",
    );
  }
  if (!providerSettings.enabled) {
    throw new LlmConfigError(
      "LLM_PROVIDER_DISABLED",
      "OpenRouter provider is disabled. Enable it in Settings > AI Bağlantısı.",
    );
  }
  if (!llmSettings) {
    throw new LlmConfigError(
      "LLM_TASK_MISSING",
      "Character archetype generation task not configured. Ensure your API key is saved in Settings.",
    );
  }
  if (!llmSettings.enabled) {
    throw new LlmConfigError(
      "LLM_TASK_DISABLED",
      "Character archetype generation task is disabled. Enable it in Settings.",
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(providerSettings.encryptedApiKey);
  } catch {
    throw new LlmGenerationError("API key decryption failed");
  }

  const excludedList = excludedConcepts ?? [];
  const genNonce1 = crypto.randomUUID();
  const genParams: ArchetypeGenerationParams = {
    ageBand: profile.ageBand,
    householdId,
    childProfileId,
    userId,
    locale: profile.locale ?? "tr-TR",
    preferenceHints,
    contentBoundary: policy.contentBoundary,
    requireParentApprovalForAi: policy.requireParentApprovalForAi,
    excludedConcepts: excludedList,
    generationNonce: genNonce1,
  };

  let successful: LlmArchetypeResult | null = null;
  let lastError: LlmGenerationError | null = null;
  let usedNonce: string = genNonce1;

  for (let attemptNum = 0; attemptNum < 2; attemptNum++) {
    const nonce = attemptNum === 0 ? genNonce1 : crypto.randomUUID();
    usedNonce = nonce;
    const attemptParams: ArchetypeGenerationParams = {
      ...genParams,
      generationNonce: nonce,
    };
    try {
      const result = await attemptLlmGeneration(
        attemptParams,
        apiKey,
        llmSettings.modelId,
        llmSettings.temperature,
        llmSettings.maxOutputTokens,
      );
      if (
        excludedList.length === 0 ||
        !result.archetypes.some((a) => hasSimilarConcepts(excludedList, a))
      ) {
        successful = result;
        break;
      } else {
        lastError = new LlmGenerationError(
          "LLM response similar to excluded concepts",
        );
      }
    } catch (err) {
      if (err instanceof LlmConfigError) throw err;
      if (err instanceof LlmGenerationError) {
        lastError = err;
      } else {
        lastError = new LlmGenerationError(
          (err as Error).message ?? "LLM call failed",
        );
      }
    }
  }

  if (!successful) {
    throw (
      lastError ?? new LlmGenerationError("LLM archetype generation failed")
    );
  }

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ARCHETYPE_BATCH_TTL_MS);
  await repos.batchRepo.create({
    id: batchId,
    userId,
    householdId,
    childProfileId,
    archetypes: successful.archetypes,
    modelId: successful.modelId,
    generationNonce: usedNonce,
    excludedConcepts: excludedList,
    expiresAt,
  });

  return {
    batchId,
    archetypes: successful.archetypes,
    modelId: successful.modelId,
    generationNonce: usedNonce,
    expiresAt: expiresAt.toISOString(),
  };
}
