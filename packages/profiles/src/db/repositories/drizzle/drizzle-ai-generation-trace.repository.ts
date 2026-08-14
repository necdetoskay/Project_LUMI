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
}
