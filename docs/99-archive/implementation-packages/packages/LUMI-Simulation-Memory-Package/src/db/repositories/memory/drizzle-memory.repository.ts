import type { QueryExecutor } from "../../transaction";
import { memories, memoryLinks, memorySubjects, type NewMemoryRecord } from "../../schema/memory";
import type { MemoryRepository } from "./memory.repository";

export class DrizzleMemoryRepository implements MemoryRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async create(input: NewMemoryRecord) {
    const [record] = await this.executor.insert(memories).values(input).returning();
    if (!record) throw new Error("Memory creation returned no record");
    return record;
  }

  async addSubject(input: {
    memoryId: string;
    subjectType: string;
    subjectId: string;
    relevanceWeight?: number;
  }): Promise<void> {
    await this.executor.insert(memorySubjects).values({
      ...input,
      relevanceWeight: input.relevanceWeight ?? 0.5,
    });
  }

  async link(input: {
    sourceMemoryId: string;
    targetMemoryId: string;
    linkType?: string;
    strength?: number;
  }): Promise<void> {
    await this.executor.insert(memoryLinks).values({
      ...input,
      linkType: input.linkType ?? "related",
      strength: input.strength ?? 0.5,
    });
  }
}
