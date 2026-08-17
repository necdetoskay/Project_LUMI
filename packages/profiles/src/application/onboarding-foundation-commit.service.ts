import { and, desc, eq } from "drizzle-orm";

import { aiGenerationTraces, characterFoundations } from "../db/schema/profile";
import {
  validateCharacterFoundation,
  type CharacterFoundationRecord,
  type FoundationProvenance,
  type GenesisArchetype,
} from "../domain/character-genesis";
import { getProfileDb } from "./db";

export interface AcceptedOnboardingFoundationEvidence {
  characterType: unknown;
  identity: { key: string; name: string; identity: string; traits: [string, string, string] };
  universe: { key: string; name: string };
  world: { key: string; name: string; description: string; ecology: string; climate: string; magicTechnology: string; adventureTone: string };
  compatibility?: { key: string; classification: string; explanation: string; adaptationPremise?: string };
  region: { key: string; name: string; biome: string; tone: string; mystery: string; description: string };
  origin: { key: string; title: string; origin: string; home: string; formativeExperience: string; storyHook: string };
  saga: { key: string; title: string; premise: string; longTermGoal: string; motivation: string; themes: string[]; futureBranches: string[]; specificity: string };
}

export interface OnboardingFoundationBuildInput {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  cycleId: string;
  evidence: AcceptedOnboardingFoundationEvidence;
  genesisProvenance?: FoundationProvenance;
  sagaProvenance?: FoundationProvenance;
  now?: Date;
}

export interface OnboardingFoundationPublicReview {
  identity: { name: string; identity: string; traits: string[] };
  world: { name: string; description: string };
  region: { name: string; description: string };
  origin: { title: string; origin: string; home: string };
  currentSituation: string;
  publicSaga: { title: string; premise: string; longTermGoal: string };
}

function inferGenesisArchetype(origin: string): GenesisArchetype {
  const value = origin.toLocaleLowerCase("tr-TR");
  const matches: Array<[RegExp, GenesisArchetype]> = [
    [/kayıp|lost/, "lost"], [/uyan|awaken/, "awakened"],
    [/yumurta|hatched|çatla/, "hatched"], [/sürgün|exil/, "exiled"],
    [/geldi|ulaştı|arriv/, "arrived"], [/evlat|adopt/, "adopted"],
    [/gizli|saklı|hidden/, "hidden"], [/son kalan|last known/, "last_known"],
    [/yaratıldı|üretildi|created/, "created"], [/kaçtı|escaped/, "escaped"],
    [/seçil|chosen/, "chosen_by_accident"],
  ];
  return matches.find(([pattern]) => pattern.test(value))?.[1] ?? "rooted";
}

function acceptedFacts(evidence: AcceptedOnboardingFoundationEvidence): string[] {
  return [
    `${evidence.identity.name}: ${evidence.identity.identity}`,
    `Dünya: ${evidence.world.name}`,
    `Bölge: ${evidence.region.name}`,
    `Köken: ${evidence.origin.origin}`,
    `Mevcut durum: ${evidence.origin.storyHook}`,
  ];
}

function fallbackProvenance(input: OnboardingFoundationBuildInput, intent: string, promptKey: string): FoundationProvenance {
  return {
    generationIntent: intent,
    promptKey,
    promptVersion: 1,
    model: "accepted-onboarding-selection",
    provider: "selection-derived",
    requestId: `onboarding-foundation:${input.cycleId}`,
    rngSeed: input.cycleId,
    generatedAt: input.now ?? new Date(),
  };
}

export async function getOnboardingFoundationGenerationProvenance(cycleId: string): Promise<{ genesis?: FoundationProvenance; saga?: FoundationProvenance }> {
  const db = getProfileDb();
  const traces = await db
    .select({ taskType: aiGenerationTraces.taskType, promptKey: aiGenerationTraces.promptKey, promptVersion: aiGenerationTraces.promptVersion, provider: aiGenerationTraces.provider, modelId: aiGenerationTraces.modelId, id: aiGenerationTraces.id, createdAt: aiGenerationTraces.createdAt })
    .from(aiGenerationTraces)
    .where(and(eq(aiGenerationTraces.creationCycleId, cycleId), eq(aiGenerationTraces.validationStatus, "valid")))
    .orderBy(desc(aiGenerationTraces.createdAt));
  const mapTrace = (taskType: string, intent: string): FoundationProvenance | undefined => {
    const trace = traces.find((item) => item.taskType === taskType);
    return trace ? { generationIntent: intent, promptKey: trace.promptKey, promptVersion: trace.promptVersion, provider: trace.provider, model: trace.modelId, requestId: trace.id, rngSeed: cycleId, generatedAt: trace.createdAt } : undefined;
  };
  return {
    genesis: mapTrace("character_origin_suggestions", "character_genesis"),
    saga: mapTrace("character_core_saga", "saga_foundation"),
  };
}

export function buildOnboardingFoundationRecord(input: OnboardingFoundationBuildInput): CharacterFoundationRecord {
  const now = input.now ?? new Date();
  const genesisProvenance = input.genesisProvenance ?? fallbackProvenance(input, "character_genesis", "character_onboarding.origin_suggestions");
  const sagaProvenance = input.sagaProvenance ?? fallbackProvenance(input, "saga_foundation", "character_onboarding.core_saga");
  const facts = acceptedFacts(input.evidence);
  const sagaCanonId = `saga:${input.characterId}`;
  const deepTruth = `${input.evidence.origin.storyHook} görünen açıklamanın ötesinde, ${input.evidence.saga.title} ile bağlantılı henüz bilinmeyen daha eski bir gerçeğin işaretidir.`;
  const record: CharacterFoundationRecord = {
    id: `foundation:${input.characterId}`,
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: input.characterId,
    worldId: input.worldId,
    version: 1,
    genesis: {
      id: `genesis:${input.characterId}`,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      characterId: input.characterId,
      worldId: input.worldId,
      version: 1,
      archetypes: [inferGenesisArchetype(input.evidence.origin.origin)],
      premise: `${input.evidence.origin.title}: ${input.evidence.origin.origin}`,
      currentSituation: input.evidence.origin.storyHook,
      longTermDesire: input.evidence.saga.longTermGoal,
      fundamentalNeed: input.evidence.saga.motivation,
      knownFacts: facts,
      currentBeliefs: [input.evidence.saga.premise],
      unknownQuestions: [input.evidence.region.mystery],
      socialEcology: [],
      provenance: genesisProvenance,
    },
    sagaCanon: {
      id: sagaCanonId,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      characterId: input.characterId,
      worldId: input.worldId,
      version: 1,
      centralQuestion: input.evidence.saga.premise,
      deepTruth,
      longTermDesire: input.evidence.saga.longTermGoal,
      fundamentalFear: `Başaramazsa ${input.evidence.saga.longTermGoal.toLocaleLowerCase("tr-TR")} erişilemez hale gelebilir.`,
      stakes: input.evidence.saga.motivation,
      hiddenForces: [],
      possibleTransformations: input.evidence.saga.themes.map((theme) => `${theme} temasının karakterde kalıcı bir dönüşüme yol açması`),
      revealLayers: [
        { id: "reveal-1", order: 1, label: "İlk örüntü", reveal: `İlk ipuçları ${input.evidence.origin.storyHook} olayının tek başına olmadığını gösterir.`, prerequisites: ["İlk yerel bağlantıların kurulması"] },
        { id: "reveal-2", order: 2, label: "Köken bağı", reveal: `Köken ile ${input.evidence.saga.title} arasında doğrudan bir bağ vardır.`, prerequisites: ["Birden fazla bağımsız ipucunun doğrulanması"] },
        { id: "reveal-3", order: 3, label: "Derin gerçek", reveal: deepTruth, prerequisites: ["Core Saga geç evresi ve yeterli kanıt"] },
      ],
      forbiddenEarlyReveals: [deepTruth],
      provenance: sagaProvenance,
    },
    sagaProgression: {
      sagaCanonId,
      version: 1,
      knownFacts: facts,
      currentBeliefs: [input.evidence.saga.premise],
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions: [input.evidence.region.mystery],
      revealStage: 0,
      updatedAt: now,
    },
    bootstrapManifest: {
      id: `bootstrap:${input.characterId}`,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      characterId: input.characterId,
      worldId: input.worldId,
      foundationVersion: 1,
      bootstrapVersion: 1,
      idempotencyKey: `living-world-bootstrap:${input.cycleId}`,
      status: "planned",
      materialized: [],
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
  validateCharacterFoundation(record);
  return record;
}

export async function saveOnboardingFoundationIdempotently(foundation: CharacterFoundationRecord): Promise<CharacterFoundationRecord> {
  validateCharacterFoundation(foundation);
  const db = getProfileDb();
  await db.insert(characterFoundations).values({
    characterId: foundation.characterId,
    childProfileId: foundation.childProfileId,
    householdId: foundation.householdId,
    version: foundation.version,
    foundation,
    bootstrapStatus: "pending",
    bootstrapRunId: foundation.bootstrapManifest?.idempotencyKey,
  }).onConflictDoNothing({ target: characterFoundations.characterId });
  const [row] = await db.select({ foundation: characterFoundations.foundation }).from(characterFoundations).where(and(
    eq(characterFoundations.characterId, foundation.characterId),
    eq(characterFoundations.householdId, foundation.householdId),
    eq(characterFoundations.childProfileId, foundation.childProfileId),
  )).limit(1);
  if (!row) throw new Error("CHARACTER_FOUNDATION_PERSIST_FAILED");
  validateCharacterFoundation(row.foundation);
  return row.foundation;
}

export async function getCharacterFoundationByCharacterId(characterId: string): Promise<CharacterFoundationRecord | null> {
  const db = getProfileDb();
  const [row] = await db.select({ foundation: characterFoundations.foundation }).from(characterFoundations).where(eq(characterFoundations.characterId, characterId)).limit(1);
  return row?.foundation ?? null;
}

export function projectOnboardingFoundationForFinalReview(evidence: AcceptedOnboardingFoundationEvidence, foundation: CharacterFoundationRecord): OnboardingFoundationPublicReview {
  return {
    identity: { name: evidence.identity.name, identity: evidence.identity.identity, traits: [...evidence.identity.traits] },
    world: { name: evidence.world.name, description: evidence.world.description },
    region: { name: evidence.region.name, description: evidence.region.description },
    origin: { title: evidence.origin.title, origin: evidence.origin.origin, home: evidence.origin.home },
    currentSituation: foundation.genesis.currentSituation,
    publicSaga: { title: evidence.saga.title, premise: evidence.saga.premise, longTermGoal: evidence.saga.longTermGoal },
  };
}
