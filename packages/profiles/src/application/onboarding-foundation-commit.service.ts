import type {
  CharacterFoundationRecord,
  CharacterGenesisState,
  GenesisArchetype,
} from "../domain/character-genesis";
import { validateCharacterFoundation } from "../domain/character-genesis";

export interface AcceptedOnboardingFoundationEvidence {
  characterType: unknown;
  identity: {
    key: string;
    name: string;
    identity: string;
    traits: [string, string, string];
  };
  universe: { key: string; name: string };
  world: {
    key: string;
    name: string;
    description: string;
    ecology: string;
    climate: string;
    magicTechnology: string;
    adventureTone: string;
  };
  compatibility?: {
    key: string;
    classification: string;
    explanation: string;
    adaptationPremise?: string;
  };
  region: {
    key: string;
    name: string;
    biome: string;
    tone: string;
    mystery: string;
    description: string;
  };
  origin: {
    key: string;
    title: string;
    origin: string;
    home: string;
    formativeExperience: string;
    storyHook: string;
  };
  saga: {
    key: string;
    title: string;
    premise: string;
    longTermGoal: string;
    motivation: string;
    themes: string[];
    futureBranches: string[];
    specificity: string;
  };
}

export interface OnboardingFoundationBuildInput {
  householdId: string;
  childProfileId: string;
  characterId: string;
  cycleId: string;
  evidence: AcceptedOnboardingFoundationEvidence;
  now?: Date;
}

function inferGenesisArchetype(origin: string): GenesisArchetype {
  const value = origin.toLocaleLowerCase("tr-TR");
  const matches: Array<[RegExp, GenesisArchetype]> = [
    [/kayıp|lost/, "Lost"],
    [/uyan|awaken/, "Awakened"],
    [/yumurta|hatched|çatla/, "Hatched"],
    [/sürgün|exil/, "Exiled"],
    [/geldi|ulaştı|arriv/, "Arrived"],
    [/evlat|adopt/, "Adopted"],
    [/gizli|saklı|hidden/, "Hidden"],
    [/son kalan|last known/, "Last Known"],
    [/yaratıldı|üretildi|created/, "Created"],
    [/kaçtı|escaped/, "Escaped"],
    [/seçil|chosen/, "Chosen-by-Accident"],
  ];
  return matches.find(([pattern]) => pattern.test(value))?.[1] ?? "Rooted";
}

function publicFacts(evidence: AcceptedOnboardingFoundationEvidence): string[] {
  return [
    `${evidence.identity.name}: ${evidence.identity.identity}`,
    `Dünya: ${evidence.world.name}`,
    `Bölge: ${evidence.region.name}`,
    `Köken: ${evidence.origin.origin}`,
    `Mevcut durum: ${evidence.origin.storyHook}`,
    `Açık saga önermesi: ${evidence.saga.premise}`,
  ];
}

export function buildOnboardingFoundationRecord(
  input: OnboardingFoundationBuildInput,
): CharacterFoundationRecord {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const scope = {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: input.characterId,
  };
  const provenance = {
    source: "onboarding" as const,
    runId: `onboarding-foundation:${input.cycleId}`,
    promptKey: "character_foundation.onboarding_commit",
    promptVersion: 1,
    generatedAt,
  };
  const facts = publicFacts(input.evidence);
  const archetype = inferGenesisArchetype(input.evidence.origin.origin);

  const genesis: CharacterGenesisState = {
    scope,
    archetypes: [archetype],
    concept: `${input.evidence.origin.title}: ${input.evidence.origin.origin}`,
    currentSituation: input.evidence.origin.storyHook,
    socialEcology: [],
    provenance,
  };

  const deepTruth =
    `${input.evidence.origin.storyHook} görünen nedenin ötesinde, ` +
    `${input.evidence.saga.title} ile bağlantılı daha eski bir gerçeğin işaretidir.`;
  const futureBranches = input.evidence.saga.futureBranches.filter(Boolean);
  const possibleEndStates =
    futureBranches.length > 0
      ? futureBranches.slice(0, 4)
      : [
          `${input.evidence.identity.name} temel sorunun gerçeğini öğrenir.`,
          `${input.evidence.identity.name} dünyayla kurduğu bağı dönüştürür.`,
        ];

  const record: CharacterFoundationRecord = {
    scope,
    version: 1,
    genesis,
    coreTension: {
      immediateNeed: input.evidence.origin.storyHook,
      mediumArc: input.evidence.saga.motivation,
      coreSaga: input.evidence.saga.longTermGoal,
    },
    sagaCanon: {
      scope,
      centralQuestion: input.evidence.saga.premise,
      deepTruth,
      ultimateStakes: input.evidence.saga.longTermGoal,
      characterInitialBelief: input.evidence.saga.premise,
      longTermDesire: input.evidence.saga.longTermGoal,
      fundamentalFear: `Başaramazsa ${input.evidence.saga.longTermGoal.toLocaleLowerCase("tr-TR")} erişilemez hale gelebilir.`,
      hiddenForces: [],
      possibleTransformations: input.evidence.saga.themes.map(
        (theme) => `${theme} temasının karakterde kalıcı bir dönüşüme yol açması`,
      ),
      revealLayers: [
        {
          id: "reveal-1",
          order: 1,
          truth: `İlk ipuçları ${input.evidence.origin.storyHook} olayının tek başına olmadığını gösterir.`,
          eligibilityHint: "Karakter ilk yerel bağlantıları kurduktan sonra",
        },
        {
          id: "reveal-2",
          order: 2,
          truth: `Köken ile ${input.evidence.saga.title} arasında doğrudan bir bağ vardır.`,
          eligibilityHint: "Birden fazla bağımsız ipucu doğrulandıktan sonra",
        },
        {
          id: "reveal-3",
          order: 3,
          truth: deepTruth,
          eligibilityHint: "Core Saga geç evresinde, yeterli güven ve kanıt oluştuğunda",
        },
      ],
      forbiddenEarlyReveals: [deepTruth],
      possibleEndStates,
      provenance,
    },
    sagaProgression: {
      scope,
      knownFacts: facts,
      currentBeliefs: [input.evidence.saga.premise],
      revealedClueIds: [],
      falseLeads: [],
      unresolvedQuestions: [input.evidence.saga.premise],
      revealStage: 0,
      updatedAt: generatedAt,
    },
    bootstrap: {
      scope,
      status: "pending",
      runId: `living-world-bootstrap:${input.cycleId}`,
      attemptCount: 0,
      materializedRefs: {
        npcIds: [],
        relationshipIds: [],
        locationIds: [],
        eventIds: [],
        rumorIds: [],
        opportunityIds: [],
      },
    },
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };

  validateCharacterFoundation(record);
  return record;
}

export function projectOnboardingFoundationForFinalReview(
  evidence: AcceptedOnboardingFoundationEvidence,
  foundation: CharacterFoundationRecord,
) {
  return {
    identity: {
      name: evidence.identity.name,
      identity: evidence.identity.identity,
      traits: [...evidence.identity.traits],
    },
    world: {
      name: evidence.world.name,
      description: evidence.world.description,
    },
    region: {
      name: evidence.region.name,
      description: evidence.region.description,
    },
    origin: {
      title: evidence.origin.title,
      origin: evidence.origin.origin,
      home: evidence.origin.home,
    },
    currentSituation: foundation.genesis.currentSituation,
    publicSaga: {
      title: evidence.saga.title,
      premise: evidence.saga.premise,
      longTermGoal: evidence.saga.longTermGoal,
    },
  };
}
