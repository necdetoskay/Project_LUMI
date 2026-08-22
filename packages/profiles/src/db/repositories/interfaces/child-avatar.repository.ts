import type { LumiCharacterRecord } from "../../../db";

export interface ChildAvatarRepository {
  getById(id: string, householdId: string): Promise<LumiCharacterRecord | null>;

  getByChildProfileId(
    childProfileId: string,
    householdId: string,
  ): Promise<LumiCharacterRecord | null>;

  listByHousehold(householdId: string): Promise<LumiCharacterRecord[]>;
}
