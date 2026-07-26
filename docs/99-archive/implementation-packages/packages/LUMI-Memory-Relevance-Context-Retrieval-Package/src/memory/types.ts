export type MemoryCandidate = {
  worldId: string;
  memoryType:
    | "story_event"
    | "decision"
    | "relationship"
    | "background_action"
    | "world_event"
    | "item_event"
    | "education"
    | "summary";
  summary: string;
  occurredAt: Date;
  sourceEntityType: string;
  sourceEntityId: string;
  importance?: number;
  emotionalSalience?: number;
  consequenceWeight?: number;
  privacyLevel?: "public" | "household" | "private";
  subjects: Array<{
    subjectType: string;
    subjectId: string;
    relevanceWeight: number;
  }>;
  metadata?: Record<string, unknown>;
};

export type MemoryRetrievalQuery = {
  worldId: string;
  requesterUserId?: string;
  childProfileId?: string;
  subjectIds?: string[];
  queryText?: string;
  memoryTypes?: string[];
  occurredAfter?: Date;
  maxResults: number;
  tokenBudget: number;
};

export type RetrievedMemory = {
  memoryId: string;
  summary: string;
  memoryType: string;
  occurredAt: Date;
  importance: number;
  emotionalSalience: number;
  consequenceWeight: number;
  semanticScore: number;
  subjectScore: number;
  recencyScore: number;
  finalScore: number;
  estimatedTokens: number;
};
