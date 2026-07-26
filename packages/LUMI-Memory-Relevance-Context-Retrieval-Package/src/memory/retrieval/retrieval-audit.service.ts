import {
  auditLogs,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type {
  MemoryRetrievalQuery,
  RetrievedMemory,
} from "../types";

export async function auditMemoryRetrieval(
  tx: QueryExecutor,
  input: {
    actorUserId?: string;
    query: MemoryRetrievalQuery;
    results: RetrievedMemory[];
    purpose:
      | "story_generation"
      | "npc_decision"
      | "simulation"
      | "summary";
  },
) {
  await tx.insert(auditLogs).values({
    actorType: input.actorUserId
      ? "user"
      : "system",
    actorId: input.actorUserId,
    action: "memory.retrieval.executed",
    entityType: "world",
    entityId: input.query.worldId,
    afterState: {
      purpose: input.purpose,
      resultCount: input.results.length,
      memoryIds: input.results.map(
        (result) => result.memoryId,
      ),
      tokenBudget: input.query.tokenBudget,
    },
  });
}
