import { desc, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import { worldEventStore } from "../../schema/world";

export interface WorldEventReadRecord {
  id: string;
  worldId: string;
  eventType: string;
  aggregateVersion: number;
  actorHouseholdId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Read-only projection over the canonical world event store for context retrieval.
 * Ownership stays with the world package; context only consumes this authority.
 */
export class DrizzleWorldEventReader {
  constructor(private readonly db: QueryExecutor) {}

  async listRecent(worldId: string, limit: number): Promise<WorldEventReadRecord[]> {
    if (limit <= 0) return [];

    const rows = await this.db
      .select({
        id: worldEventStore.id,
        worldId: worldEventStore.worldId,
        eventType: worldEventStore.eventType,
        aggregateVersion: worldEventStore.aggregateVersion,
        actorHouseholdId: worldEventStore.actorHouseholdId,
        payload: worldEventStore.payload,
        createdAt: worldEventStore.createdAt,
      })
      .from(worldEventStore)
      .where(eq(worldEventStore.worldId, worldId))
      .orderBy(desc(worldEventStore.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      payload: row.payload as Record<string, unknown>,
    }));
  }
}
