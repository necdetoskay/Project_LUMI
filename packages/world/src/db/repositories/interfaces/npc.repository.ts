import type { WorldNpcRecord } from "../../schema/world";

export interface NpcRepository {
  getById(
    characterId: string,
    householdId: string,
  ): Promise<WorldNpcRecord | null>;

  listByWorldId(
    worldId: string,
    householdId: string,
  ): Promise<WorldNpcRecord[]>;
}
