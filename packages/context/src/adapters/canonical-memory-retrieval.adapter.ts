import type {
  ContextRetrievalSource,
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalResult,
} from "../ports";
import {
  normalizeRetrievalCandidates,
  normalizeRetrievalLimit,
} from "../ports";

export interface CanonicalMemoryRecord {
  id: string;
  householdId: string;
  worldId: string;
  childProfileId?: string | null;
  ownerType: "character" | "npc" | "profile";
  ownerId: string;
  summary: string;
  salience: number;
  confidence: number;
  sourceType: string;
  sourceId: string;
  createdAt: Date;
  lastReinforcedAt?: Date | null;
}

export interface CanonicalMemoryReader {
  listRelevant(input: {
    householdId: string;
    worldId: string;
    ownerType: "character" | "npc" | "profile";
    ownerId: string;
    childProfileId?: string | null;
    now: Date;
    limit?: number;
  }): Promise<CanonicalMemoryRecord[]>;
}

export class CanonicalMemoryRetrievalAdapter
  implements ContextRetrievalSource<CanonicalMemoryRecord>
{
  constructor(
    private readonly reader: CanonicalMemoryReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async retrieve(
    query: RetrievalQuery,
  ): Promise<RetrievalResult<CanonicalMemoryRecord>> {
    if (query.sourceKinds && !query.sourceKinds.includes("memory")) {
      return { candidates: [], truncated: false };
    }

    const ownerType = query.focalCharacterId ? "character" : "profile";
    const ownerId = query.focalCharacterId ?? query.childProfileId;
    const limit = Math.min(normalizeRetrievalLimit(query.limit), 24);
    const memories = await this.reader.listRelevant({
      householdId: query.householdId,
      worldId: query.worldId,
      ownerType,
      ownerId,
      childProfileId: query.childProfileId,
      now: this.now(),
      limit,
    });

    const scoped = memories.filter(
      (memory) =>
        memory.householdId === query.householdId &&
        memory.worldId === query.worldId &&
        (memory.childProfileId == null ||
          memory.childProfileId === query.childProfileId),
    );
    const candidates = normalizeRetrievalCandidates(
      scoped.map(toCandidate),
      limit,
    );

    return {
      candidates,
      truncated:
        memories.length > candidates.length || memories.length >= limit,
    };
  }
}

function toCandidate(
  memory: CanonicalMemoryRecord,
): RetrievalCandidate<CanonicalMemoryRecord> {
  return {
    stableId: `memory:${memory.id}`,
    relevance: clamp01(memory.salience * memory.confidence),
    summary: memory.summary,
    payload: memory,
    provenance: {
      sourceKind: "memory",
      sourceId: memory.sourceId,
      authority: "npc-intelligence/canonical-memory",
      occurredAt: memory.createdAt.toISOString(),
      updatedAt: memory.lastReinforcedAt?.toISOString(),
    },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
