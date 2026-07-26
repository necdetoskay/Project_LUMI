import { memories, memorySummaries } from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import { summarizeMemoriesDeterministically } from "../summarization/memory-summarizer";

export async function createMemorySummary(
  tx: QueryExecutor,
  input: {
    worldId: string;
    sourceMemoryIds: string[];
    summaries: string[];
    maxCharacters: number;
    periodStart: Date;
    periodEnd: Date;
  },
) {
  const summary =
    summarizeMemoriesDeterministically({
      summaries: input.summaries,
      maxCharacters: input.maxCharacters,
    });

  const [record] = await tx
    .insert(memorySummaries)
    .values({
      worldId: input.worldId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      summary,
      sourceMemoryIds:
        input.sourceMemoryIds,
    })
    .returning();

  if (!record) {
    throw new Error(
      "Memory summary could not be created",
    );
  }

  await tx.insert(memories).values({
    worldId: input.worldId,
    memoryType: "summary",
    summary,
    occurredAt: input.periodEnd,
    sourceEntityType:
      "memory_summary",
    sourceEntityId:
      record.id,
    importance: 0.7,
    emotionalSalience: 0.3,
    consequenceWeight: 0.5,
    privacyLevel: "household",
    metadata: {
      periodStart:
        input.periodStart.toISOString(),
      periodEnd:
        input.periodEnd.toISOString(),
    },
  });

  return record;
}
