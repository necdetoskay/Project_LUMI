import type { CanonicalMemory, MemoryOwnerType } from "../domain/memory";

export const DEFAULT_MEMORY_RETRIEVAL_LIMIT = 12;
export const MAX_MEMORY_RETRIEVAL_LIMIT = 24;

export interface CanonicalMemoryQuery {
  householdId: string;
  worldId: string;
  ownerType: MemoryOwnerType;
  ownerId: string;
  childProfileId?: string | null;
  now: Date;
  limit?: number;
}

export interface CanonicalMemoryPort {
  save(memory: CanonicalMemory): Promise<void>;
  listRelevant(query: CanonicalMemoryQuery): Promise<CanonicalMemory[]>;
}

export function normalizeMemoryRetrievalLimit(limit?: number): number {
  if (limit == null) return DEFAULT_MEMORY_RETRIEVAL_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("memory retrieval limit must be a positive integer");
  }
  return Math.min(limit, MAX_MEMORY_RETRIEVAL_LIMIT);
}
