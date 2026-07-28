import type {
  LumiCharacterRecord,
  NewLumiCharacterRecord,
} from "../../../db";

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

  softDelete(id: string, householdId: string): Promise<void>;
}
