import { assertConfidence, assertNonEmptyString } from "./validation";

export const MEMORY_OWNER_TYPES = ["character", "npc", "profile"] as const;
export type MemoryOwnerType = (typeof MEMORY_OWNER_TYPES)[number];

export const MEMORY_KINDS = [
  "experience",
  "knowledge",
  "emotion",
  "promise",
  "discovery",
  "change",
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_SOURCE_TYPES = [
  "story_outcome",
  "world_event",
  "npc_belief",
  "direct_observation",
  "system_commit",
] as const;
export type MemorySourceType = (typeof MEMORY_SOURCE_TYPES)[number];

export const MEMORY_LIFECYCLES = [
  "durable",
  "decaying",
  "superseded",
  "archived",
] as const;
export type MemoryLifecycle = (typeof MEMORY_LIFECYCLES)[number];

export const MAX_MEMORY_SUMMARY_LENGTH = 500;
export const MAX_MEMORY_PROVENANCE = 20;

export interface CanonicalMemory {
  id: string;
  householdId: string;
  worldId: string;
  childProfileId?: string | null;
  ownerType: MemoryOwnerType;
  ownerId: string;
  kind: MemoryKind;
  summary: string;
  salience: number;
  confidence: number;
  sourceType: MemorySourceType;
  sourceId: string;
  storySessionId?: string | null;
  outcomeId?: string | null;
  effectKey: string;
  provenance: string[];
  lifecycle: MemoryLifecycle;
  /** Points from the replacement memory to the historical memory it supersedes. */
  supersedesMemoryId?: string | null;
  createdAt: Date;
  lastReinforcedAt?: Date | null;
  expiresAt?: Date | null;
  /** Set when this row itself leaves active retrieval (superseded or archived). */
  archivedAt?: Date | null;
}

export function isRetrievableMemory(
  memory: CanonicalMemory,
  now: Date,
): boolean {
  if (memory.lifecycle === "archived" || memory.lifecycle === "superseded") {
    return false;
  }
  if (memory.expiresAt && memory.expiresAt <= now) return false;
  return true;
}

export function validateCanonicalMemory(memory: CanonicalMemory): void {
  assertNonEmptyString(memory.id, "memory.id");
  assertNonEmptyString(memory.householdId, "memory.householdId");
  assertNonEmptyString(memory.worldId, "memory.worldId");
  if (memory.childProfileId != null) {
    assertNonEmptyString(memory.childProfileId, "memory.childProfileId");
  }
  assertNonEmptyString(memory.ownerId, "memory.ownerId");
  assertNonEmptyString(memory.summary, "memory.summary");
  assertNonEmptyString(memory.sourceId, "memory.sourceId");
  assertNonEmptyString(memory.effectKey, "memory.effectKey");

  if (memory.summary.length > MAX_MEMORY_SUMMARY_LENGTH) {
    throw new Error(
      `memory.summary exceeds ${MAX_MEMORY_SUMMARY_LENGTH} characters`,
    );
  }

  assertConfidence(memory.salience, "memory.salience");
  assertConfidence(memory.confidence, "memory.confidence");

  if (!(MEMORY_OWNER_TYPES as readonly string[]).includes(memory.ownerType)) {
    throw new Error(`Unknown memory owner type: ${memory.ownerType}`);
  }
  if (!(MEMORY_KINDS as readonly string[]).includes(memory.kind)) {
    throw new Error(`Unknown memory kind: ${memory.kind}`);
  }
  if (!(MEMORY_SOURCE_TYPES as readonly string[]).includes(memory.sourceType)) {
    throw new Error(`Unknown memory source type: ${memory.sourceType}`);
  }
  if (!(MEMORY_LIFECYCLES as readonly string[]).includes(memory.lifecycle)) {
    throw new Error(`Unknown memory lifecycle: ${memory.lifecycle}`);
  }
  if (memory.provenance.length > MAX_MEMORY_PROVENANCE) {
    throw new Error(
      `memory.provenance exceeds ${MAX_MEMORY_PROVENANCE} entries`,
    );
  }

  for (const entry of memory.provenance) {
    assertNonEmptyString(entry, "memory.provenance[]");
  }

  if (
    (memory.lifecycle === "superseded" || memory.lifecycle === "archived") &&
    !memory.archivedAt
  ) {
    throw new Error(
      `${memory.lifecycle} memory must include archivedAt to preserve lifecycle evidence`,
    );
  }
  if (memory.supersedesMemoryId != null) {
    assertNonEmptyString(memory.supersedesMemoryId, "memory.supersedesMemoryId");
    if (memory.supersedesMemoryId === memory.id) {
      throw new Error("memory cannot supersede itself");
    }
  }
}
