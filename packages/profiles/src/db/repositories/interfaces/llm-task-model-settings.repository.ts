import type {
  LlmTaskModelSettingsRecord,
  NewLlmTaskModelSettingsRecord,
} from "../../schema/profile";

export interface LlmTaskModelSettingsRepository {
  findByUserAndHousehold(
    userId: string,
    householdId: string,
  ): Promise<LlmTaskModelSettingsRecord[]>;

  findByTaskType(
    userId: string,
    householdId: string,
    taskType: string,
  ): Promise<LlmTaskModelSettingsRecord | null>;

  upsert(input: NewLlmTaskModelSettingsRecord): Promise<LlmTaskModelSettingsRecord>;
}
