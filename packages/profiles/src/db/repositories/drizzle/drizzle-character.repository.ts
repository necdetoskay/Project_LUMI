import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  lumiCharacters,
  type LumiCharacterRecord,
  type NewLumiCharacterRecord,
} from "../../../db/schema/profile";
import type { CharacterRepository } from "../interfaces/character.repository";

export class DrizzleCharacterRepository implements CharacterRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findById(
    id: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null> {
    const [record] = await this.db
      .select()
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.id, id),
          eq(lumiCharacters.householdId, householdId),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .limit(1);
    return (record as LumiCharacterRecord) ?? null;
  }

  async findByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null> {
    const [record] = await this.db
      .select()
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.childProfileId, childProfileId),
          eq(lumiCharacters.householdId, householdId),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .orderBy(lumiCharacters.createdAt)
      .limit(1);
    return (record as LumiCharacterRecord) ?? null;
  }

  async listByHousehold(householdId: string): Promise<LumiCharacterRecord[]> {
    const rows = await this.db
      .select()
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.householdId, householdId),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .orderBy(lumiCharacters.createdAt);
    return rows as LumiCharacterRecord[];
  }

  async create(input: NewLumiCharacterRecord): Promise<LumiCharacterRecord> {
    const [record] = await this.db
      .insert(lumiCharacters)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Character creation returned no record");
    }
    return record as LumiCharacterRecord;
  }

  async softDelete(id: string, householdId: string): Promise<void> {
    await this.db
      .update(lumiCharacters)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(lumiCharacters.id, id),
          eq(lumiCharacters.householdId, householdId),
          isNull(lumiCharacters.deletedAt),
        ),
      );
  }
}
