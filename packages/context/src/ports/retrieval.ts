export type RetrievalSourceKind = "memory" | "npc" | "world-state" | "world-event";

export interface RetrievalQuery {
  householdId: string;
  childProfileId: string;
  worldId: string;
  generationIntent: string;
  query: string;
  limit: number;
  focalCharacterId?: string | undefined;
  storySessionId?: string | undefined;
  sourceKinds?: RetrievalSourceKind[] | undefined;
}

export interface RetrievalProvenance {
  sourceKind: RetrievalSourceKind;
  sourceId: string;
  authority: string;
  occurredAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface RetrievalCandidate<T = unknown> {
  stableId: string;
  relevance: number;
  summary: string;
  payload: T;
  provenance: RetrievalProvenance;
}

export interface RetrievalResult<T = unknown> {
  candidates: RetrievalCandidate<T>[];
  truncated: boolean;
}

export interface ContextRetrievalSource<T = unknown> {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult<T>>;
}

export const MAX_RETRIEVAL_LIMIT = 50;

export function normalizeRetrievalLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 1;
  return Math.min(MAX_RETRIEVAL_LIMIT, Math.max(1, Math.floor(limit)));
}

export function normalizeRetrievalCandidates<T>(
  candidates: RetrievalCandidate<T>[],
  limit: number,
): RetrievalCandidate<T>[] {
  const boundedLimit = normalizeRetrievalLimit(limit);
  const byStableId = new Map<string, RetrievalCandidate<T>>();

  for (const candidate of candidates) {
    if (!candidate.stableId || !Number.isFinite(candidate.relevance)) continue;

    const normalized = {
      ...candidate,
      relevance: Math.min(1, Math.max(0, candidate.relevance)),
    };
    const existing = byStableId.get(candidate.stableId);

    if (!existing || normalized.relevance > existing.relevance) {
      byStableId.set(candidate.stableId, normalized);
    }
  }

  return [...byStableId.values()]
    .sort((left, right) =>
      right.relevance === left.relevance
        ? left.stableId.localeCompare(right.stableId)
        : right.relevance - left.relevance,
    )
    .slice(0, boundedLimit);
}
