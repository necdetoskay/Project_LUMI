import type { QueryExecutor } from "../../transaction";
import { auditLogs } from "../../schema/audit";
import type { AuditRepository } from "./audit.repository";

export class DrizzleAuditRepository implements AuditRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async append(input: {
    actorType: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    requestId?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.executor.insert(auditLogs).values({
      ...input,
      metadata: input.metadata ?? {},
    });
  }
}
