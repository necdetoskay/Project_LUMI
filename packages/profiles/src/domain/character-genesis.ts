import { ValidationError } from "./errors";

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

export const SOCIAL_ECOLOGY_ROLES = [
  "caregiver",
  "sibling",
  "family",
  "friend",
  "neighbour",
  "mentor",
  "rival",
  "rescuer",
  "creator",
  "facility_ai",
  "maintenance_companion",
  "symbiotic_creature",
  "predator",
  "local_guardian",
  "first_neutral_contact",
  "distant_kin_signal",
  "community_member",
  "unknown_presence",
  "custom",
] as const;

export type SocialEcologyRoleType = (typeof SOCIAL_ECOLOGY_ROLES)[number];

export type FoundationProvenance = {
  generationIntent: string;
  promptKey: string;
  promptVersion: number;
  model: string;
  provider?: string;
  requestId?: string;
  rngSeed?: string;
  generatedAt: Date;
};

export interface CharacterGenesis {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  version: number;
  archetypes: GenesisArchetype[];
  premise: string;
  currentSituation: string;
  longTermDesire: string;
  fundamentalNeed: string;
  knownFacts: string[];
  currentBeliefs: string[];
  unknownQuestions: string[];
  socialEcology: SocialEcologyRole[];
  provenance: FoundationProvenance;
}

export interface SocialEcologyRole {
  id: string;
  roleType: SocialEcologyRoleType;
  label: string;
  purpose: string;
  required: boolean;
  materializationHint?: string;
  targetCharacterId?: string;
}

export interface SagaCanon {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  version: number;
  centralQuestion: string;
  deepTruth: string;
  longTermDesire: string;
  fundamentalFear: string;
  stakes: string;
  hiddenForces: string[];
  possibleTransformations: string[];
  revealLayers: SagaRevealLayer[];
  forbiddenEarlyReveals: string[];
  provenance: FoundationProvenance;
}

export interface SagaRevealLayer {
  id: string;
  order: number;
  label: string;
  reveal: string;
  prerequisites: string[];
}

export interface SagaProgression {
  sagaCanonId: string;
  version: number;
  knownFacts: string[];
  currentBeliefs: string[];
  revealedClues: string[];
  falseLeads: string[];
  unresolvedQuestions: string[];
  revealStage: number;
  updatedAt: Date;
}

export type BootstrapMaterializationKind =
  | "npc"
  | "relationship"
  | "location_fact"
  | "world_event"
  | "rumor"
  | "opportunity"
  | "inventory_item";

export interface BootstrapMaterializationRef {
  kind: BootstrapMaterializationKind;
  authority: string;
  entityId: string;
  genesisRoleId?: string;
  reused: boolean;
}

export interface LivingWorldBootstrapManifest {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  foundationVersion: number;
  bootstrapVersion: number;
  idempotencyKey: string;
  status: "planned" | "running" | "completed" | "failed";
  materialized: BootstrapMaterializationRef[];
  provenance?: FoundationProvenance;
  failureCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterFoundationRecord {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  version: number;
  genesis: CharacterGenesis;
  sagaCanon: SagaCanon;
  sagaProgression: SagaProgression;
  bootstrapManifest?: LivingWorldBootstrapManifest;
  createdAt: Date;
  updatedAt: Date;
}

export function validateCharacterFoundation(
  foundation: CharacterFoundationRecord,
): void {
  validateScope(foundation);
  validateGenesis(foundation.genesis);
  validateSagaCanon(foundation.sagaCanon);
  validateSagaProgression(foundation.sagaCanon, foundation.sagaProgression);

  const scoped = [foundation.genesis, foundation.sagaCanon];
  for (const record of scoped) {
    if (
      record.householdId !== foundation.householdId ||
      record.childProfileId !== foundation.childProfileId ||
      record.characterId !== foundation.characterId ||
      record.worldId !== foundation.worldId
    ) {
      throw new ValidationError(
        "FOUNDATION_SCOPE_MISMATCH",
        "Genesis and saga records must share the foundation scope",
        "foundation",
      );
    }
  }

  if (
    foundation.bootstrapManifest &&
    (foundation.bootstrapManifest.householdId !== foundation.householdId ||
      foundation.bootstrapManifest.childProfileId !==
        foundation.childProfileId ||
      foundation.bootstrapManifest.characterId !== foundation.characterId ||
      foundation.bootstrapManifest.worldId !== foundation.worldId)
  ) {
    throw new ValidationError(
      "BOOTSTRAP_SCOPE_MISMATCH",
      "Bootstrap manifest must share the foundation scope",
      "bootstrapManifest",
    );
  }
}

export function validateGenesis(genesis: CharacterGenesis): void {
  validateScope(genesis);
  validateVersion(genesis.version, "genesis.version");
  validateText(genesis.premise, "premise", 1_500);
  validateText(genesis.currentSituation, "currentSituation", 1_500);
  validateText(genesis.longTermDesire, "longTermDesire", 800);
  validateText(genesis.fundamentalNeed, "fundamentalNeed", 800);

  if (genesis.archetypes.length < 1 || genesis.archetypes.length > 4) {
    throw new ValidationError(
      "INVALID_GENESIS_ARCHETYPE_COUNT",
      "Genesis must contain between 1 and 4 archetypes",
      "archetypes",
    );
  }

  const uniqueArchetypes = new Set(genesis.archetypes);
  if (uniqueArchetypes.size !== genesis.archetypes.length) {
    throw new ValidationError(
      "DUPLICATE_GENESIS_ARCHETYPE",
      "Genesis archetypes must be unique",
      "archetypes",
    );
  }

  for (const archetype of genesis.archetypes) {
    if (!(GENESIS_ARCHETYPES as readonly string[]).includes(archetype)) {
      throw new ValidationError(
        "UNKNOWN_GENESIS_ARCHETYPE",
        `Unknown Genesis archetype: ${archetype}`,
        "archetypes",
      );
    }
  }

  const roleIds = new Set<string>();
  for (const role of genesis.socialEcology) {
    if (!role.id || roleIds.has(role.id)) {
      throw new ValidationError(
        "INVALID_SOCIAL_ECOLOGY_ROLE_ID",
        "Social ecology role ids must be non-empty and unique",
        "socialEcology",
      );
    }
    roleIds.add(role.id);
    if (!(SOCIAL_ECOLOGY_ROLES as readonly string[]).includes(role.roleType)) {
      throw new ValidationError(
        "UNKNOWN_SOCIAL_ECOLOGY_ROLE",
        `Unknown social ecology role: ${role.roleType}`,
        "socialEcology",
      );
    }
    validateText(role.label, "socialEcology.label", 160);
    validateText(role.purpose, "socialEcology.purpose", 800);
  }
}

export function validateSagaCanon(canon: SagaCanon): void {
  validateScope(canon);
  validateVersion(canon.version, "sagaCanon.version");
  validateText(canon.centralQuestion, "centralQuestion", 1_000);
  validateText(canon.deepTruth, "deepTruth", 2_500);
  validateText(canon.longTermDesire, "longTermDesire", 1_000);
  validateText(canon.fundamentalFear, "fundamentalFear", 1_000);
  validateText(canon.stakes, "stakes", 1_500);

  const orders = canon.revealLayers.map((layer) => layer.order);
  if (
    new Set(orders).size !== orders.length ||
    orders.some((order) => order < 0)
  ) {
    throw new ValidationError(
      "INVALID_SAGA_REVEAL_ORDER",
      "Saga reveal layer order must be unique and non-negative",
      "revealLayers",
    );
  }
}

export function validateSagaProgression(
  canon: SagaCanon,
  progression: SagaProgression,
): void {
  if (progression.sagaCanonId !== canon.id) {
    throw new ValidationError(
      "SAGA_CANON_LINK_MISMATCH",
      "Saga progression must reference its Saga Canon",
      "sagaCanonId",
    );
  }
  validateVersion(progression.version, "sagaProgression.version");
  if (
    !Number.isInteger(progression.revealStage) ||
    progression.revealStage < 0
  ) {
    throw new ValidationError(
      "INVALID_SAGA_REVEAL_STAGE",
      "Saga reveal stage must be a non-negative integer",
      "revealStage",
    );
  }

  const hiddenTruth = normalize(canon.deepTruth);
  const leaked = [
    ...progression.knownFacts,
    ...progression.currentBeliefs,
  ].some((value) => normalize(value) === hiddenTruth);
  if (leaked && canon.forbiddenEarlyReveals.length > 0) {
    throw new ValidationError(
      "SAGA_DEEP_TRUTH_LEAK",
      "Protected deep truth cannot appear in current knowledge or belief while early-reveal restrictions exist",
      "sagaProgression",
    );
  }
}

function validateScope(value: {
  id?: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
}): void {
  if ("id" in value && !value.id) {
    throw new ValidationError(
      "MISSING_FOUNDATION_ID",
      "Foundation id is required",
      "id",
    );
  }
  for (const key of [
    "householdId",
    "childProfileId",
    "characterId",
    "worldId",
  ] as const) {
    if (!value[key]) {
      throw new ValidationError(
        "MISSING_FOUNDATION_SCOPE",
        `${key} is required for Character Genesis scope`,
        key,
      );
    }
  }
}

function validateVersion(version: number, field: string): void {
  if (!Number.isInteger(version) || version < 1) {
    throw new ValidationError(
      "INVALID_FOUNDATION_VERSION",
      `${field} must be a positive integer`,
      field,
    );
  }
}

function validateText(value: string, field: string, maxLength: number): void {
  if (!value || value.trim().length === 0 || value.length > maxLength) {
    throw new ValidationError(
      "INVALID_FOUNDATION_TEXT",
      `${field} must be between 1 and ${maxLength} characters`,
      field,
    );
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
