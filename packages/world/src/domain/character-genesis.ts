export const CHARACTER_GENESIS_STATUSES = [
  "staged",
  "selected",
  "committed",
] as const;

export type CharacterGenesisStatus = (typeof CHARACTER_GENESIS_STATUSES)[number];

export const GENESIS_VISIBILITIES = [
  "user_visible",
  "known_to_character",
  "known_to_family",
  "known_to_npc",
  "unknown_to_character",
  "system_only",
] as const;

export type GenesisVisibility = (typeof GENESIS_VISIBILITIES)[number];

export interface GenesisProvenance {
  modelProvider?: string;
  modelId?: string;
  promptRevision?: string;
  generationConfigRevision?: string;
  parserRevision?: string;
  schemaRevision: string;
  derivationRevision?: string;
  validationRevision?: string;
  seed: string;
  generatedAt: string;
}

export interface GenesisOriginFact {
  id: string;
  kind: string;
  summary: string;
  visibility: GenesisVisibility;
  sourceRef?: string;
}

export interface GenesisOriginState {
  summary: string;
  narrative: string;
  facts: GenesisOriginFact[];
}

export interface GenesisTraitState {
  dna: Record<string, number>;
  dynamic: Record<string, number>;
  contextual: Record<string, Record<string, number>>;
  learnedModifiers: Record<string, number>;
  evidenceFactIds: string[];
}

export interface GenesisNpcState {
  candidateId: string;
  role: string;
  displayName: string;
  originFactIds: string[];
}

export interface GenesisRelationshipState {
  fromCandidateId: string;
  toCandidateId: string;
  trust: number;
  affection: number;
  familiarity: number;
  respect: number;
  tension: number;
  dependence: number;
}

export interface GenesisSocialState {
  npcs: GenesisNpcState[];
  relationships: GenesisRelationshipState[];
}

export interface GenesisInventoryItemState {
  candidateId: string;
  displayName: string;
  category: string;
  origin: string;
  givenByCandidateId?: string;
  acquiredAt?: string;
  emotionalValue?: number;
  storyPotential?: number;
  originFactIds: string[];
}

export interface GenesisInventoryState {
  items: GenesisInventoryItemState[];
}

export interface GenesisMemoryState {
  candidateId: string;
  summary: string;
  visibility: GenesisVisibility;
  originFactIds: string[];
}

export type GenesisThreadStatus =
  | "dormant"
  | "unresolved"
  | "active"
  | "partially_resolved"
  | "resolved"
  | "abandoned";

export interface GenesisThreadState {
  candidateId: string;
  summary: string;
  status: GenesisThreadStatus;
  visibility: GenesisVisibility;
  potential: number;
  originFactIds: string[];
}

export interface GenesisMemoryAndThreadState {
  memories: GenesisMemoryState[];
  threads: GenesisThreadState[];
}

export interface GenesisEnvironmentState {
  worldId?: string;
  regionId?: string;
  homeId?: string;
  habitat: string;
  climate: string;
  season: string;
  weather?: string;
  dayPhase?: string;
}

export interface CharacterGenesisSections {
  origin?: GenesisOriginState;
  traits?: GenesisTraitState;
  social?: GenesisSocialState;
  inventory?: GenesisInventoryState;
  memoryAndThreads?: GenesisMemoryAndThreadState;
  environment?: GenesisEnvironmentState;
}

export interface CharacterGenesisPackage {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  candidateSeed: string;
  version: number;
  status: CharacterGenesisStatus;
  provenance: GenesisProvenance;
  sections: CharacterGenesisSections;
  createdAt: string;
  updatedAt: string;
  selectedAt?: string;
  committedAt?: string;
}

export interface CreateCharacterGenesisPackageInput {
  id?: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  candidateSeed: string;
  provenance: GenesisProvenance;
  sections?: CharacterGenesisSections;
  now?: string;
}

export interface GenesisValidationIssue {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface GenesisValidationResult {
  valid: boolean;
  issues: GenesisValidationIssue[];
}

function requireNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

function cloneSections(sections: CharacterGenesisSections): CharacterGenesisSections {
  return structuredClone(sections);
}

export function createCharacterGenesisPackage(
  input: CreateCharacterGenesisPackageInput,
): CharacterGenesisPackage {
  requireNonEmpty(input.householdId, "householdId");
  requireNonEmpty(input.childProfileId, "childProfileId");
  requireNonEmpty(input.characterId, "characterId");
  requireNonEmpty(input.universeSeed, "universeSeed");
  requireNonEmpty(input.candidateSeed, "candidateSeed");
  requireNonEmpty(input.provenance.schemaRevision, "provenance.schemaRevision");
  requireNonEmpty(input.provenance.seed, "provenance.seed");

  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id ?? crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: input.characterId,
    universeSeed: input.universeSeed,
    candidateSeed: input.candidateSeed,
    version: 1,
    status: "staged",
    provenance: structuredClone(input.provenance),
    sections: cloneSections(input.sections ?? {}),
    createdAt: now,
    updatedAt: now,
  };
}

export function selectCharacterGenesisPackage(
  candidate: CharacterGenesisPackage,
  now = new Date().toISOString(),
): CharacterGenesisPackage {
  if (candidate.status === "committed") {
    throw new Error("Committed genesis package cannot be re-selected");
  }

  return {
    ...structuredClone(candidate),
    status: "selected",
    version: candidate.version + 1,
    selectedAt: now,
    updatedAt: now,
  };
}

export function markCharacterGenesisCommitted(
  candidate: CharacterGenesisPackage,
  now = new Date().toISOString(),
): CharacterGenesisPackage {
  if (candidate.status !== "selected") {
    throw new Error("Only a selected genesis package can be committed");
  }

  return {
    ...structuredClone(candidate),
    status: "committed",
    version: candidate.version + 1,
    committedAt: now,
    updatedAt: now,
  };
}

export function validateCharacterGenesisStructure(
  candidate: CharacterGenesisPackage,
): GenesisValidationResult {
  const issues: GenesisValidationIssue[] = [];
  const social = candidate.sections.social;
  const inventory = candidate.sections.inventory;
  const origin = candidate.sections.origin;

  const originFactIds = new Set(origin?.facts.map((fact) => fact.id) ?? []);
  if (originFactIds.size !== (origin?.facts.length ?? 0)) {
    issues.push({
      code: "GENESIS_DUPLICATE_ORIGIN_FACT",
      message: "Origin fact ids must be unique",
      path: "sections.origin.facts",
      severity: "error",
    });
  }

  const npcIds = new Set(social?.npcs.map((npc) => npc.candidateId) ?? []);
  if (npcIds.size !== (social?.npcs.length ?? 0)) {
    issues.push({
      code: "GENESIS_DUPLICATE_NPC",
      message: "NPC candidate ids must be unique",
      path: "sections.social.npcs",
      severity: "error",
    });
  }

  for (const relationship of social?.relationships ?? []) {
    if (!npcIds.has(relationship.fromCandidateId) && relationship.fromCandidateId !== candidate.characterId) {
      issues.push({
        code: "GENESIS_RELATIONSHIP_FROM_MISSING",
        message: `Relationship source ${relationship.fromCandidateId} does not exist`,
        path: "sections.social.relationships",
        severity: "error",
      });
    }
    if (!npcIds.has(relationship.toCandidateId) && relationship.toCandidateId !== candidate.characterId) {
      issues.push({
        code: "GENESIS_RELATIONSHIP_TO_MISSING",
        message: `Relationship target ${relationship.toCandidateId} does not exist`,
        path: "sections.social.relationships",
        severity: "error",
      });
    }
  }

  const itemIds = new Set<string>();
  for (const item of inventory?.items ?? []) {
    if (itemIds.has(item.candidateId)) {
      issues.push({
        code: "GENESIS_DUPLICATE_ITEM",
        message: `Inventory item candidate id ${item.candidateId} is duplicated`,
        path: "sections.inventory.items",
        severity: "error",
      });
    }
    itemIds.add(item.candidateId);

    if (item.givenByCandidateId && !npcIds.has(item.givenByCandidateId)) {
      issues.push({
        code: "GENESIS_ITEM_GIVER_MISSING",
        message: `Inventory giver ${item.givenByCandidateId} does not exist`,
        path: "sections.inventory.items",
        severity: "error",
      });
    }
  }

  const factRefs: Array<{ path: string; ids: string[] }> = [
    ...(social?.npcs.map((npc) => ({ path: `npc:${npc.candidateId}`, ids: npc.originFactIds })) ?? []),
    ...(inventory?.items.map((item) => ({ path: `item:${item.candidateId}`, ids: item.originFactIds })) ?? []),
    ...(candidate.sections.memoryAndThreads?.memories.map((memory) => ({
      path: `memory:${memory.candidateId}`,
      ids: memory.originFactIds,
    })) ?? []),
    ...(candidate.sections.memoryAndThreads?.threads.map((thread) => ({
      path: `thread:${thread.candidateId}`,
      ids: thread.originFactIds,
    })) ?? []),
  ];

  for (const ref of factRefs) {
    for (const factId of ref.ids) {
      if (!originFactIds.has(factId)) {
        issues.push({
          code: "GENESIS_ORIGIN_FACT_REF_MISSING",
          message: `${ref.path} references unknown origin fact ${factId}`,
          path: ref.path,
          severity: "error",
        });
      }
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
