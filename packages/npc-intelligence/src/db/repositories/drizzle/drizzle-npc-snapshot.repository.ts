import { and, asc, eq } from "drizzle-orm";
import { getNpcDb, type Database } from "../../client";
import { npcSnapshots } from "../../schema/npc-intelligence/npc-snapshots";

export interface CanonicalNpcSnapshot {
  npcId: string;
  householdId: string;
  worldId: string;
  childProfileId: string;
  characterId: string;
  locationId: string | null;
  needTypes: string[];
  relationshipToCharacter: number;
  lastInteractionAt: Date;
  updatedAt: Date;
}

export type UpsertCanonicalNpcSnapshotInput = CanonicalNpcSnapshot;

export class DrizzleNpcSnapshotRepository {
  constructor(private readonly db: Database = getNpcDb()) {}

  async upsert(input: UpsertCanonicalNpcSnapshotInput): Promise<void> {
    await this.db
      .insert(npcSnapshots)
      .values({
        id: crypto.randomUUID(),
        npcId: input.npcId,
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        characterId: input.characterId,
        locationId: input.locationId,
        needTypes: [...input.needTypes],
        relationshipToCharacter: String(input.relationshipToCharacter),
        lastInteractionAt: input.lastInteractionAt,
        updatedAt: input.updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          npcSnapshots.householdId,
          npcSnapshots.worldId,
          npcSnapshots.childProfileId,
          npcSnapshots.npcId,
        ],
        set: {
          characterId: input.characterId,
          locationId: input.locationId,
          needTypes: [...input.needTypes],
          relationshipToCharacter: String(input.relationshipToCharacter),
          lastInteractionAt: input.lastInteractionAt,
          updatedAt: input.updatedAt,
        },
      });
  }

  async listForWorker(
    householdId: string,
    worldId: string,
    limit = 64,
  ): Promise<CanonicalNpcSnapshot[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 64));
    const rows = await this.db
      .select()
      .from(npcSnapshots)
      .where(
        and(
          eq(npcSnapshots.householdId, householdId),
          eq(npcSnapshots.worldId, worldId),
        ),
      )
      .orderBy(asc(npcSnapshots.npcId), asc(npcSnapshots.childProfileId))
      .limit(boundedLimit);

    return rows.map((row) => ({
      npcId: row.npcId,
      householdId: row.householdId,
      worldId: row.worldId,
      childProfileId: row.childProfileId,
      characterId: row.characterId,
      locationId: row.locationId,
      needTypes: row.needTypes ?? [],
      relationshipToCharacter: Number(row.relationshipToCharacter),
      lastInteractionAt: row.lastInteractionAt,
      updatedAt: row.updatedAt,
    }));
  }
}
