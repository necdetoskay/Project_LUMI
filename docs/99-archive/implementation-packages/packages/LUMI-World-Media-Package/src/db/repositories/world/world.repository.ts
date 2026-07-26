import type {
  NewRegionRecord,
  NewUniverseRecord,
  NewWorldRecord,
  RegionRecord,
  UniverseRecord,
  WorldRecord,
} from "../../schema/world";

export interface WorldRepository {
  findWorldById(id: string): Promise<WorldRecord | null>;
  createUniverse(input: NewUniverseRecord): Promise<UniverseRecord>;
  createWorld(input: NewWorldRecord): Promise<WorldRecord>;
  createRegion(input: NewRegionRecord): Promise<RegionRecord>;
}
