import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  dataExportRecords,
  type DataExportRecord,
  type NewDataExportRecord,
} from "../../schema/privacy";
import type { DataExportRepository } from "../interfaces/data-export.repository";

export class DrizzleDataExportRepository implements DataExportRepository {
  constructor(private readonly db: QueryExecutor) {}

  async create(input: NewDataExportRecord): Promise<DataExportRecord> {
    const [record] = await this.db
      .insert(dataExportRecords)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Data export record creation returned no record");
    }
    return record;
  }

  async listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<DataExportRecord[]> {
    return this.db
      .select()
      .from(dataExportRecords)
      .where(
        and(
          eq(dataExportRecords.childProfileId, childProfileId),
          eq(dataExportRecords.householdId, householdId),
        ),
      )
      .orderBy(dataExportRecords.createdAt);
  }
}
