import { asc, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import { generationUsage } from "../../schema/ai";
import type {
  GenerationUsageRecord,
  NewGenerationUsageRecord,
} from "../../schema/ai";
import type { UsageRepository } from "../interfaces/usage.repository";

export class DrizzleUsageRepository implements UsageRepository {
  async create(
    tx: { insert: QueryExecutor["insert"] },
    data: NewGenerationUsageRecord,
  ) {
    const [row] = await tx.insert(generationUsage).values(data).returning();
    return row!;
  }

  async listByRequest(
    tx: { select: QueryExecutor["select"] },
    requestId: string,
  ): Promise<GenerationUsageRecord[]> {
    return tx
      .select()
      .from(generationUsage)
      .where(eq(generationUsage.requestId, requestId))
      .orderBy(asc(generationUsage.attempt));
  }
}
