import type { LumiCharacterRecord, NewLumiCharacterRecord } from "../../../db";

export interface CharacterRepository {
  findById(
    id: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null>;

  findByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null>;

  listByHousehold(householdId: string): Promise<LumiCharacterRecord[]>;

  create(input: NewLumiCharacterRecord): Promise<LumiCharacterRecord>;

  update(
    id: string,
    householdId: string,
    input: Partial<NewLumiCharacterRecord> & { expectedVersion: number },
  ): Promise<LumiCharacterRecord>;

  softDelete(id: string, householdId: string): Promise<void>;
}
