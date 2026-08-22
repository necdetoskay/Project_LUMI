import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import { worldNpcs } from "../../schema/world";
import type { WorldNpcRecord } from "../../schema/world";
import type { NpcRepository } from "../interfaces";

export class DrizzleNpcRepository implements NpcRepository {
  constructor(private readonly db: QueryExecutor) {}

  async getById(
    characterId: string,
    householdId: string,
  ): Promise<WorldNpcRecord | null> {
    const [row] = await this.db
      .select()
      .from(worldNpcs)
      .where(
        and(
          eq(worldNpcs.characterId, characterId),
          eq(worldNpcs.householdId, householdId),
          isNull(worldNpcs.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async listByWorldId(
    worldId: string,
    householdId: string,
  ): Promise<WorldNpcRecord[]> {
    return this.db
      .select()
      .from(worldNpcs)
      .where(
        and(
          eq(worldNpcs.worldId, worldId),
          eq(worldNpcs.householdId, householdId),
          isNull(worldNpcs.deletedAt),
        ),
      );
  }
}
