import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  locationConnections,
  locations,
  type LocationRecord,
  type NewLocationConnectionRecord,
  type NewLocationRecord,
} from "../../schema/world";
import type { LocationRepository } from "./location.repository";

export class DrizzleLocationRepository
  implements LocationRepository
{
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findById(id: string): Promise<LocationRecord | null> {
    const [record] = await this.executor
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async create(
    input: NewLocationRecord,
  ): Promise<LocationRecord> {
    const [record] = await this.executor
      .insert(locations)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Location creation returned no record");
    }

    return record;
  }

  async connect(
    input: NewLocationConnectionRecord,
  ): Promise<void> {
    await this.executor
      .insert(locationConnections)
      .values(input);
  }
}
