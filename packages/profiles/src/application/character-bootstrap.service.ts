import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleParentPolicyRepository } from "../db/repositories/drizzle/drizzle-parent-policy.repository";
import { DrizzleFirstRunHandoffRepository } from "../db/repositories/drizzle/drizzle-first-run-handoff.repository";
import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { DrizzleCharacterOriginPackageRepository } from "../db/repositories/drizzle/drizzle-character-origin-package.repository";
import { DrizzleHandoffConsumptionRepository } from "../db/repositories/drizzle/drizzle-handoff-consumption.repository";
import { DrizzleArchetypeSuggestionBatchRepository } from "../db/repositories/drizzle/drizzle-archetype-suggestion-batch.repository";
import {
  AuthorizationError,
  DomainError,
  NotFoundError,
  ValidationError,
  LumiCharacter,
  validateAgeBand,
  validateCharacterName,
  validateOriginDisplaySubtype,
  validateContentBoundary,
  validateOriginConcept,
  validateUniverseSeed,
  type CharacterState,
  type OriginPackage,
  type SafetyBounds,
  type StoryPreferenceMetadata,
} from "../domain";
import {
  CHARACTER_TYPES,
  type BroadCharacterKind,
  type CharacterType,
  type OriginMode,
  type ToneVector,
} from "../domain/types";
import type {
  CharacterOriginPackageRecord,
  FirstRunHandoffPayload,
  FirstRunHandoffRecord,
  LumiCharacterRecord,
  PersistedArchetypeSuggestion,
} from "../db";
import type { SelectedArchetype } from "../db/schema/profile/first-run-handoffs";
import { generateOriginPackages as llmGenerateOriginPackages } from "./llm-settings/origin-generator";

export interface CreateHandoffInput {
  householdId: string;
  childProfileId: string;
  characterType: string;
  originMode: string;
  preferenceHints?: StoryPreferenceMetadata;
  archetypeBatchId: string;
  archetypeId: string;
}

export interface OriginPackageInput {
  householdId: string;
  childProfileId: string;
  handoffId: string;
  originPackageId: string;
  manualOverrides?: {
    name?: string;
    subtype?: string;
    originConcept?: string;
    startingLocation?: string;
    homeArchetype?: string;
  };
}

export interface CharacterBootstrapStatus {
  householdId: string;
  childProfileId: string;
  profileArchived: boolean;
  latestHandoff: {
    id: string;
    characterType: CharacterType;
    originMode: OriginMode;
    createdAt: string;
  } | null;
  handoffConsumed: boolean;
  consumedByUserId: string | null;
  character: CharacterSummary | null;
  originPackageCount: number;
}

export interface CharacterSummary {
  id: string;
  householdId: string;
  childProfileId: string;
  name: string;
  broadKind: BroadCharacterKind;
  characterType: CharacterType;
  subtype: string;
  originMode: OriginMode;
  originConcept: string;
  startingLocation: string;
  homeArchetype: string;
  createdAt: Date;
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
  generationSource: "llm";
  modelId: string | null;
  generationBatchId: string | null;
}

function cleanPreferenceHints(
  input: StoryPreferenceMetadata | undefined,
): StoryPreferenceMetadata | undefined {
  if (!input) return undefined;
  const out: StoryPreferenceMetadata = {};
  if (
    Array.isArray(input.preferredThemes) &&
    input.preferredThemes.length > 0
  ) {
    out.preferredThemes = [...input.preferredThemes];
  }
  if (Array.isArray(input.avoidedThemes) && input.avoidedThemes.length > 0) {
    out.avoidedThemes = [...input.avoidedThemes];
  }
  if (
    Array.isArray(input.favoriteCharacterTypes) &&
    input.favoriteCharacterTypes.length > 0
  ) {
    out.favoriteCharacterTypes = [...input.favoriteCharacterTypes];
  }
  return out;
}

function getRepos(db: unknown = getProfileDb()) {
  const database = db as ReturnType<typeof getProfileDb>;
  return {
    householdRepo: new DrizzleHouseholdRepository(database),
    childRepo: new DrizzleChildProfileRepository(database),
    policyRepo: new DrizzleParentPolicyRepository(database),
    handoffRepo: new DrizzleFirstRunHandoffRepository(database),
    characterRepo: new DrizzleCharacterRepository(database),
    originPkgRepo: new DrizzleCharacterOriginPackageRepository(database),
    consumptionRepo: new DrizzleHandoffConsumptionRepository(database),
    batchRepo: new DrizzleArchetypeSuggestionBatchRepository(database),
    db: database,
  };
}

async function assertScopeAndProfileAlive(
  householdId: string,
  childProfileId: string,
  userId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<void> {
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
  const profile = await repos.childRepo.findByIdIncludingDeleted(
    childProfileId,
    householdId,
  );
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
}

function deriveSafetyBounds(
  ageBand: string,
  policy: {
    contentBoundary: string;
    requireParentApprovalForAi: boolean;
  },
): SafetyBounds {
  return {
    ageBand: validateAgeBand(ageBand),
    contentBoundary: validateContentBoundary(policy.contentBoundary) as
      | "strict"
      | "moderate"
      | "open",
    requireParentApprovalForAi: Boolean(policy.requireParentApprovalForAi),
  };
}

export async function createOrReplaceFirstRunHandoff(
  userId: string,
  input: CreateHandoffInput,
): Promise<{
  id: string;
  characterType: CharacterType;
  originMode: OriginMode;
}> {
  const repos = getRepos();
  await assertScopeAndProfileAlive(
    input.householdId,
    input.childProfileId,
    userId,
    repos,
  );

  if (!CHARACTER_TYPES.includes(input.characterType as CharacterType)) {
    throw new ValidationError(
      "INVALID_CHARACTER_TYPE",
      `Character type must be one of: ${CHARACTER_TYPES.join(", ")}`,
      "characterType",
    );
  }
  if (input.originMode !== "manual" && input.originMode !== "auto") {
    throw new ValidationError(
      "INVALID_ORIGIN_MODE",
      "Origin mode must be 'manual' or 'auto'",
      "originMode",
    );
  }
  if (!input.archetypeBatchId || typeof input.archetypeBatchId !== "string") {
    throw new ValidationError(
      "MISSING_ARCHETYPE_BATCH",
      "archetypeBatchId is required",
      "archetypeBatchId",
    );
  }
  if (!input.archetypeId || typeof input.archetypeId !== "string") {
    throw new ValidationError(
      "MISSING_ARCHETYPE_ID",
      "archetypeId is required",
      "archetypeId",
    );
  }

  const batch = await repos.batchRepo.findById(
    input.archetypeBatchId,
    input.householdId,
  );
  if (!batch) {
    throw new ValidationError(
      "ARCHETYPE_BATCH_NOT_FOUND",
      "Arketip batch bulunamadı veya yetkiniz yok",
      "archetypeBatchId",
    );
  }
  if (batch.childProfileId !== input.childProfileId) {
    throw new ValidationError(
      "ARCHETYPE_BATCH_PROFILE_MISMATCH",
      "Arketip batch farklı çocuk profili için oluşturulmuş",
      "archetypeBatchId",
    );
  }
  if (batch.expiresAt.getTime() < Date.now()) {
    throw new ValidationError(
      "ARCHETYPE_BATCH_EXPIRED",
      "Arketip batch süresi dolmuş. Lütfen tekrar üretin.",
      "archetypeBatchId",
    );
  }
  const persistedArchetype: PersistedArchetypeSuggestion | undefined =
    batch.archetypes.find((a) => a.id === input.archetypeId);
  if (!persistedArchetype) {
    throw new ValidationError(
      "ARCHETYPE_NOT_IN_BATCH",
      "Bu arketip seçilen batch'te bulunamadı",
      "archetypeId",
    );
  }
  if (persistedArchetype.canonicalType !== input.characterType) {
    throw new ValidationError(
      "ARCHETYPE_TYPE_MISMATCH",
      "Arketip canonicalType ile characterType uyuşmuyor",
      "characterType",
    );
  }
  if (
    !persistedArchetype.title ||
    persistedArchetype.title.length < 2 ||
    !persistedArchetype.description ||
    persistedArchetype.description.length < 10 ||
    !persistedArchetype.personalityHook ||
    persistedArchetype.personalityHook.length < 5 ||
    !persistedArchetype.storyPromise ||
    persistedArchetype.storyPromise.length < 5 ||
    !Array.isArray(persistedArchetype.themeTags) ||
    persistedArchetype.themeTags.length < 2
  ) {
    throw new DomainError(
      "INVALID_ARCHETYPE_DATA",
      "Veritabanındaki arketip kaydı geçersiz",
    );
  }

  const verifiedArchetype: SelectedArchetype = {
    id: persistedArchetype.id,
    canonicalType: persistedArchetype.canonicalType,
    title: persistedArchetype.title,
    description: persistedArchetype.description,
    personalityHook: persistedArchetype.personalityHook,
    storyPromise: persistedArchetype.storyPromise,
    themeTags: [...persistedArchetype.themeTags],
  };

  const existing = await repos.handoffRepo.findLatestByChildProfile(
    input.childProfileId,
    input.householdId,
  );
  if (existing) {
    const consumed = await repos.consumptionRepo.findByHandoffId(
      existing.id,
      input.householdId,
    );
    if (consumed) {
      throw new DomainError(
        "HANDOFF_ALREADY_CONSUMED",
        "This child profile already consumed a handoff; replace is not allowed after bootstrap",
      );
    }
    await repos.handoffRepo.softDelete(existing.id, input.householdId);
  }

  const hints = cleanPreferenceHints(input.preferenceHints);
  const payload: FirstRunHandoffPayload = {
    childProfileId: input.childProfileId,
    characterType: input.characterType as CharacterType,
    originMode: input.originMode as OriginMode,
    ...(hints
      ? {
          preferenceHints: {
            ...(Array.isArray(hints.preferredThemes)
              ? { preferredThemes: [...hints.preferredThemes] }
              : {}),
            ...(Array.isArray(hints.avoidedThemes)
              ? { avoidedThemes: [...hints.avoidedThemes] }
              : {}),
          },
        }
      : {}),
    selectedArchetype: verifiedArchetype,
  };

  const record = await repos.handoffRepo.create({
    id: crypto.randomUUID(),
    childProfileId: input.childProfileId,
    characterType: input.characterType,
    originMode: input.originMode,
    payload,
  });

  return {
    id: record.id,
    characterType: record.characterType as CharacterType,
    originMode: record.originMode as OriginMode,
  };
}

export async function getCharacterBootstrapStatus(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<CharacterBootstrapStatus> {
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

  const latestHandoff = await repos.handoffRepo.findLatestByChildProfile(
    childProfileId,
    householdId,
  );

  let consumed = false;
  let consumedByUserId: string | null = null;
  if (latestHandoff) {
    const consumption = await repos.consumptionRepo.findByHandoffId(
      latestHandoff.id,
      householdId,
    );
    if (consumption) {
      consumed = true;
      consumedByUserId = consumption.consumedByUserId;
    }
  }

  const characterRecord = await repos.characterRepo.findByChildProfile(
    childProfileId,
    householdId,
  );
  const originPackageCount = (
    await repos.originPkgRepo.listByChildProfile(childProfileId, householdId)
  ).length;

  let character: CharacterSummary | null = null;
  if (characterRecord) {
    character = {
      id: characterRecord.id,
      householdId: characterRecord.householdId,
      childProfileId: characterRecord.childProfileId,
      name: characterRecord.name,
      broadKind: characterRecord.broadKind as BroadCharacterKind,
      characterType: characterRecord.characterType as CharacterType,
      subtype: characterRecord.subtype,
      originMode: characterRecord.originMode as OriginMode,
      originConcept: characterRecord.originConcept,
      startingLocation: characterRecord.startingLocation,
      homeArchetype: characterRecord.homeArchetype,
      createdAt: characterRecord.createdAt,
    };
  }

  return {
    householdId,
    childProfileId,
    profileArchived: profile.deletedAt !== null,
    latestHandoff: latestHandoff
      ? {
          id: latestHandoff.id,
          characterType: latestHandoff.characterType as CharacterType,
          originMode: latestHandoff.originMode as OriginMode,
          createdAt: latestHandoff.createdAt.toISOString(),
        }
      : null,
    handoffConsumed: consumed,
    consumedByUserId,
    character,
    originPackageCount,
  };
}

export interface GenerateAndPersistResult {
  packages: Array<
    GeneratedOriginPackage & {
      generationSource: "llm";
      modelId: string | null;
      generationBatchId: string;
    }
  >;
  source: "llm";
  modelId: string | null;
  generationBatchId: string;
}

export async function generateAndPersistOriginPackages(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<GenerateAndPersistResult> {
  const repos = getRepos();
  await assertScopeAndProfileAlive(householdId, childProfileId, userId, repos);

  const profile = (await repos.childRepo.findById(
    childProfileId,
    householdId,
  ))!;
  const policy = await repos.policyRepo.findByHousehold(householdId, userId);
  if (!policy) {
    throw new ValidationError(
      "MISSING_PARENT_POLICY",
      "Parent policy must exist before character bootstrap",
      "householdId",
    );
  }

  const handoff = await repos.handoffRepo.findLatestByChildProfile(
    childProfileId,
    householdId,
  );
  if (!handoff) {
    throw new DomainError(
      "MISSING_HANDOFF",
      "Create a first-run character handoff before generating origin packages",
    );
  }
  const consumption = await repos.consumptionRepo.findByHandoffId(
    handoff.id,
    householdId,
  );
  if (consumption) {
    throw new DomainError(
      "HANDOFF_ALREADY_CONSUMED",
      "Origin packages cannot be regenerated after handoff consumption",
    );
  }

  const safetyBounds = deriveSafetyBounds(profile.ageBand, {
    contentBoundary: policy.contentBoundary,
    requireParentApprovalForAi: policy.requireParentApprovalForAi,
  });

  const previousBatch = await repos.originPkgRepo.findLatestLlmBatch(
    childProfileId,
    householdId,
  );
  const previousBatchConcepts =
    previousBatch.length > 0
      ? previousBatch.map((r) => ({
          subtype: r.subtype,
          originConcept: r.payload.originConcept,
        }))
      : undefined;

  const selectedArchetype = handoff.payload.selectedArchetype;

  const genResult = await llmGenerateOriginPackages(
    userId,
    householdId,
    childProfileId,
    handoff.payload.characterType,
    handoff.payload.originMode,
    handoff.payload.preferenceHints as Record<string, unknown> | undefined,
    previousBatchConcepts,
    selectedArchetype
      ? {
          title: selectedArchetype.title,
          description: selectedArchetype.description,
          personalityHook: selectedArchetype.personalityHook,
          storyPromise: selectedArchetype.storyPromise,
          themeTags: selectedArchetype.themeTags,
        }
      : undefined,
  );

  const candidates = genResult.candidates;
  const generationBatchId = crypto.randomUUID();
  const modelId = genResult.modelId;

  const rawDb = getProfileDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = getRepos(tx);
    for (const c of candidates) {
      const hints = cleanPreferenceHints(handoff.payload.preferenceHints);
      await txRepos.originPkgRepo.create({
        id: c.id,
        childProfileId,
        householdId,
        broadKind: c.broadKind,
        characterType: c.characterType,
        subtype: c.subtype,
        originMode: c.originMode,
        universeSeed: c.universeSeed,
        createdBy: "system",
        handoffId: handoff.id,
        accepted: false,
        generationBatchId,
        generationSource: "llm",
        modelId,
        payload: {
          originConcept: c.originConcept,
          startingRegionArchetype: c.startingRegionArchetype,
          startingLocation: c.startingLocation,
          homeArchetype: c.homeArchetype,
          nearbyNpcSeed: c.nearbyNpcSeed,
          firstMysterySeed: c.firstMysterySeed,
          toneVector: c.toneVector,
          noveltyMarkers: c.noveltyMarkers,
          safetyBounds,
          ...(hints ? { preferenceHints: hints } : {}),
        },
      });
    }
  });

  const packagesWithProvenance = candidates.map((c) => ({
    ...c,
    generationSource: "llm" as const,
    modelId,
    generationBatchId,
  }));

  return {
    packages: packagesWithProvenance,
    source: "llm" as const,
    modelId,
    generationBatchId,
  };
}

export async function listOriginPackages(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<CharacterOriginPackageRecord[]> {
  const repos = getRepos();
  await assertScopeAndProfileAlive(householdId, childProfileId, userId, repos);
  return repos.originPkgRepo.findLatestLlmBatch(childProfileId, householdId);
}

export async function listOriginPackagesLegacy(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<CharacterOriginPackageRecord[]> {
  const repos = getRepos();
  await assertScopeAndProfileAlive(householdId, childProfileId, userId, repos);
  return repos.originPkgRepo.listByChildProfile(childProfileId, householdId);
}

export async function consumeHandoffAndCreateCharacter(
  userId: string,
  input: OriginPackageInput,
): Promise<{ character: CharacterSummary; handoffConsumptionId: string }> {
  const rawDb = getProfileDb();

  return rawDb.transaction(async (tx) => {
    const txRepos = getRepos(tx);
    await assertScopeAndProfileAlive(
      input.householdId,
      input.childProfileId,
      userId,
      txRepos,
    );

    const profile = (await txRepos.childRepo.findById(
      input.childProfileId,
      input.householdId,
    ))!;
    const policy = await txRepos.policyRepo.findByHousehold(
      input.householdId,
      userId,
    );
    if (!policy) {
      throw new ValidationError(
        "MISSING_PARENT_POLICY",
        "Parent policy must exist before character bootstrap",
        "householdId",
      );
    }
    const handoff = await txRepos.handoffRepo.findById(
      input.handoffId,
      input.householdId,
    );
    if (!handoff) {
      throw new NotFoundError("FirstRunHandoff", input.handoffId);
    }
    if (handoff.childProfileId !== input.childProfileId) {
      throw new AuthorizationError(
        "Handoff does not belong to this child profile",
      );
    }
    const alreadyConsumed = await txRepos.consumptionRepo.findByHandoffId(
      input.handoffId,
      input.householdId,
    );
    if (alreadyConsumed) {
      throw new DomainError(
        "HANDOFF_ALREADY_CONSUMED",
        "This handoff was already consumed",
      );
    }

    const existingCharacter = await txRepos.characterRepo.findByChildProfile(
      input.childProfileId,
      input.householdId,
    );
    if (existingCharacter) {
      throw new DomainError(
        "CHARACTER_ALREADY_EXISTS",
        "Each child profile may bootstrap only one character",
      );
    }

    const originPackage = await txRepos.originPkgRepo.findById(
      input.originPackageId,
      input.householdId,
    );
    if (!originPackage) {
      throw new NotFoundError("OriginPackage", input.originPackageId);
    }
    if (originPackage.childProfileId !== input.childProfileId) {
      throw new AuthorizationError(
        "Origin package does not belong to this child profile",
      );
    }

    const safetyBounds = deriveSafetyBounds(profile.ageBand, {
      contentBoundary: policy.contentBoundary,
      requireParentApprovalForAi: policy.requireParentApprovalForAi,
    });

    const overrides = input.manualOverrides ?? {};
    const fallbackName = `${originPackage.subtype.split(" ").slice(0, 2).join(" ") || "Lumi"} ${profile.displayName}`;
    const finalName = validateCharacterName(
      (overrides.name && overrides.name.trim()) ||
        fallbackName.slice(0, 118) ||
        "Lumi Karakter",
    );
    const finalDisplaySubtype = validateOriginDisplaySubtype(
      (overrides.subtype && overrides.subtype.trim()) || originPackage.subtype,
    );
    const finalConcept = validateOriginConcept(
      (overrides.originConcept && overrides.originConcept.trim()) ||
        originPackage.payload.originConcept,
    );
    const finalLocation =
      (overrides.startingLocation?.trim() &&
      overrides.startingLocation.length < 200
        ? overrides.startingLocation
        : undefined) ?? originPackage.payload.startingLocation;
    const finalHome =
      (overrides.homeArchetype?.trim() && overrides.homeArchetype.length < 120
        ? overrides.homeArchetype
        : undefined) ?? originPackage.payload.homeArchetype;
    const hints = cleanPreferenceHints(handoff.payload.preferenceHints);

    const aggregate = LumiCharacter.create({
      id: crypto.randomUUID(),
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      name: finalName,
      broadKind: originPackage.broadKind as BroadCharacterKind,
      characterType: originPackage.characterType as CharacterType,
      subtype: finalDisplaySubtype,
      characterSubtype: "child_avatar",
      originMode: handoff.originMode as OriginMode,
      firstOriginPackageId: originPackage.id,
      originConcept: finalConcept,
      startingRegionArchetype: originPackage.payload.startingRegionArchetype,
      startingLocation: finalLocation,
      homeArchetype: finalHome,
      nearbyNpcSeed: originPackage.payload.nearbyNpcSeed,
      firstMysterySeed: originPackage.payload.firstMysterySeed,
      universeSeed: validateUniverseSeed(originPackage.universeSeed),
      safetyBounds,
      ...(hints ? { preferenceHints: hints } : {}),
    });

    const state = aggregate.getState();
    const created = (await txRepos.characterRepo.create({
      id: state.id,
      childProfileId: state.childProfileId,
      householdId: state.householdId,
      name: state.name,
      broadKind: state.broadKind,
      characterType: state.characterType,
      subtype: state.subtype,
      originMode: state.originMode,
      firstOriginPackageId: state.firstOriginPackageId,
      originConcept: state.originConcept,
      startingRegionArchetype: state.startingRegionArchetype,
      startingLocation: state.startingLocation,
      homeArchetype: state.homeArchetype,
      nearbyNpcSeed: state.nearbyNpcSeed,
      firstMysterySeed: state.firstMysterySeed,
      universeSeed: state.universeSeed,
      safetyBounds: state.safetyBounds,
      ...(state.preferenceHints
        ? { preferenceHints: state.preferenceHints }
        : {}),
    })) as LumiCharacterRecord;

    await txRepos.originPkgRepo.markAccepted(
      originPackage.id,
      input.householdId,
      input.childProfileId,
    );

    const consumption = await txRepos.consumptionRepo.create({
      id: crypto.randomUUID(),
      handoffId: handoff.id,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      characterId: created.id,
      consumedByUserId: userId,
      originModeAtConsume: handoff.originMode,
      note: `Consumed during Sprint 04 bootstrap by user ${userId.slice(0, 8)}`,
    });

    return {
      character: {
        id: created.id,
        householdId: created.householdId,
        childProfileId: created.childProfileId,
        name: created.name,
        broadKind: created.broadKind as BroadCharacterKind,
        characterType: created.characterType as CharacterType,
        subtype: created.subtype,
        originMode: created.originMode as OriginMode,
        originConcept: created.originConcept,
        startingLocation: created.startingLocation,
        homeArchetype: created.homeArchetype,
        createdAt: created.createdAt,
      },
      handoffConsumptionId: consumption.id,
    };
  }) as Promise<{ character: CharacterSummary; handoffConsumptionId: string }>;
}

export async function listCharactersByChildProfile(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<CharacterSummary[]> {
  const repos = getRepos();
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
  const record = await repos.characterRepo.findByChildProfile(
    childProfileId,
    householdId,
  );
  if (!record) return [];
  return [
    {
      id: record.id,
      householdId: record.householdId,
      childProfileId: record.childProfileId,
      name: record.name,
      broadKind: record.broadKind as BroadCharacterKind,
      characterType: record.characterType as CharacterType,
      subtype: record.subtype,
      originMode: record.originMode as OriginMode,
      originConcept: record.originConcept,
      startingLocation: record.startingLocation,
      homeArchetype: record.homeArchetype,
      createdAt: record.createdAt,
    },
  ];
}

export async function listCharactersByHousehold(
  userId: string,
  householdId: string,
): Promise<CharacterSummary[]> {
  const repos = getRepos();
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
  const records = await repos.characterRepo.listByHousehold(householdId);
  return records.map((r) => ({
    id: r.id,
    householdId: r.householdId,
    childProfileId: r.childProfileId,
    name: r.name,
    broadKind: r.broadKind as BroadCharacterKind,
    characterType: r.characterType as CharacterType,
    subtype: r.subtype,
    originMode: r.originMode as OriginMode,
    originConcept: r.originConcept,
    startingLocation: r.startingLocation,
    homeArchetype: r.homeArchetype,
    createdAt: r.createdAt,
  }));
}

export async function getCharacterById(
  userId: string,
  householdId: string,
  characterId: string,
): Promise<CharacterSummary | null> {
  const repos = getRepos();
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
  const record = await repos.characterRepo.findById(characterId, householdId);
  if (!record) return null;
  return {
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    name: record.name,
    broadKind: record.broadKind as BroadCharacterKind,
    characterType: record.characterType as CharacterType,
    subtype: record.subtype,
    originMode: record.originMode as OriginMode,
    originConcept: record.originConcept,
    startingLocation: record.startingLocation,
    homeArchetype: record.homeArchetype,
    createdAt: record.createdAt,
  };
}

export type { CharacterState, OriginPackage, FirstRunHandoffRecord };
