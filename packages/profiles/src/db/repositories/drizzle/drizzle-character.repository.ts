import { and, eq, isNull, sql } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  lumiCharacters,
  type LumiCharacterRecord,
  type NewLumiCharacterRecord,
} from "../../../db/schema/profile";
import type { CharacterRepository } from "../interfaces/character.repository";
import { DomainError } from "../../../domain";

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

  async findChildAvatarById(
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
          eq(lumiCharacters.characterSubtype, "child_avatar"),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .limit(1);
    return (record as LumiCharacterRecord) ?? null;
  }

  async findPrimaryChildAvatarByChildProfile(
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
          eq(lumiCharacters.characterSubtype, "child_avatar"),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .orderBy(lumiCharacters.createdAt)
      .limit(1);
    return (record as LumiCharacterRecord) ?? null;
  }

  async findByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null> {
    return this.findPrimaryChildAvatarByChildProfile(
      childProfileId,
      householdId,
    );
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

  async listChildAvatarsByHousehold(
    householdId: string,
  ): Promise<LumiCharacterRecord[]> {
    const rows = await this.db
      .select()
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.householdId, householdId),
          eq(lumiCharacters.characterSubtype, "child_avatar"),
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

  async update(
    id: string,
    householdId: string,
    input: Partial<NewLumiCharacterRecord> & { expectedVersion: number },
  ): Promise<LumiCharacterRecord> {
    const { expectedVersion, ...updateData } = input;
    const result = await this.db
      .update(lumiCharacters)
      .set({
        ...updateData,
        updatedAt: new Date(),
        version: sql`${lumiCharacters.version} + 1`,
      })
      .where(
        and(
          eq(lumiCharacters.id, id),
          eq(lumiCharacters.householdId, householdId),
          eq(lumiCharacters.version, expectedVersion),
          isNull(lumiCharacters.deletedAt),
        ),
      )
      .returning();
    if (!result || result.length === 0) {
      const existing = await this.findById(id, householdId);
      if (!existing) {
        throw new DomainError("NOT_FOUND", `Character ${id} not found`);
      }
      throw new DomainError(
        "VERSION_CONFLICT",
        `Character ${id} version conflict: expected ${expectedVersion}, actual ${existing.version}`,
      );
    }
    return result[0] as LumiCharacterRecord;
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
