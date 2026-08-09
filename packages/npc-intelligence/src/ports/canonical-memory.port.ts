import type { CanonicalMemory, MemoryOwnerType } from "../domain/memory";

export const DEFAULT_MEMORY_RETRIEVAL_LIMIT = 12;
export const MAX_MEMORY_RETRIEVAL_LIMIT = 24;

export interface CanonicalMemoryScope {
  householdId: string;
  worldId: string;
  ownerType: MemoryOwnerType;
  ownerId: string;
  childProfileId?: string | null;
}

export interface CanonicalMemoryQuery extends CanonicalMemoryScope {
  now: Date;
  limit?: number;
}

export interface CanonicalMemoryMutation extends CanonicalMemoryScope {
  memoryId: string;
  at: Date;
}

export interface CanonicalMemoryUsageMutation extends CanonicalMemoryMutation {
  sceneId: string;
}

export type CanonicalMemoryUsageResult = "applied" | "duplicate" | "rejected";

export interface CanonicalMemoryPort {
  save(memory: CanonicalMemory): Promise<void>;
  listRelevant(query: CanonicalMemoryQuery): Promise<CanonicalMemory[]>;
  reinforce(input: CanonicalMemoryMutation): Promise<boolean>;
  reinforceForScene(
    input: CanonicalMemoryUsageMutation,
  ): Promise<CanonicalMemoryUsageResult>;
  archive(input: CanonicalMemoryMutation): Promise<boolean>;
}

export function normalizeMemoryRetrievalLimit(limit?: number): number {
  if (limit == null) return DEFAULT_MEMORY_RETRIEVAL_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("memory retrieval limit must be a positive integer");
  }
  return Math.min(limit, MAX_MEMORY_RETRIEVAL_LIMIT);
}
