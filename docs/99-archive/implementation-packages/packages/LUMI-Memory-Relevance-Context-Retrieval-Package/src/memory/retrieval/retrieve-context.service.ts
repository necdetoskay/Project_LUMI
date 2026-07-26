import type { QueryExecutor } from "../../db/transaction";
import type { EmbeddingProvider } from "../embedding/embedding-provider.types";
import type {
  MemoryRetrievalQuery,
} from "../types";
import { auditMemoryRetrieval } from "./retrieval-audit.service";
import { retrieveRelevantMemories } from "./hybrid-memory-retriever";

export async function retrieveMemoryContext(
  tx: QueryExecutor,
  input: {
    query: MemoryRetrievalQuery;
    purpose:
      | "story_generation"
      | "npc_decision"
      | "simulation"
      | "summary";
    actorUserId?: string;
    embeddingProvider?: EmbeddingProvider;
    embeddingModel?: string;
    now?: Date;
  },
) {
  const results =
    await retrieveRelevantMemories(tx, {
      query: input.query,
      now: input.now ?? new Date(),
      embeddingProvider:
        input.embeddingProvider,
      embeddingModel:
        input.embeddingModel,
    });

  await auditMemoryRetrieval(tx, {
    actorUserId: input.actorUserId,
    query: input.query,
    results,
    purpose: input.purpose,
  });

  return results;
}
