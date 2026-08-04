import { getProfileDb } from "../db";
import {
  DrizzleHouseholdRepository,
  DrizzleChildProfileRepository,
  DrizzleParentPolicyRepository,
  DrizzleLlmProviderSettingsRepository,
  DrizzleLlmTaskModelSettingsRepository,
} from "../../db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  validateBroadCharacterKind,
  validateOriginConcept,
  validateOriginDisplaySubtype,
  validateUniverseSeed,
} from "../../domain";

export class LlmGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmGenerationError";
  }
}

export class LlmConfigError extends Error {
  public code:
    | "LLM_KEY_MISSING"
    | "LLM_TASK_MISSING"
    | "LLM_TASK_DISABLED"
    | "LLM_PROVIDER_DISABLED";
  constructor(code: LlmConfigError["code"], message: string) {
    super(message);
    this.name = "LlmConfigError";
    this.code = code;
  }
}

import {
  type BroadCharacterKind,
  type CharacterType,
  type OriginMode,
  type ToneVector,
} from "../../domain/types";
import { decryptApiKey } from "./encryption";
import { callOpenRouter } from "./openrouter-client";
import { parseAndValidateLlmOutput } from "./llm-output-parser";

export interface GenerationResult {
  candidates: GeneratedOriginPackage[];
  source: "llm";
  modelId: string | null;
}

export interface GeneratedOriginPackage {
  id: string;
  broadKind: BroadCharacterKind;
  characterType: CharacterType;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: ToneVector[];
  noveltyMarkers: string[];
  originMode: OriginMode;
  universeSeed: string;
}

export interface GenerationParams {
  characterType: string;
  originMode: string;
  ageBand: string;
  householdId: string;
  childProfileId: string;
  locale: string;
  preferenceHints: Record<string, unknown> | undefined;
  contentBoundary: string;
  requireParentApprovalForAi: boolean;
  generationNonce: string;
  selectedArchetype?: {
    title: string;
    description: string;
    personalityHook: string;
    storyPromise: string;
    themeTags: string[];
  };
}

function getRepos(db: ReturnType<typeof getProfileDb> = getProfileDb()) {
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
    policyRepo: new DrizzleParentPolicyRepository(db),
    providerRepo: new DrizzleLlmProviderSettingsRepository(db),
    taskRepo: new DrizzleLlmTaskModelSettingsRepository(db),
  };
}

function deterministicHashedSeed(...parts: string[]): string {
  const combined = parts.join("|");
  let h1 = 0xdeadbeef ^ combined.length;
  let h2 = 0x41c6ce57 ^ combined.length;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  const hex =
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0");
  const prefix = parts[0]?.slice(0, 8) ?? "seed";
  return `lumi-${prefix}-${hex}`.slice(0, 118);
}

function buildLlmPrompt(params: {
  characterType: string;
  originMode: string;
  ageBand: string;
  preferenceHints: Record<string, unknown> | undefined;
  contentBoundary: string;
  requireParentApprovalForAi: boolean;
  locale: string;
  generationNonce: string;
  selectedArchetype?: {
    title: string;
    description: string;
    personalityHook: string;
    storyPromise: string;
    themeTags: string[];
  };
}): string {
  const packageCount = params.originMode === "auto" ? 4 : 1;
  const archInfo = params.selectedArchetype
    ? `\nSeçilen karakter arketipi:\n- Başlık: ${params.selectedArchetype.title}\n- Açıklama: ${params.selectedArchetype.description}\n- Kişilik ipucu: ${params.selectedArchetype.personalityHook}\n- Hikaye vaadi: ${params.selectedArchetype.storyPromise}\n- Temalar: ${params.selectedArchetype.themeTags.join(", ")}\n\nBu arketipin konseptine ve vaadine uygun origin paketleri üret. Arketipin kişiliğini ve hikaye vaadini yansıtan öneriler yap.`
    : "";

  return `Sen Project LUMI için karakter köken paketleri üreten bir AI asistanısın.

Görev: Çocuk kullanıcılar için yaratıcı, güvenli ve yaşa uygun karakter başlangıç konseptleri üret.

Kısıtlamalar:
- Korku, şiddet, yetişkin teması KESİNLİKLE yasak.
- ${params.ageBand} yaş grubuna uygun.
- Her öneri birbirinden belirgin şekilde farklı olmalı.
- İçerik sınırı: ${params.contentBoundary}.
- Ebeveyn onayı gerekiyor: ${params.requireParentApprovalForAi ? "evet" : "hayır"}.
- Dil: Türkçe.
- Sadece geçerli JSON çıktısı ver, ek metin ekleme.
- Generation nonce (her çağrıda farklı üretim için): ${params.generationNonce}

Karakter tipi: ${params.characterType}
Origin modu: ${params.originMode} (auto=${packageCount} öneri, manual=1 öneri)
${params.preferenceHints ? `Tercih ipuçları: ${JSON.stringify(params.preferenceHints)}` : ""}
${archInfo}

JSON şeması (kesinlikle uy):
{
  "packages": [
    {
      "broadKind": "human|animal|fantasy|robot|sea_creature|sky_creature",
      "characterType": "${params.characterType}",
      "subtype": "yaratıcı alt tür adı (1-80 karakter)",
      "originConcept": "kısa güvenli konsept (1-500 karakter)",
      "startingRegionArchetype": "bölge arketipi",
      "startingLocation": "güvenli başlangıç yeri",
      "homeArchetype": "ev arketipi",
      "nearbyNpcSeed": "nazik NPC tohumu",
      "firstMysterySeed": "küçük gizem tohumu",
      "toneVector": ["wonder|warmth|mystery|humor|courage|curiosity", "..."],
      "noveltyMarkers": ["2 benzersiz yenilik işareti"]
    }
  ]
}

broadKind şunlardan biri olmalı: human, animal, fantasy, robot, sea_creature, sky_creature.
toneVector her biri şunlardan olmalı: wonder, warmth, mystery, humor, courage, curiosity.
Her öneri farklı bir broadKind kullanmalı (mümkünse).`;
}

async function attemptLlmGeneration(
  params: GenerationParams,
  apiKey: string,
  modelId: string,
  temperature: number,
  maxTokens: number,
): Promise<GenerationResult> {
  const prompt = buildLlmPrompt({
    characterType: params.characterType,
    originMode: params.originMode,
    ageBand: params.ageBand,
    preferenceHints: params.preferenceHints,
    contentBoundary: params.contentBoundary,
    requireParentApprovalForAi: params.requireParentApprovalForAi,
    locale: params.locale,
    generationNonce: params.generationNonce,
    ...(params.selectedArchetype
      ? { selectedArchetype: params.selectedArchetype }
      : {}),
  });

  const response = await callOpenRouter(apiKey, {
    model: modelId,
    messages: [
      {
        role: "system",
        content:
          "Sen çocuk hikayeleri için karakter konseptleri üreten yaratıcı bir asistansın. Sadece geçerli JSON döndür.",
      },
      { role: "user", content: prompt },
    ],
    temperature,
    maxTokens,
  });

  const parsed = parseAndValidateLlmOutput(response.content);

  if (parsed.packages.length === 0) {
    throw new LlmGenerationError(
      `LLM output validation failed: ${parsed.errors.join("; ")}`,
    );
  }

  const hType = params.characterType as CharacterType;

  const candidates: GeneratedOriginPackage[] = parsed.packages.map((pkg) => {
    const broadKind = validateBroadCharacterKind(pkg.broadKind);
    const subtype = validateOriginDisplaySubtype(pkg.subtype);
    const originConcept = validateOriginConcept(pkg.originConcept);
    const universeSeed = validateUniverseSeed(
      deterministicHashedSeed(
        pkg.originConcept,
        params.ageBand,
        params.characterType,
        params.generationNonce,
      ),
    );
    const tones = (pkg.toneVector as ToneVector[]).filter((t) =>
      ["wonder", "warmth", "mystery", "humor", "courage", "curiosity"].includes(
        t,
      ),
    );
    if (tones.length === 0) tones.push("wonder", "curiosity");

    return {
      id: crypto.randomUUID(),
      broadKind,
      characterType: hType,
      subtype,
      originConcept,
      startingRegionArchetype: pkg.startingRegionArchetype,
      startingLocation: pkg.startingLocation,
      homeArchetype: pkg.homeArchetype,
      nearbyNpcSeed: pkg.nearbyNpcSeed,
      firstMysterySeed: pkg.firstMysterySeed,
      toneVector: tones,
      noveltyMarkers: pkg.noveltyMarkers,
      originMode: params.originMode as OriginMode,
      universeSeed,
    };
  });

  return {
    candidates,
    source: "llm",
    modelId: response.model,
  };
}

function hasSimilarConceptToPrevious(
  previousBatch: { subtype: string; originConcept: string }[],
  incoming: { subtype: string; originConcept: string },
): boolean {
  const incomingWords = new Set(
    (incoming.subtype + " " + incoming.originConcept)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  if (incomingWords.size === 0) return false;
  for (const prev of previousBatch) {
    const prevWords = new Set(
      (prev.subtype + " " + prev.originConcept)
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const intersection = new Set(
      [...incomingWords].filter((w) => prevWords.has(w)),
    );
    const ratio =
      intersection.size / Math.min(incomingWords.size, prevWords.size);
    if (ratio > 0.4) return true;
  }
  return false;
}

async function executeWithRetry(
  params: GenerationParams,
  apiKey: string,
  modelId: string,
  temperature: number,
  maxTokens: number,
  previousBatch?: { subtype: string; originConcept: string }[],
): Promise<GenerationResult> {
  const attempt = async (nonce: string): Promise<GenerationResult> => {
    const attemptParams: GenerationParams = {
      ...params,
      generationNonce: nonce,
    };
    const result = await attemptLlmGeneration(
      attemptParams,
      apiKey,
      modelId,
      temperature,
      maxTokens,
    );

    const expectedCount = params.originMode === "auto" ? 4 : 1;
    if (result.candidates.length !== expectedCount) {
      throw new LlmGenerationError(
        `Expected ${expectedCount} packages from LLM, got ${result.candidates.length}`,
      );
    }

    const titles = result.candidates.map((c) => c.subtype.toLowerCase());
    const uniqueSet = new Set(titles);
    if (uniqueSet.size !== titles.length) {
      throw new LlmGenerationError("Duplicate subtype titles in LLM response");
    }

    if (previousBatch && previousBatch.length > 0) {
      const similarToPrev = result.candidates.some((c) =>
        hasSimilarConceptToPrevious(previousBatch, {
          subtype: c.subtype,
          originConcept: c.originConcept,
        }),
      );
      if (!similarToPrev) {
        return result;
      }
      throw new LlmGenerationError(
        "Similar concepts to previous batch detected",
      );
    }

    return result;
  };

  const nonce1 = params.generationNonce;
  try {
    return await attempt(nonce1);
  } catch (firstErr) {
    if (!(firstErr instanceof LlmGenerationError)) throw firstErr;
  }

  const nonce2 = crypto.randomUUID();
  try {
    return await attempt(nonce2);
  } catch (secondErr) {
    if (secondErr instanceof LlmGenerationError) throw secondErr;
    throw new LlmGenerationError(
      (secondErr as Error).message ?? "LLM retry call failed",
    );
  }
}

export async function generateOriginPackages(
  userId: string,
  householdId: string,
  childProfileId: string,
  handoffCharacterType: string,
  handoffOriginMode: string,
  handoffPreferenceHints?: Record<string, unknown>,
  previousBatchConcepts?: { subtype: string; originConcept: string }[],
  selectedArchetype?: {
    title: string;
    description: string;
    personalityHook: string;
    storyPromise: string;
    themeTags: string[];
  },
): Promise<GenerationResult> {
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
      "Character bootstrap cannot be started from an archived child profile",
      "childProfileId",
    );
  }

  const policy = await repos.policyRepo.findByHousehold(householdId, userId);
  if (!policy) {
    throw new ValidationError(
      "MISSING_PARENT_POLICY",
      "Parent policy must exist before character bootstrap",
      "householdId",
    );
  }

  const genParams: GenerationParams = {
    characterType: handoffCharacterType || "explorer",
    originMode: handoffOriginMode || "auto",
    ageBand: profile.ageBand,
    householdId,
    childProfileId,
    locale: profile.locale ?? "tr-TR",
    preferenceHints: handoffPreferenceHints,
    contentBoundary: policy.contentBoundary,
    requireParentApprovalForAi: policy.requireParentApprovalForAi,
    generationNonce: crypto.randomUUID(),
    ...(selectedArchetype ? { selectedArchetype } : {}),
  };

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
      "Character origin generation task not configured. Ensure your API key is saved in Settings.",
    );
  }
  if (!llmSettings.enabled) {
    throw new LlmConfigError(
      "LLM_TASK_DISABLED",
      "Character origin generation task is disabled. Enable it in Settings.",
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(providerSettings.encryptedApiKey);
  } catch {
    throw new LlmGenerationError("API key decryption failed");
  }

  try {
    return await executeWithRetry(
      genParams,
      apiKey,
      llmSettings.modelId,
      llmSettings.temperature,
      llmSettings.maxOutputTokens,
      previousBatchConcepts,
    );
  } catch (err) {
    if (err instanceof LlmConfigError) throw err;
    if (err instanceof LlmGenerationError) throw err;
    throw new LlmGenerationError((err as Error).message ?? "LLM call failed");
  }
}
