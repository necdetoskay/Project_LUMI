import type {
  AiGenerationTraceRecord,
  NewAiGenerationTraceRecord,
} from "../../schema/profile";

export interface AiGenerationTraceRepository {
  create(input: NewAiGenerationTraceRecord): Promise<AiGenerationTraceRecord>;
}
