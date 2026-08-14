import { getProfileDb } from "../db";
import {
  DrizzleHouseholdRepository,
  DrizzleChildProfileRepository,
  DrizzleParentPolicyRepository,
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
import type {
  BroadCharacterKind,
  CharacterType,
  OriginMode,
  ToneVector,
} from "../../domain/types";
import { ensureOriginPackagesPrompt } from "../prompt-bootstrap.service";
import {
  resolveActivePrompt,
  type PromptContext,
} from "../prompt-runtime.service";
import { generateTextWithLlm } from "../text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "../prompt-output-validator";
import { recordAiGenerationTrace } from "../ai-generation-trace.service";

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

type OriginPackagePayload = {
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: string[];
  noveltyMarkers: string[];
};

function getRepos(db: ReturnType<typeof getProfileDb> = getProfileDb()) {
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
    policyRepo: new DrizzleParentPolicyRepository(db),
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

function buildContext(params: GenerationParams): PromptContext {
  return {
    characterType: params.characterType,
    originMode: params.originMode,
    packageCount: params.originMode === "auto" ? 4 : 1,
    ageBand: params.ageBand,
    preferenceHints: params.preferenceHints ?? {},
    contentBoundary: params.contentBoundary,
    requireParentApprovalForAi: params.requireParentApprovalForAi,
    locale: params.locale,
    generationNonce: params.generationNonce,
    selectedArchetype: params.selectedArchetype ?? {},
  };
}

async function attemptLlmGeneration(
  userId: string,
  params: GenerationParams,
): Promise<GenerationResult> {
  await ensureOriginPackagesPrompt();
  const context = buildContext(params);
  const prompt = await resolveActivePrompt(
    "character_onboarding.origin_packages",
    context,
  );
  const generated = await generateTextWithLlm({
    userId,
    householdId: params.householdId,
    taskType: "character_origin_generation",
    system: prompt.system,
    user: prompt.user,
    modelOverride: prompt.modelOverride,
    generationConfig: prompt.generationConfig,
  });

  let packages: OriginPackagePayload[];
  try {
    const parsed = parseAndValidatePromptOutput(
      generated.content,
      prompt.outputSchema,
    ) as { packages: OriginPackagePayload[] };
    packages = parsed.packages;
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: params.householdId,
      childProfileId: params.childProfileId,
      taskType: "character_origin_generation",
      promptKey: prompt.promptKey,
      promptVersion: prompt.promptVersion,
      inputContext: context,
      outputPayload: { raw: generated.content },
      validationStatus: "invalid",
      generated,
    });
    throw new LlmGenerationError(
      error instanceof Error
        ? error.message
        : "Origin package validation failed",
    );
  }

  const hType = params.characterType as CharacterType;
  const candidates: GeneratedOriginPackage[] = packages.map((pkg) => {
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
    const tones = (pkg.toneVector as ToneVector[]).filter((tone) =>
      ["wonder", "warmth", "mystery", "humor", "courage", "curiosity"].includes(
        tone,
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

  await recordAiGenerationTrace({
    householdId: params.householdId,
    childProfileId: params.childProfileId,
    taskType: "character_origin_generation",
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    inputContext: context,
    outputPayload: { packages },
    validationStatus: "valid",
    generated,
  });

  return { candidates, source: "llm", modelId: generated.model };
}

function hasSimilarConceptToPrevious(
  previousBatch: { subtype: string; originConcept: string }[],
  incoming: { subtype: string; originConcept: string },
): boolean {
  const incomingWords = new Set(
    (incoming.subtype + " " + incoming.originConcept)
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
  if (incomingWords.size === 0) return false;
  for (const previous of previousBatch) {
    const previousWords = new Set(
      (previous.subtype + " " + previous.originConcept)
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3),
    );
    const intersection = new Set(
      [...incomingWords].filter((word) => previousWords.has(word)),
    );
    const ratio =
      intersection.size / Math.min(incomingWords.size, previousWords.size);
    if (ratio > 0.4) return true;
  }
  return false;
}

async function executeWithRetry(
  userId: string,
  params: GenerationParams,
  previousBatch?: { subtype: string; originConcept: string }[],
): Promise<GenerationResult> {
  const attempt = async (nonce: string): Promise<GenerationResult> => {
    const result = await attemptLlmGeneration(userId, {
      ...params,
      generationNonce: nonce,
    });
    const expectedCount = params.originMode === "auto" ? 4 : 1;
    if (result.candidates.length !== expectedCount)
      throw new LlmGenerationError(
        `Expected ${expectedCount} packages from LLM, got ${result.candidates.length}`,
      );

    const titles = result.candidates.map((candidate) =>
      candidate.subtype.toLowerCase(),
    );
    if (new Set(titles).size !== titles.length)
      throw new LlmGenerationError("Duplicate subtype titles in LLM response");

    if (
      previousBatch?.length &&
      result.candidates.some((candidate) =>
        hasSimilarConceptToPrevious(previousBatch, candidate),
      )
    )
      throw new LlmGenerationError(
        "Similar concepts to previous batch detected",
      );
    return result;
  };

  try {
    return await attempt(params.generationNonce);
  } catch (firstError) {
    if (!(firstError instanceof LlmGenerationError)) throw firstError;
  }
  return attempt(crypto.randomUUID());
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
  if (!household)
    throw new AuthorizationError("User is not a member of this household");

  const profile = await repos.childRepo.findById(childProfileId, householdId);
  if (!profile) throw new NotFoundError("ChildProfile", childProfileId);
  if (profile.deletedAt)
    throw new ValidationError(
      "PROFILE_ARCHIVED",
      "Character bootstrap cannot be started from an archived child profile",
      "childProfileId",
    );

  const policy = await repos.policyRepo.findByHousehold(householdId, userId);
  if (!policy)
    throw new ValidationError(
      "MISSING_PARENT_POLICY",
      "Parent policy must exist before character bootstrap",
      "householdId",
    );

  const params: GenerationParams = {
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

  try {
    return await executeWithRetry(userId, params, previousBatchConcepts);
  } catch (error) {
    if (error instanceof LlmConfigError) throw error;
    if (error instanceof LlmGenerationError) throw error;
    throw new LlmGenerationError(
      error instanceof Error ? error.message : "LLM call failed",
    );
  }
}
