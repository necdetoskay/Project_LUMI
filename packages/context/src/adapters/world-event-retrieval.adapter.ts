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

export interface WorldEventRecord {
  id: string;
  worldId: string;
  eventType: string;
  aggregateVersion: number;
  actorHouseholdId?: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface WorldEventReader {
  listRecent(worldId: string, limit: number): Promise<WorldEventRecord[]>;
}

export class WorldEventRetrievalAdapter
  implements ContextRetrievalSource<WorldEventRecord>
{
  constructor(private readonly reader: WorldEventReader) {}

  async retrieve(
    query: RetrievalQuery,
  ): Promise<RetrievalResult<WorldEventRecord>> {
    if (query.sourceKinds && !query.sourceKinds.includes("world-event")) {
      return { candidates: [], truncated: false };
    }

    const limit = normalizeRetrievalLimit(query.limit);
    const events = await this.reader.listRecent(query.worldId, limit);
    const scoped = events.filter(
      (event) =>
        event.worldId === query.worldId &&
        (event.actorHouseholdId == null ||
          event.actorHouseholdId === query.householdId),
    );
    const candidates = normalizeRetrievalCandidates(
      scoped.map((event, index) => toCandidate(event, index, events.length)),
      limit,
    );

    return {
      candidates,
      truncated: events.length > candidates.length || events.length >= limit,
    };
  }
}

function toCandidate(
  event: WorldEventRecord,
  index: number,
  total: number,
): RetrievalCandidate<WorldEventRecord> {
  const recency = total <= 1 ? 1 : 1 - index / total;
  return {
    stableId: `world-event:${event.id}`,
    relevance: Math.max(0.1, recency),
    summary: summarizeEvent(event),
    payload: event,
    provenance: {
      sourceKind: "world-event",
      sourceId: event.id,
      authority: "world/event-store",
      occurredAt: event.createdAt.toISOString(),
    },
  };
}

function summarizeEvent(event: WorldEventRecord): string {
  const payloadSummary = Object.entries(event.payload)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
  return payloadSummary
    ? `${event.eventType}: ${payloadSummary}`
    : event.eventType;
}
