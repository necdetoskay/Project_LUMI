import type {
  LlmProviderSettingsRecord,
  NewLlmProviderSettingsRecord,
} from "../../schema/profile";

export interface LlmProviderSettingsRepository {
  findByUserAndHousehold(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<LlmProviderSettingsRecord | null>;

  upsert(
    input: NewLlmProviderSettingsRecord,
  ): Promise<LlmProviderSettingsRecord>;

  deleteByUserAndHousehold(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<void>;

  deleteApiKey(
    userId: string,
    householdId: string,
    provider: string,
  ): Promise<LlmProviderSettingsRecord>;
}
