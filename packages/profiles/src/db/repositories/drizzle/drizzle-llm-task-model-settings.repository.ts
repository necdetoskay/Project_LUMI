import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  llmTaskModelSettings,
  type LlmTaskModelSettingsRecord,
  type NewLlmTaskModelSettingsRecord,
} from "../../schema/profile";
import type { LlmTaskModelSettingsRepository } from "../interfaces/llm-task-model-settings.repository";

export class DrizzleLlmTaskModelSettingsRepository
  implements LlmTaskModelSettingsRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async findByUserAndHousehold(
    userId: string,
    householdId: string,
  ): Promise<LlmTaskModelSettingsRecord[]> {
    const rows = await this.db
      .select()
      .from(llmTaskModelSettings)
      .where(
        and(
          eq(llmTaskModelSettings.userId, userId),
          eq(llmTaskModelSettings.householdId, householdId),
        ),
      )
      .orderBy(llmTaskModelSettings.taskType);
    return rows as LlmTaskModelSettingsRecord[];
  }

  async findByTaskType(
    userId: string,
    householdId: string,
    taskType: string,
  ): Promise<LlmTaskModelSettingsRecord | null> {
    const [record] = await this.db
      .select()
      .from(llmTaskModelSettings)
      .where(
        and(
          eq(llmTaskModelSettings.userId, userId),
          eq(llmTaskModelSettings.householdId, householdId),
          eq(llmTaskModelSettings.taskType, taskType),
        ),
      )
      .limit(1);
    return (record as LlmTaskModelSettingsRecord) ?? null;
  }

  async upsert(
    input: NewLlmTaskModelSettingsRecord,
  ): Promise<LlmTaskModelSettingsRecord> {
    const existing = await this.findByTaskType(
      input.userId,
      input.householdId,
      input.taskType,
    );
    if (existing) {
      const [record] = await this.db
        .update(llmTaskModelSettings)
        .set({
          modelId: input.modelId,
          reasoningLevel: input.reasoningLevel,
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
          enabled: input.enabled,
          updatedAt: new Date(),
        })
        .where(eq(llmTaskModelSettings.id, existing.id))
        .returning();
      if (!record) throw new Error("LLM task model settings update returned no record");
      return record as LlmTaskModelSettingsRecord;
    }
    const [record] = await this.db
      .insert(llmTaskModelSettings)
      .values(input)
      .returning();
    if (!record) throw new Error("LLM task model settings creation returned no record");
    return record as LlmTaskModelSettingsRecord;
  }
}
