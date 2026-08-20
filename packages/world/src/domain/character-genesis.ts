import { validateCharacterTraitEvidenceReferences } from "./character-genesis-trait-evidence";
import {
  validateCharacterTraitState,
  type CharacterTraitDerivationState,
} from "./character-genesis-traits";
import {
  validateGenesisEnvironment,
  type GenesisEnvironmentState,
} from "./character-genesis-environment";

export const CHARACTER_GENESIS_STATUSES = [
  "staged",
  "selected",
  "committed",
] as const;

export type CharacterGenesisStatus =
  (typeof CHARACTER_GENESIS_STATUSES)[number];

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

export interface GenesisOriginQuestion {
  id: string;
  summary: string;
  visibility: GenesisVisibility;
  relatedFactIds: string[];
}

export interface GenesisOriginHook {
  id: string;
  summary: string;
  relatedFactIds: string[];
  potential: number;
}

export interface GenesisOriginState {
  summary: string;
  narrative: string;
  facts: GenesisOriginFact[];
  summaryFactIds?: string[];
  unresolvedQuestions?: GenesisOriginQuestion[];
  storyHooks?: GenesisOriginHook[];
}

export interface CharacterVisibleGenesisOriginContext {
  summary: string;
  facts: GenesisOriginFact[];
}

export type GenesisTraitState = CharacterTraitDerivationState;

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

export type { GenesisEnvironmentState } from "./character-genesis-environment";

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

function cloneSections(
  sections: CharacterGenesisSections,
): CharacterGenesisSections {
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

export function buildCharacterVisibleOriginContext(
  origin: GenesisOriginState,
): CharacterVisibleGenesisOriginContext {
  const visibleFacts = origin.facts.filter((fact) =>
    isCharacterVisibleOriginFact(fact),
  );
  const visibleFactIds = new Set(visibleFacts.map((fact) => fact.id));
  const requestedIds =
    origin.summaryFactIds ?? visibleFacts.map((fact) => fact.id);
  const summaryFacts = requestedIds
    .filter((id) => visibleFactIds.has(id))
    .map((id) => visibleFacts.find((fact) => fact.id === id))
    .filter((fact): fact is GenesisOriginFact => fact !== undefined);

  return {
    summary: origin.summary,
    facts: structuredClone(summaryFacts),
  };
}

function isCharacterVisibleOriginFact(fact: GenesisOriginFact): boolean {
  return (
    fact.visibility === "user_visible" ||
    fact.visibility === "known_to_character"
  );
}

export function validateCharacterGenesisStructure(
  candidate: CharacterGenesisPackage,
): GenesisValidationResult {
  const issues: GenesisValidationIssue[] = [];
  const social = candidate.sections.social;
  const inventory = candidate.sections.inventory;
  const origin = candidate.sections.origin;
  const traits = candidate.sections.traits;

  const originFactIds = new Set(origin?.facts.map((fact) => fact.id) ?? []);
  if (originFactIds.size !== (origin?.facts.length ?? 0)) {
    issues.push({
      code: "GENESIS_DUPLICATE_ORIGIN_FACT",
      message: "Origin fact ids must be unique",
      path: "sections.origin.facts",
      severity: "error",
    });
  }

  const originFactById = new Map(
    origin?.facts.map((fact) => [fact.id, fact] as const) ?? [],
  );
  for (const factId of origin?.summaryFactIds ?? []) {
    const fact = originFactById.get(factId);
    if (!fact) {
      issues.push({
        code: "GENESIS_ORIGIN_SUMMARY_FACT_MISSING",
        message: `Origin summary references unknown fact ${factId}`,
        path: "sections.origin.summaryFactIds",
        severity: "error",
      });
      continue;
    }
    if (!isCharacterVisibleOriginFact(fact)) {
      issues.push({
        code: "GENESIS_ORIGIN_SUMMARY_HIDDEN_FACT",
        message: `Origin summary cannot derive from hidden fact ${factId}`,
        path: "sections.origin.summaryFactIds",
        severity: "error",
      });
    }
  }

  const questionIds = new Set<string>();
  for (const question of origin?.unresolvedQuestions ?? []) {
    if (questionIds.has(question.id)) {
      issues.push({
        code: "GENESIS_DUPLICATE_ORIGIN_QUESTION",
        message: `Origin question id ${question.id} is duplicated`,
        path: "sections.origin.unresolvedQuestions",
        severity: "error",
      });
    }
    questionIds.add(question.id);
    for (const factId of question.relatedFactIds) {
      if (!originFactIds.has(factId)) {
        issues.push({
          code: "GENESIS_ORIGIN_QUESTION_FACT_MISSING",
          message: `Origin question ${question.id} references unknown fact ${factId}`,
          path: "sections.origin.unresolvedQuestions",
          severity: "error",
        });
      }
    }
  }

  const hookIds = new Set<string>();
  for (const hook of origin?.storyHooks ?? []) {
    if (hookIds.has(hook.id)) {
      issues.push({
        code: "GENESIS_DUPLICATE_ORIGIN_HOOK",
        message: `Origin hook id ${hook.id} is duplicated`,
        path: "sections.origin.storyHooks",
        severity: "error",
      });
    }
    hookIds.add(hook.id);
    if (hook.potential < 0 || hook.potential > 1) {
      issues.push({
        code: "GENESIS_ORIGIN_HOOK_POTENTIAL_RANGE",
        message: `Origin hook ${hook.id} potential must be within [0,1]`,
        path: "sections.origin.storyHooks",
        severity: "error",
      });
    }
    for (const factId of hook.relatedFactIds) {
      if (!originFactIds.has(factId)) {
        issues.push({
          code: "GENESIS_ORIGIN_HOOK_FACT_MISSING",
          message: `Origin hook ${hook.id} references unknown fact ${factId}`,
          path: "sections.origin.storyHooks",
          severity: "error",
        });
      }
    }
  }

  if (origin && (origin.unresolvedQuestions?.length ?? 0) === 0) {
    issues.push({
      code: "GENESIS_ORIGIN_NO_UNRESOLVED_QUESTION",
      message:
        "Origin should deliberately preserve at least one unresolved question",
      path: "sections.origin.unresolvedQuestions",
      severity: "warning",
    });
  }
  if (origin && (origin.storyHooks?.length ?? 0) === 0) {
    issues.push({
      code: "GENESIS_ORIGIN_NO_STORY_HOOK",
      message: "Origin should preserve at least one future-story hook",
      path: "sections.origin.storyHooks",
      severity: "warning",
    });
  }

  if (traits) {
    const traitValidation = validateCharacterTraitState(traits);
    for (const issue of traitValidation.issues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        path: "sections.traits",
        severity: issue.severity,
      });
    }

    const referenceIssues = validateCharacterTraitEvidenceReferences({
      originFactIds,
      evidence: traits.evidence,
      contextual: traits.contextual,
    });
    for (const issue of referenceIssues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        path: "sections.traits",
        severity: issue.severity,
      });
    }
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
    if (
      !npcIds.has(relationship.fromCandidateId) &&
      relationship.fromCandidateId !== candidate.characterId
    ) {
      issues.push({
        code: "GENESIS_RELATIONSHIP_FROM_MISSING",
        message: `Relationship source ${relationship.fromCandidateId} does not exist`,
        path: "sections.social.relationships",
        severity: "error",
      });
    }
    if (
      !npcIds.has(relationship.toCandidateId) &&
      relationship.toCandidateId !== candidate.characterId
    ) {
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
    ...(social?.npcs.map((npc) => ({
      path: `npc:${npc.candidateId}`,
      ids: npc.originFactIds,
    })) ?? []),
    ...(inventory?.items.map((item) => ({
      path: `item:${item.candidateId}`,
      ids: item.originFactIds,
    })) ?? []),
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

  if (candidate.sections.environment) {
    const environmentValidation = validateGenesisEnvironment(
      candidate.sections.environment,
    );
    for (const issue of environmentValidation.issues) {
      issues.push({
        code: issue.code,
        message: issue.message,
        path: "sections.environment",
        severity: issue.severity,
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
