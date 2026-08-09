import { and, desc, eq, gt, isNull, notInArray, or, sql } from "drizzle-orm";

import type { CanonicalMemory } from "../../../domain/memory";
import { validateCanonicalMemory } from "../../../domain/memory";
import { compareMemoriesForRetrieval } from "../../../domain/memory-lifecycle";
import type {
  CanonicalMemoryMutation,
  CanonicalMemoryPort,
  CanonicalMemoryQuery,
  CanonicalMemoryUsageMutation,
  CanonicalMemoryUsageResult,
} from "../../../ports/canonical-memory.port";
import {
  MAX_MEMORY_RETRIEVAL_LIMIT,
  normalizeMemoryRetrievalLimit,
} from "../../../ports/canonical-memory.port";
import { getNpcDb, type Database } from "../../client";
import {
  canonicalMemories,
  canonicalMemoryUsages,
} from "../../schema/npc-intelligence/memories";

const MAX_MEMORY_RETRIEVAL_CANDIDATES = MAX_MEMORY_RETRIEVAL_LIMIT * 4;

class MemoryUsageRejectedError extends Error {}

function mapRow(row: typeof canonicalMemories.$inferSelect): CanonicalMemory {
  return {
    id: row.id,
    householdId: row.householdId,
    worldId: row.worldId,
    childProfileId: row.childProfileId,
    ownerType: row.ownerType as CanonicalMemory["ownerType"],
    ownerId: row.ownerId,
    kind: row.kind as CanonicalMemory["kind"],
    summary: row.summary,
    salience: Number(row.salience),
    confidence: Number(row.confidence),
    sourceType: row.sourceType as CanonicalMemory["sourceType"],
    sourceId: row.sourceId,
    storySessionId: row.storySessionId,
    outcomeId: row.outcomeId,
    effectKey: row.effectKey,
    provenance: row.provenance ?? [],
    lifecycle: row.lifecycle as CanonicalMemory["lifecycle"],
    supersedesMemoryId: row.supersedesMemoryId,
    createdAt: row.createdAt,
    lastReinforcedAt: row.lastReinforcedAt,
    expiresAt: row.expiresAt,
    archivedAt: row.archivedAt,
  };
}

function profileScope(input: { childProfileId?: string | null }) {
  return input.childProfileId == null
    ? isNull(canonicalMemories.childProfileId)
    : eq(canonicalMemories.childProfileId, input.childProfileId);
}

function mutationScope(input: CanonicalMemoryMutation) {
  return and(
    eq(canonicalMemories.id, input.memoryId),
    eq(canonicalMemories.householdId, input.householdId),
    eq(canonicalMemories.worldId, input.worldId),
    eq(canonicalMemories.ownerType, input.ownerType),
    eq(canonicalMemories.ownerId, input.ownerId),
    profileScope(input),
  );
}

export class DrizzleCanonicalMemoryRepository implements CanonicalMemoryPort {
  constructor(private readonly db: Database = getNpcDb()) {}

  async save(memory: CanonicalMemory): Promise<void> {
    validateCanonicalMemory(memory);

    await this.db
      .insert(canonicalMemories)
      .values({
        id: memory.id,
        householdId: memory.householdId,
        worldId: memory.worldId,
        childProfileId: memory.childProfileId ?? null,
        ownerType: memory.ownerType,
        ownerId: memory.ownerId,
        kind: memory.kind,
        summary: memory.summary,
        salience: String(memory.salience),
        confidence: String(memory.confidence),
        sourceType: memory.sourceType,
        sourceId: memory.sourceId,
        storySessionId: memory.storySessionId ?? null,
        outcomeId: memory.outcomeId ?? null,
        effectKey: memory.effectKey,
        provenance: memory.provenance,
        lifecycle: memory.lifecycle,
        supersedesMemoryId: memory.supersedesMemoryId ?? null,
        createdAt: memory.createdAt,
        lastReinforcedAt: memory.lastReinforcedAt ?? null,
        expiresAt: memory.expiresAt ?? null,
        archivedAt: memory.archivedAt ?? null,
      })
      .onConflictDoNothing({
        target: [
          canonicalMemories.householdId,
          canonicalMemories.worldId,
          canonicalMemories.effectKey,
        ],
      });
  }

  async listRelevant(query: CanonicalMemoryQuery): Promise<CanonicalMemory[]> {
    const limit = normalizeMemoryRetrievalLimit(query.limit);
    const candidateLimit = Math.min(
      Math.max(limit * 4, limit),
      MAX_MEMORY_RETRIEVAL_CANDIDATES,
    );

    const rows = await this.db
      .select()
      .from(canonicalMemories)
      .where(
        and(
          eq(canonicalMemories.householdId, query.householdId),
          eq(canonicalMemories.worldId, query.worldId),
          eq(canonicalMemories.ownerType, query.ownerType),
          eq(canonicalMemories.ownerId, query.ownerId),
          profileScope(query),
          notInArray(canonicalMemories.lifecycle, ["archived", "superseded"]),
          or(
            isNull(canonicalMemories.expiresAt),
            gt(canonicalMemories.expiresAt, query.now),
          ),
        ),
      )
      .orderBy(
        desc(canonicalMemories.salience),
        desc(canonicalMemories.confidence),
        desc(canonicalMemories.lastReinforcedAt),
        desc(canonicalMemories.createdAt),
      )
      .limit(candidateLimit);

    return rows
      .map(mapRow)
      .sort((left, right) =>
        compareMemoriesForRetrieval(left, right, query.now),
      )
      .slice(0, limit);
  }

  async reinforce(input: CanonicalMemoryMutation): Promise<boolean> {
    const rows = await this.db
      .update(canonicalMemories)
      .set({ lastReinforcedAt: input.at })
      .where(
        and(
          mutationScope(input),
          notInArray(canonicalMemories.lifecycle, ["archived", "superseded"]),
          or(
            isNull(canonicalMemories.expiresAt),
            gt(canonicalMemories.expiresAt, input.at),
          ),
        ),
      )
      .returning({ id: canonicalMemories.id });

    return rows.length === 1;
  }

  async reinforceForScene(
    input: CanonicalMemoryUsageMutation,
  ): Promise<CanonicalMemoryUsageResult> {
    try {
      return await this.db.transaction(async (tx) => {
        const usageRows = await tx
          .insert(canonicalMemoryUsages)
          .values({
            id: crypto.randomUUID(),
            householdId: input.householdId,
            worldId: input.worldId,
            childProfileId: input.childProfileId ?? null,
            ownerType: input.ownerType,
            ownerId: input.ownerId,
            memoryId: input.memoryId,
            sceneId: input.sceneId,
            usedAt: input.at,
          })
          .onConflictDoNothing({
            target: [
              canonicalMemoryUsages.householdId,
              canonicalMemoryUsages.worldId,
              canonicalMemoryUsages.sceneId,
              canonicalMemoryUsages.memoryId,
            ],
          })
          .returning({ id: canonicalMemoryUsages.id });

        if (usageRows.length === 0) return "duplicate";

        const memoryRows = await tx
          .update(canonicalMemories)
          .set({ lastReinforcedAt: input.at })
          .where(
            and(
              mutationScope(input),
              notInArray(canonicalMemories.lifecycle, [
                "archived",
                "superseded",
              ]),
              or(
                isNull(canonicalMemories.expiresAt),
                gt(canonicalMemories.expiresAt, input.at),
              ),
            ),
          )
          .returning({ id: canonicalMemories.id });

        if (memoryRows.length !== 1) {
          throw new MemoryUsageRejectedError();
        }

        return "applied";
      });
    } catch (error) {
      if (error instanceof MemoryUsageRejectedError) return "rejected";
      throw error;
    }
  }

  async archive(input: CanonicalMemoryMutation): Promise<boolean> {
    const rows = await this.db
      .update(canonicalMemories)
      .set({
        lifecycle: "archived",
        archivedAt: input.at,
      })
      .where(
        and(
          mutationScope(input),
          sql`${canonicalMemories.lifecycle} <> 'archived'`,
          sql`${canonicalMemories.lifecycle} <> 'superseded'`,
        ),
      )
      .returning({ id: canonicalMemories.id });

    return rows.length === 1;
  }
}
