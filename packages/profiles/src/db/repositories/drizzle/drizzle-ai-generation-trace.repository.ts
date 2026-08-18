import { and, desc, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  aiGenerationTraces,
  type AiGenerationTraceRecord,
  type NewAiGenerationTraceRecord,
} from "../../../db/schema/profile";
import type { AiGenerationTraceRepository } from "../interfaces/ai-generation-trace.repository";

export class DrizzleAiGenerationTraceRepository
  implements AiGenerationTraceRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async create(
    input: NewAiGenerationTraceRecord,
  ): Promise<AiGenerationTraceRecord> {
    const [record] = await this.db
      .insert(aiGenerationTraces)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("AI generation trace creation returned no record");
    }
    return record as AiGenerationTraceRecord;
  }

  async findByIdForHousehold(
    id: string,
    householdId: string,
  ): Promise<AiGenerationTraceRecord | null> {
    const [record] = await this.db
      .select()
      .from(aiGenerationTraces)
      .where(
        and(
          eq(aiGenerationTraces.id, id),
          eq(aiGenerationTraces.householdId, householdId),
        ),
      )
      .limit(1);
    return (record as AiGenerationTraceRecord) ?? null;
  }

  async listByHousehold(
    householdId: string,
    limit = 50,
  ): Promise<AiGenerationTraceRecord[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    const records = await this.db
      .select()
      .from(aiGenerationTraces)
      .where(eq(aiGenerationTraces.householdId, householdId))
      .orderBy(desc(aiGenerationTraces.createdAt))
      .limit(boundedLimit);
    return records as AiGenerationTraceRecord[];
  }
}
