import { eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  dataLifecycleAuditLog,
  type DataLifecycleAuditLogRecord,
  type NewDataLifecycleAuditLogRecord,
} from "../../schema/privacy";
import type { DataLifecycleAuditRepository } from "../interfaces/data-lifecycle-audit.repository";

export class DrizzleDataLifecycleAuditRepository
  implements DataLifecycleAuditRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async append(
    input: NewDataLifecycleAuditLogRecord,
  ): Promise<void> {
    await this.db.insert(dataLifecycleAuditLog).values(input);
  }

  async listByHousehold(
    householdId: string,
  ): Promise<DataLifecycleAuditLogRecord[]> {
    return this.db
      .select()
      .from(dataLifecycleAuditLog)
      .where(eq(dataLifecycleAuditLog.householdId, householdId))
      .orderBy(dataLifecycleAuditLog.createdAt);
  }
}
