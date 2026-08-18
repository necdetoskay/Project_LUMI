import type {
  AiGenerationTraceRecord,
  NewAiGenerationTraceRecord,
} from "../../schema/profile";

export interface AiGenerationTraceRepository {
  create(input: NewAiGenerationTraceRecord): Promise<AiGenerationTraceRecord>;
  findByIdForHousehold(
    id: string,
    householdId: string,
  ): Promise<AiGenerationTraceRecord | null>;
  listByHousehold(
    householdId: string,
    limit?: number,
  ): Promise<AiGenerationTraceRecord[]>;
}
