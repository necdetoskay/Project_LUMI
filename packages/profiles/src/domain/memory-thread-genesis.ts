import crypto from "node:crypto";

export const MEMORY_THREAD_GENESIS_REVISION =
  "memory-thread-genesis.v1" as const;

export const MEMORY_SEED_KINDS = [
  "experience",
  "knowledge",
  "emotion",
  "promise",
  "discovery",
  "change",
] as const;
export type MemorySeedKind = (typeof MEMORY_SEED_KINDS)[number];

export const MEMORY_SEED_VISIBILITIES = [
  "user_visible",
  "known_to_character",
] as const;
export type MemorySeedVisibility = (typeof MEMORY_SEED_VISIBILITIES)[number];

export const ORIGIN_THREAD_VISIBILITIES = [
  "user_visible",
  "known_to_character",
  "known_to_family",
  "known_to_npc",
  "unknown_to_character",
  "system_only",
] as const;
export type OriginThreadVisibility =
  (typeof ORIGIN_THREAD_VISIBILITIES)[number];

export const ORIGIN_THREAD_STATUSES = [
  "dormant",
  "unresolved",
  "active",
  "partially_resolved",
  "resolved",
  "abandoned",
] as const;
export type OriginThreadStatus = (typeof ORIGIN_THREAD_STATUSES)[number];

export const ORIGIN_THREAD_INITIAL_STATUSES = [
  "dormant",
  "unresolved",
] as const;
export type OriginThreadInitialStatus =
  (typeof ORIGIN_THREAD_INITIAL_STATUSES)[number];

export const STORY_POTENTIAL_LEVELS = ["low", "medium", "high"] as const;
export type StoryPotentialLevel = (typeof STORY_POTENTIAL_LEVELS)[number];

export interface MemorySeedSuggestion {
  key: string;
  summary: string;
  kind: MemorySeedKind;
  visibility: MemorySeedVisibility;
  originFactIds: string[];
  relatedNpcIds: string[];
  relatedPlaceRefs: string[];
  relatedItemKeys: string[];
  relatedFearIds: string[];
  relatedGoalKeys: string[];
  rationale: string;
}

export interface OriginThreadSuggestion {
  key: string;
  summary: string;
  visibility: OriginThreadVisibility;
  initialStatus: OriginThreadInitialStatus;
  storyPotential: StoryPotentialLevel;
  originFactIds: string[];
  sourceQuestionIds: string[];
  sourceHookIds: string[];
  relatedNpcIds: string[];
  relatedPlaceRefs: string[];
  relatedItemKeys: string[];
  relatedFearIds: string[];
  relatedGoalKeys: string[];
  rationale: string;
}

export interface MemoryThreadGenesisSuggestion {
  key: string;
  title: string;
  memories: MemorySeedSuggestion[];
  threads: OriginThreadSuggestion[];
}

export interface MemorySeedProvenance {
  source: "origin";
  originFactIds: string[];
  rationale: string;
  seed: string;
  derivationRevision: typeof MEMORY_THREAD_GENESIS_REVISION;
}

export interface GenesisMemorySeed {
  candidateId: string;
  key: string;
  summary: string;
  kind: MemorySeedKind;
  visibility: MemorySeedVisibility;
  originFactIds: string[];
  relatedNpcIds: string[];
  relatedPlaceRefs: string[];
  relatedItemKeys: string[];
  relatedFearIds: string[];
  relatedGoalKeys: string[];
  provenance: MemorySeedProvenance;
}

export interface OriginThreadUsageState {
  activationCount: number;
  recentStoryIds: string[];
  lastStoryId: string | null;
  lastUsedAt: string | null;
}

export interface OriginThreadHistoryEntry {
  fromStatus: OriginThreadStatus;
  toStatus: OriginThreadStatus;
  storyId: string;
  outcomeId: string;
  evidenceRefs: string[];
  changedAt: string;
}

export interface OriginThreadProvenance {
  source: "origin";
  originFactIds: string[];
  sourceQuestionIds: string[];
  sourceHookIds: string[];
  rationale: string;
  seed: string;
  derivationRevision: typeof MEMORY_THREAD_GENESIS_REVISION;
}

export interface GenesisOriginThread {
  candidateId: string;
  key: string;
  summary: string;
  status: OriginThreadStatus;
  visibility: OriginThreadVisibility;
  storyPotential: StoryPotentialLevel;
  potential: number;
  originFactIds: string[];
  relatedNpcIds: string[];
  relatedPlaceRefs: string[];
  relatedItemKeys: string[];
  relatedFearIds: string[];
  relatedGoalKeys: string[];
  provenance: OriginThreadProvenance;
  usage: OriginThreadUsageState;
  history: OriginThreadHistoryEntry[];
}

export interface MemoryThreadGenesisManifest {
  characterId: string;
  memories: GenesisMemorySeed[];
  threads: GenesisOriginThread[];
  derivationRevision: typeof MEMORY_THREAD_GENESIS_REVISION;
}

export interface MemoryThreadGenesisValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  candidateId?: string;
}

export interface MemoryThreadGenesisReferenceSet {
  originFactIds: Iterable<string>;
  originQuestionIds: Iterable<string>;
  originHookIds: Iterable<string>;
  socialNpcIds: Iterable<string>;
  placeRefs: Iterable<string>;
  inventoryItemKeys: Iterable<string>;
  fearIds: Iterable<string>;
  goalKeys: Iterable<string>;
}

export interface MemoryThreadQualityInspection {
  duplicatePairs: Array<{ left: string; right: string; similarity: number }>;
  contradictionCandidates: Array<{
    left: string;
    right: string;
    similarity: number;
    reason: "negation_mismatch";
  }>;
  futureStoryYield: number;
  linkedMemoryRatio: number;
  openThreadRatio: number;
}

function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function stableId(input: {
  seed: string;
  characterId: string;
  kind: "memory" | "thread";
  key: string;
}): string {
  return `${input.kind}-${shortHash(
    `${input.seed}:${input.characterId}:${input.kind}:${input.key.trim().toLocaleLowerCase("en-US")}`,
  )}`;
}

export function storyPotentialToScore(level: StoryPotentialLevel): number {
  if (level === "high") return 0.9;
  if (level === "medium") return 0.65;
  return 0.35;
}

export function createMemoryThreadGenesisManifest(input: {
  characterId: string;
  seed: string;
  suggestion: MemoryThreadGenesisSuggestion;
}): MemoryThreadGenesisManifest {
  const memories = input.suggestion.memories.map((memory) => ({
    candidateId: stableId({
      seed: input.seed,
      characterId: input.characterId,
      kind: "memory",
      key: memory.key,
    }),
    key: memory.key,
    summary: memory.summary,
    kind: memory.kind,
    visibility: memory.visibility,
    originFactIds: [...memory.originFactIds],
    relatedNpcIds: [...memory.relatedNpcIds],
    relatedPlaceRefs: [...memory.relatedPlaceRefs],
    relatedItemKeys: [...memory.relatedItemKeys],
    relatedFearIds: [...memory.relatedFearIds],
    relatedGoalKeys: [...memory.relatedGoalKeys],
    provenance: {
      source: "origin" as const,
      originFactIds: [...memory.originFactIds],
      rationale: memory.rationale,
      seed: input.seed,
      derivationRevision: MEMORY_THREAD_GENESIS_REVISION,
    },
  }));

  const threads = input.suggestion.threads.map((thread) => ({
    candidateId: stableId({
      seed: input.seed,
      characterId: input.characterId,
      kind: "thread",
      key: thread.key,
    }),
    key: thread.key,
    summary: thread.summary,
    status: thread.initialStatus,
    visibility: thread.visibility,
    storyPotential: thread.storyPotential,
    potential: storyPotentialToScore(thread.storyPotential),
    originFactIds: [...thread.originFactIds],
    relatedNpcIds: [...thread.relatedNpcIds],
    relatedPlaceRefs: [...thread.relatedPlaceRefs],
    relatedItemKeys: [...thread.relatedItemKeys],
    relatedFearIds: [...thread.relatedFearIds],
    relatedGoalKeys: [...thread.relatedGoalKeys],
    provenance: {
      source: "origin" as const,
      originFactIds: [...thread.originFactIds],
      sourceQuestionIds: [...thread.sourceQuestionIds],
      sourceHookIds: [...thread.sourceHookIds],
      rationale: thread.rationale,
      seed: input.seed,
      derivationRevision: MEMORY_THREAD_GENESIS_REVISION,
    },
    usage: {
      activationCount: 0,
      recentStoryIds: [],
      lastStoryId: null,
      lastUsedAt: null,
    },
    history: [],
  }));

  return {
    characterId: input.characterId,
    memories,
    threads,
    derivationRevision: MEMORY_THREAD_GENESIS_REVISION,
  };
}

export function isCharacterVisibleThread(thread: GenesisOriginThread): boolean {
  return (
    thread.visibility === "user_visible" ||
    thread.visibility === "known_to_character"
  );
}

export function isOpenOriginThread(thread: GenesisOriginThread): boolean {
  return thread.status !== "resolved" && thread.status !== "abandoned";
}

export function getOriginThreadPlanningWeight(
  thread: GenesisOriginThread,
  recentThreadIds: readonly string[] = [],
): number {
  if (!isOpenOriginThread(thread)) return 0;

  const recentUseCount = recentThreadIds.filter(
    (candidateId) => candidateId === thread.candidateId,
  ).length;
  const lifecycleMultiplier = thread.status === "dormant" ? 0.35 : 1;
  const repetitionMultiplier = Math.pow(0.5, recentUseCount);
  const historicalUseMultiplier = Math.pow(
    0.92,
    Math.min(thread.usage.activationCount, 8),
  );

  return round4(
    thread.potential *
      lifecycleMultiplier *
      repetitionMultiplier *
      historicalUseMultiplier,
  );
}

export function recordOriginThreadUsage(
  thread: GenesisOriginThread,
  input: { storyId: string; usedAt: string },
): GenesisOriginThread {
  if (!isOpenOriginThread(thread)) {
    throw new Error("ORIGIN_THREAD_TERMINAL_CANNOT_BE_USED");
  }
  if (thread.usage.recentStoryIds.includes(input.storyId)) {
    return structuredClone(thread);
  }

  return {
    ...structuredClone(thread),
    usage: {
      activationCount: thread.usage.activationCount + 1,
      recentStoryIds: [...thread.usage.recentStoryIds, input.storyId].slice(-4),
      lastStoryId: input.storyId,
      lastUsedAt: input.usedAt,
    },
  };
}

const ALLOWED_TRANSITIONS: Record<OriginThreadStatus, OriginThreadStatus[]> = {
  dormant: ["unresolved", "active", "abandoned"],
  unresolved: ["active", "partially_resolved", "resolved", "abandoned"],
  active: ["unresolved", "partially_resolved", "resolved", "abandoned"],
  partially_resolved: ["active", "resolved", "abandoned"],
  resolved: [],
  abandoned: [],
};

export function transitionOriginThread(
  thread: GenesisOriginThread,
  input: {
    toStatus: OriginThreadStatus;
    storyId: string;
    outcomeId: string;
    evidenceRefs: string[];
    changedAt: string;
  },
): GenesisOriginThread {
  if (thread.status === input.toStatus) return structuredClone(thread);
  if (!ALLOWED_TRANSITIONS[thread.status].includes(input.toStatus)) {
    throw new Error(
      `ORIGIN_THREAD_INVALID_TRANSITION:${thread.status}->${input.toStatus}`,
    );
  }

  return {
    ...structuredClone(thread),
    status: input.toStatus,
    history: [
      ...thread.history,
      {
        fromStatus: thread.status,
        toStatus: input.toStatus,
        storyId: input.storyId,
        outcomeId: input.outcomeId,
        evidenceRefs: [...input.evidenceRefs],
        changedAt: input.changedAt,
      },
    ],
  };
}

export function validateMemoryThreadGenesisManifest(input: {
  manifest: MemoryThreadGenesisManifest;
  references: MemoryThreadGenesisReferenceSet;
}): MemoryThreadGenesisValidationIssue[] {
  const issues: MemoryThreadGenesisValidationIssue[] = [];
  const refs = materializeReferenceSets(input.references);

  if (
    input.manifest.memories.length < 3 ||
    input.manifest.memories.length > 5
  ) {
    issues.push({
      code: "MEMORY_GENESIS_COUNT_OUT_OF_RANGE",
      message: "Memory Genesis must contain 3-5 meaningful memory seeds",
      severity: "error",
    });
  }
  if (input.manifest.threads.length === 0) {
    issues.push({
      code: "ORIGIN_THREAD_REQUIRED",
      message: "At least one unresolved or dormant Origin Thread is required",
      severity: "error",
    });
  }

  validateUniqueEntries(input.manifest.memories, "memory", issues);
  validateUniqueEntries(input.manifest.threads, "thread", issues);

  for (const memory of input.manifest.memories) {
    if (!MEMORY_SEED_VISIBILITIES.includes(memory.visibility)) {
      issues.push({
        code: "MEMORY_GENESIS_HIDDEN_KNOWLEDGE",
        message: `${memory.candidateId} cannot encode knowledge unknown to the character as a memory`,
        severity: "error",
        candidateId: memory.candidateId,
      });
    }
    validateLinks(memory, refs, issues);
  }

  for (const thread of input.manifest.threads) {
    if (
      !ORIGIN_THREAD_INITIAL_STATUSES.includes(
        thread.status as OriginThreadInitialStatus,
      )
    ) {
      issues.push({
        code: "ORIGIN_THREAD_INVALID_INITIAL_STATUS",
        message: `${thread.candidateId} must start dormant or unresolved`,
        severity: "error",
        candidateId: thread.candidateId,
      });
    }
    if (thread.potential < 0 || thread.potential > 1) {
      issues.push({
        code: "ORIGIN_THREAD_POTENTIAL_RANGE",
        message: `${thread.candidateId} potential must be within [0,1]`,
        severity: "error",
        candidateId: thread.candidateId,
      });
    }
    if (
      thread.provenance.sourceQuestionIds.length === 0 &&
      thread.provenance.sourceHookIds.length === 0
    ) {
      issues.push({
        code: "ORIGIN_THREAD_SOURCE_REQUIRED",
        message: `${thread.candidateId} must derive from an unresolved question or future hook`,
        severity: "error",
        candidateId: thread.candidateId,
      });
    }
    for (const questionId of thread.provenance.sourceQuestionIds) {
      requireReference(
        refs.originQuestionIds,
        questionId,
        "ORIGIN_THREAD_QUESTION_REF_MISSING",
        thread.candidateId,
        issues,
      );
    }
    for (const hookId of thread.provenance.sourceHookIds) {
      requireReference(
        refs.originHookIds,
        hookId,
        "ORIGIN_THREAD_HOOK_REF_MISSING",
        thread.candidateId,
        issues,
      );
    }
    validateLinks(thread, refs, issues);
  }

  const quality = inspectMemoryThreadQuality(input.manifest);
  for (const pair of quality.duplicatePairs) {
    issues.push({
      code: "MEMORY_THREAD_DUPLICATE_SEMANTIC",
      message: `${pair.left} and ${pair.right} appear duplicative`,
      severity: "warning",
    });
  }
  for (const pair of quality.contradictionCandidates) {
    issues.push({
      code: "MEMORY_THREAD_CONTRADICTION_CANDIDATE",
      message: `${pair.left} and ${pair.right} require contradiction review`,
      severity: "warning",
    });
  }

  return issues;
}

export function inspectMemoryThreadQuality(
  manifest: MemoryThreadGenesisManifest,
): MemoryThreadQualityInspection {
  const entries = [
    ...manifest.memories.map((entry) => ({
      id: entry.candidateId,
      summary: entry.summary,
    })),
    ...manifest.threads.map((entry) => ({
      id: entry.candidateId,
      summary: entry.summary,
    })),
  ];
  const duplicatePairs: MemoryThreadQualityInspection["duplicatePairs"] = [];
  const contradictionCandidates: MemoryThreadQualityInspection["contradictionCandidates"] =
    [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < entries.length;
      rightIndex += 1
    ) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (!left || !right) continue;
      const similarity = lexicalSimilarity(left.summary, right.summary);
      if (similarity >= 0.82) {
        duplicatePairs.push({ left: left.id, right: right.id, similarity });
      } else if (
        similarity >= 0.52 &&
        containsNegation(left.summary) !== containsNegation(right.summary)
      ) {
        contradictionCandidates.push({
          left: left.id,
          right: right.id,
          similarity,
          reason: "negation_mismatch",
        });
      }
    }
  }

  const linkedMemories = manifest.memories.filter(
    (memory) =>
      memory.relatedNpcIds.length +
        memory.relatedPlaceRefs.length +
        memory.relatedItemKeys.length +
        memory.relatedFearIds.length +
        memory.relatedGoalKeys.length >
      0,
  ).length;
  const linkedMemoryRatio =
    manifest.memories.length === 0
      ? 0
      : linkedMemories / manifest.memories.length;
  const openThreads = manifest.threads.filter(isOpenOriginThread).length;
  const openThreadRatio =
    manifest.threads.length === 0 ? 0 : openThreads / manifest.threads.length;
  const sourceRichThreads = manifest.threads.filter(
    (thread) =>
      thread.provenance.sourceQuestionIds.length +
        thread.provenance.sourceHookIds.length >
      0,
  ).length;
  const sourceRichRatio =
    manifest.threads.length === 0
      ? 0
      : sourceRichThreads / manifest.threads.length;
  const futureStoryYield = round4(
    clamp01(
      linkedMemoryRatio * 0.25 +
        openThreadRatio * 0.4 +
        sourceRichRatio * 0.35 -
        Math.min(0.3, duplicatePairs.length * 0.08),
    ),
  );

  return {
    duplicatePairs,
    contradictionCandidates,
    futureStoryYield,
    linkedMemoryRatio: round4(linkedMemoryRatio),
    openThreadRatio: round4(openThreadRatio),
  };
}

function materializeReferenceSets(references: MemoryThreadGenesisReferenceSet) {
  return {
    originFactIds: new Set(references.originFactIds),
    originQuestionIds: new Set(references.originQuestionIds),
    originHookIds: new Set(references.originHookIds),
    socialNpcIds: new Set(references.socialNpcIds),
    placeRefs: new Set(references.placeRefs),
    inventoryItemKeys: new Set(references.inventoryItemKeys),
    fearIds: new Set(references.fearIds),
    goalKeys: new Set(references.goalKeys),
  };
}

type MaterializedReferences = ReturnType<typeof materializeReferenceSets>;

type LinkedEntry = Pick<
  GenesisMemorySeed | GenesisOriginThread,
  | "candidateId"
  | "originFactIds"
  | "relatedNpcIds"
  | "relatedPlaceRefs"
  | "relatedItemKeys"
  | "relatedFearIds"
  | "relatedGoalKeys"
>;

function validateLinks(
  entry: LinkedEntry,
  refs: MaterializedReferences,
  issues: MemoryThreadGenesisValidationIssue[],
) {
  for (const id of entry.originFactIds) {
    requireReference(
      refs.originFactIds,
      id,
      "MEMORY_THREAD_ORIGIN_FACT_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
  for (const id of entry.relatedNpcIds) {
    requireReference(
      refs.socialNpcIds,
      id,
      "MEMORY_THREAD_NPC_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
  for (const id of entry.relatedPlaceRefs) {
    requireReference(
      refs.placeRefs,
      id,
      "MEMORY_THREAD_PLACE_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
  for (const id of entry.relatedItemKeys) {
    requireReference(
      refs.inventoryItemKeys,
      id,
      "MEMORY_THREAD_ITEM_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
  for (const id of entry.relatedFearIds) {
    requireReference(
      refs.fearIds,
      id,
      "MEMORY_THREAD_FEAR_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
  for (const id of entry.relatedGoalKeys) {
    requireReference(
      refs.goalKeys,
      id,
      "MEMORY_THREAD_GOAL_REF_MISSING",
      entry.candidateId,
      issues,
    );
  }
}

function requireReference(
  allowed: Set<string>,
  value: string,
  code: string,
  candidateId: string,
  issues: MemoryThreadGenesisValidationIssue[],
) {
  if (!allowed.has(value)) {
    issues.push({
      code,
      message: `${candidateId} references unknown id ${value}`,
      severity: "error",
      candidateId,
    });
  }
}

function validateUniqueEntries(
  entries: Array<{ candidateId: string; key: string; summary: string }>,
  kind: "memory" | "thread",
  issues: MemoryThreadGenesisValidationIssue[],
) {
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = entry.key.trim().toLocaleLowerCase("en-US");
    if (!key || keys.has(key)) {
      issues.push({
        code: `MEMORY_THREAD_DUPLICATE_${kind.toUpperCase()}_KEY`,
        message: `${kind} key '${entry.key}' must be unique and non-empty`,
        severity: "error",
        candidateId: entry.candidateId,
      });
    }
    keys.add(key);
    if (ids.has(entry.candidateId)) {
      issues.push({
        code: `MEMORY_THREAD_DUPLICATE_${kind.toUpperCase()}_ID`,
        message: `${kind} id '${entry.candidateId}' must be stable and unique`,
        severity: "error",
        candidateId: entry.candidateId,
      });
    }
    ids.add(entry.candidateId);
    if (!entry.summary.trim()) {
      issues.push({
        code: "MEMORY_THREAD_EMPTY_SUMMARY",
        message: `${entry.candidateId} summary must not be empty`,
        severity: "error",
        candidateId: entry.candidateId,
      });
    }
  }
}

function lexicalSimilarity(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return round4(intersection / union.size);
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("tr-TR")
      .split(/[^a-z0-9çğıöşü]+/iu)
      .filter((token) => token.length >= 3),
  );
}

const NEGATIONS = new Set([
  "not",
  "never",
  "none",
  "değil",
  "degil",
  "asla",
  "yok",
  "hiç",
  "hic",
]);

function containsNegation(value: string): boolean {
  return [...tokenSet(value)].some((token) => NEGATIONS.has(token));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
