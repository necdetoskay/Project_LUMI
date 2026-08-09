import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import type { CanonicalMemory } from "../../../domain/memory";
import { isRetrievableMemory, validateCanonicalMemory } from "../../../domain/memory";
import type {
  CanonicalMemoryPort,
  CanonicalMemoryQuery,
} from "../../../ports/canonical-memory.port";
import { normalizeMemoryRetrievalLimit } from "../../../ports/canonical-memory.port";
import { getNpcDb, type Database } from "../../client";
import { canonicalMemories } from "../../schema/npc-intelligence/memories";

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
    const scope = [
      eq(canonicalMemories.householdId, query.householdId),
      eq(canonicalMemories.worldId, query.worldId),
      eq(canonicalMemories.ownerType, query.ownerType),
      eq(canonicalMemories.ownerId, query.ownerId),
      or(isNull(canonicalMemories.expiresAt), gt(canonicalMemories.expiresAt, query.now))!,
    ];

    if (query.childProfileId !== undefined) {
      scope.push(
        query.childProfileId === null
          ? isNull(canonicalMemories.childProfileId)
          : eq(canonicalMemories.childProfileId, query.childProfileId),
      );
    }

    const rows = await this.db
      .select()
      .from(canonicalMemories)
      .where(and(...scope))
      .orderBy(
        desc(canonicalMemories.salience),
        desc(canonicalMemories.confidence),
        desc(canonicalMemories.createdAt),
      )
      .limit(limit);

    return rows.map(mapRow).filter((memory) => isRetrievableMemory(memory, query.now));
  }
}
