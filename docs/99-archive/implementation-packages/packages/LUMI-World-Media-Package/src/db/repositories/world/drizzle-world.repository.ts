import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  regions,
  universes,
  worlds,
  type NewRegionRecord,
  type NewUniverseRecord,
  type NewWorldRecord,
  type RegionRecord,
  type UniverseRecord,
  type WorldRecord,
} from "../../schema/world";
import type { WorldRepository } from "./world.repository";

export class DrizzleWorldRepository implements WorldRepository {
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findWorldById(id: string): Promise<WorldRecord | null> {
    const [record] = await this.executor
      .select()
      .from(worlds)
      .where(
        and(
          eq(worlds.id, id),
          isNull(worlds.deletedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async createUniverse(
    input: NewUniverseRecord,
  ): Promise<UniverseRecord> {
    const [record] = await this.executor
      .insert(universes)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Universe creation returned no record");
    }

    return record;
  }

  async createWorld(
    input: NewWorldRecord,
  ): Promise<WorldRecord> {
    const [record] = await this.executor
      .insert(worlds)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("World creation returned no record");
    }

    return record;
  }

  async createRegion(
    input: NewRegionRecord,
  ): Promise<RegionRecord> {
    const [record] = await this.executor
      .insert(regions)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Region creation returned no record");
    }

    return record;
  }
}
