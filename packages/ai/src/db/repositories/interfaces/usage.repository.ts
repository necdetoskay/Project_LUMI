import type { QueryExecutor } from "../../client";
import type {
  GenerationUsageRecord,
  NewGenerationUsageRecord,
} from "../../schema/ai";

export interface UsageRepository {
  create(
    tx: { insert: QueryExecutor["insert"] },
    data: NewGenerationUsageRecord,
  ): Promise<GenerationUsageRecord>;

  listByRequest(
    tx: { select: QueryExecutor["select"] },
    requestId: string,
  ): Promise<GenerationUsageRecord[]>;
}
