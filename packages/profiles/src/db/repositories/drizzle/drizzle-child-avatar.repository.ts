import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import { childAvatars, lumiCharacters } from "../../schema/profile";
import type { LumiCharacterRecord } from "../../schema/profile";
import type { ChildAvatarRepository } from "../interfaces";

export class DrizzleChildAvatarRepository implements ChildAvatarRepository {
  constructor(private readonly db: QueryExecutor) {}

  async getById(
    id: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null> {
    const [row] = await this.db
      .select({ character: lumiCharacters })
      .from(childAvatars)
      .innerJoin(
        lumiCharacters,
        eq(lumiCharacters.id, childAvatars.characterId),
      )
      .where(
        and(
          eq(childAvatars.characterId, id),
          eq(childAvatars.householdId, householdId),
          isNull(childAvatars.deletedAt),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .limit(1);

    return row?.character ?? null;
  }

  async getByChildProfileId(
    childProfileId: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null> {
    const [row] = await this.db
      .select({ character: lumiCharacters })
      .from(childAvatars)
      .innerJoin(
        lumiCharacters,
        eq(lumiCharacters.id, childAvatars.characterId),
      )
      .where(
        and(
          eq(childAvatars.childProfileId, childProfileId),
          eq(childAvatars.householdId, householdId),
          isNull(childAvatars.deletedAt),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .limit(1);

    return row?.character ?? null;
  }

  async listByHousehold(householdId: string): Promise<LumiCharacterRecord[]> {
    const rows = await this.db
      .select({ character: lumiCharacters })
      .from(childAvatars)
      .innerJoin(
        lumiCharacters,
        eq(lumiCharacters.id, childAvatars.characterId),
      )
      .where(
        and(
          eq(childAvatars.householdId, householdId),
          isNull(childAvatars.deletedAt),
          isNull(lumiCharacters.deletedAt),
        ),
      );

    return rows.map((row) => row.character);
  }
}
