import { DrizzleMemoryRepository } from "../../db/repositories/memory/drizzle-memory.repository";
import { withTransaction } from "../../db/transaction";

export async function createEventMemory(input: {
  worldId: string;
  sourceType: string;
  sourceId?: string;
  occurredAt: Date;
  memoryType: string;
  importance?: number;
  emotionalWeight?: number;
  payload?: Record<string, unknown>;
  subjects?: Array<{
    subjectType: string;
    subjectId: string;
    relevanceWeight?: number;
  }>;
}) {
  return withTransaction(async (tx) => {
    const repository = new DrizzleMemoryRepository(tx);

    const memory = await repository.create({
      worldId: input.worldId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      occurredAt: input.occurredAt,
      memoryType: input.memoryType,
      importance: input.importance ?? 0.5,
      emotionalWeight: input.emotionalWeight ?? 0,
      payload: input.payload ?? {},
    });

    for (const subject of input.subjects ?? []) {
      await repository.addSubject({
        memoryId: memory.id,
        ...subject,
      });
    }

    return memory;
  });
}
