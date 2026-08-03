import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  llmProviderSettings,
  type LlmProviderSettingsRecord,
  type NewLlmProviderSettingsRecord,
} from "../../schema/profile";
import type { LlmProviderSettingsRepository } from "../interfaces/llm-provider-settings.repository";

export class DrizzleLlmProviderSettingsRepository
  implements LlmProviderSettingsRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async findByUserAndHousehold(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<LlmProviderSettingsRecord | null> {
    const [record] = await this.db
      .select()
      .from(llmProviderSettings)
      .where(
        and(
          eq(llmProviderSettings.userId, userId),
          eq(llmProviderSettings.householdId, householdId),
          eq(llmProviderSettings.provider, provider),
        ),
      )
      .limit(1);
    return (record as LlmProviderSettingsRecord) ?? null;
  }

  async upsert(
    input: NewLlmProviderSettingsRecord,
  ): Promise<LlmProviderSettingsRecord> {
    const existing = await this.findByUserAndHousehold(
      input.userId,
      input.householdId,
      input.provider ?? "openrouter",
    );
    if (existing) {
      const [record] = await this.db
        .update(llmProviderSettings)
        .set({
          encryptedApiKey: input.encryptedApiKey,
          enabled: input.enabled,
          updatedAt: new Date(),
        })
        .where(eq(llmProviderSettings.id, existing.id))
        .returning();
      if (!record) throw new Error("LLM provider settings update returned no record");
      return record as LlmProviderSettingsRecord;
    }
    const [record] = await this.db
      .insert(llmProviderSettings)
      .values(input)
      .returning();
    if (!record) throw new Error("LLM provider settings creation returned no record");
    return record as LlmProviderSettingsRecord;
  }

  async deleteByUserAndHousehold(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<void> {
    await this.db
      .delete(llmProviderSettings)
      .where(
        and(
          eq(llmProviderSettings.userId, userId),
          eq(llmProviderSettings.householdId, householdId),
          eq(llmProviderSettings.provider, provider),
        ),
      );
  }

  async deleteApiKey(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<LlmProviderSettingsRecord> {
    const existing = await this.findByUserAndHousehold(userId, householdId, provider);
    if (!existing) {
      throw new Error("LLM provider settings not found");
    }
    const [record] = await this.db
      .update(llmProviderSettings)
      .set({
        encryptedApiKey: null,
        enabled: false,
        updatedAt: new Date(),
      })
      .where(eq(llmProviderSettings.id, existing.id))
      .returning();
    if (!record) throw new Error("LLM provider settings update returned no record");
    return record as LlmProviderSettingsRecord;
  }
}
