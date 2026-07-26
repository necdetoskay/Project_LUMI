import type { MemoryRecord, NewMemoryRecord } from "../../schema/memory";

export interface MemoryRepository {
  create(input: NewMemoryRecord): Promise<MemoryRecord>;
  addSubject(input: {
    memoryId: string;
    subjectType: string;
    subjectId: string;
    relevanceWeight?: number;
  }): Promise<void>;
  link(input: {
    sourceMemoryId: string;
    targetMemoryId: string;
    linkType?: string;
    strength?: number;
  }): Promise<void>;
}
