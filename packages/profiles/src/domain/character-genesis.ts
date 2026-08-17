export const GENESIS_ARCHETYPES = [
  "rooted",
  "lost",
  "awakened",
  "hatched",
  "exiled",
  "arrived",
  "adopted",
  "hidden",
  "last_known",
  "created",
  "escaped",
  "chosen_by_accident",
] as const;

export type GenesisArchetype = (typeof GENESIS_ARCHETYPES)[number];

export const SOCIAL_ECOLOGY_ROLE_KINDS = [
  "caregiver",
  "family",
  "peer",
  "friend",
  "rival",
  "mentor",
  "neighbour",
  "rescuer",
  "first_contact",
  "local_guide",
  "creator",
  "facility_ai",
  "maintenance_unit",
  "symbiotic_creature",
  "clan_member",
  "predator_or_threat",
  "distant_kin_signal",
  "other",
] as const;

export type SocialEcologyRoleKind =
  (typeof SOCIAL_ECOLOGY_ROLE_KINDS)[number];

export type FoundationStatus =
  | "draft"
  | "committed"
  | "bootstrap_pending"
  | "bootstrap_running"
  | "bootstrap_complete"
  | "bootstrap_failed";

export type BootstrapStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed";

export interface FoundationGenerationProvenance {
  generationIntent: string;
  modelId: string | null;
  promptKey: string | null;
  promptVersion: number | null;
  rngSeed: string | null;
  sourceOriginPackageId: string | null;
  sourceCreationCycleId: string | null;
  generatedAt: string;
}

export interface CharacterGenesis {
  version: 1;
  archetypes: GenesisArchetype[];
  publicPremise: string;
  originCondition: string;
  currentSituation: string;
  immediateNeeds: string[];
  mediumTermDesires: string[];
  currentBeliefs: string[];
  importantUnknowns: string[];
  growthPotential: string;
}

export interface SocialEcologyRole {
  stableKey: string;
  roleKind: SocialEcologyRoleKind;
  label: string;
  purpose: string;
  required: boolean;
  materializationHint: "npc" | "world_entity" | "signal" | "environmental_force";
}

export interface SocialEcologyPlan {
  summary: string;
  roles: SocialEcologyRole[];
  allowNoFamily: boolean;
  allowSparseSocialWorld: boolean;
}

export interface CoreTension {
  immediateNeed: string;
  mediumTermDirection: string;
  centralTension: string;
}

export interface SagaRevealLayer {
  id: string;
  order: number;
  description: string;
  unlockCondition: string;
}

export interface SagaCanon {
  centralQuestion: string;
  deepTruth: string;
  longTermDesire: string;
  fundamentalFear: string;
  stakes: string[];
  hiddenForces: string[];
  possibleTransformations: string[];
  revealLayers: SagaRevealLayer[];
  forbiddenEarlyReveals: string[];
}

export interface SagaProgression {
  knownFacts: string[];
  currentBeliefs: string[];
  revealedClues: string[];
  falseLeads: string[];
  unresolvedQuestions: string[];
  revealStage: number;
}

export interface BootstrapMaterializationRef {
  stableKey: string;
  authority: "profiles" | "world" | "npc-intelligence" | "story";
  entityType: string;
  entityId: string;
  action: "created" | "reused" | "skipped";
}

export interface LivingWorldBootstrapManifest {
  version: 1;
  status: BootstrapStatus;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  lastErrorCode: string | null;
  materializations: BootstrapMaterializationRef[];
}

export interface CharacterFoundation {
  schemaVersion: 1;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  status: FoundationStatus;
  genesis: CharacterGenesis;
  socialEcology: SocialEcologyPlan;
  coreTension: CoreTension;
  sagaCanon: SagaCanon;
  sagaProgression: SagaProgression;
  provenance: FoundationGenerationProvenance;
  bootstrap: LivingWorldBootstrapManifest;
}

export class CharacterFoundationInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterFoundationInvariantError";
  }
}

export function assertCharacterFoundation(
  foundation: CharacterFoundation,
): CharacterFoundation {
  const scope = [
    foundation.householdId,
    foundation.childProfileId,
    foundation.characterId,
    foundation.worldId,
  ];
  if (scope.some((value) => value.trim().length === 0)) {
    throw new CharacterFoundationInvariantError(
      "foundation scope identifiers must be non-empty",
    );
  }

  if (foundation.genesis.archetypes.length === 0) {
    throw new CharacterFoundationInvariantError(
      "genesis requires at least one life-condition archetype",
    );
  }

  if (!foundation.socialEcology.allowNoFamily) {
    const familyLike = foundation.socialEcology.roles.some((role) =>
      ["caregiver", "family"].includes(role.roleKind),
    );
    if (!familyLike) {
      throw new CharacterFoundationInvariantError(
        "social ecology requires a family/caregiver role when allowNoFamily=false",
      );
    }
  }

  const known = new Set(
    foundation.sagaProgression.knownFacts.map(normalizeNarrativeValue),
  );
  if (known.has(normalizeNarrativeValue(foundation.sagaCanon.deepTruth))) {
    throw new CharacterFoundationInvariantError(
      "protected saga deep truth cannot be an initial known fact",
    );
  }

  const forbidden = new Set(
    foundation.sagaCanon.forbiddenEarlyReveals.map(normalizeNarrativeValue),
  );
  const leakedClue = foundation.sagaProgression.revealedClues.find((clue) =>
    forbidden.has(normalizeNarrativeValue(clue)),
  );
  if (leakedClue) {
    throw new CharacterFoundationInvariantError(
      `forbidden early reveal is already exposed: ${leakedClue}`,
    );
  }

  const roleKeys = foundation.socialEcology.roles.map((role) => role.stableKey);
  assertUnique(roleKeys, "social ecology role stableKey");

  const refs = foundation.bootstrap.materializations.map(
    (entry) => `${entry.authority}:${entry.entityType}:${entry.entityId}`,
  );
  assertUnique(refs, "bootstrap materialization reference");

  if (foundation.bootstrap.attempt < 0) {
    throw new CharacterFoundationInvariantError(
      "bootstrap attempt cannot be negative",
    );
  }

  return foundation;
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new CharacterFoundationInvariantError(`${label} must be unique`);
  }
}

function normalizeNarrativeValue(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
