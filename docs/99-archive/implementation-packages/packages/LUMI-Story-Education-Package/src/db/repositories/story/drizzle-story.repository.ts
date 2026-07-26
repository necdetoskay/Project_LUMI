import type { QueryExecutor } from "../../transaction";
import {
  sessionDecisions,
  stories,
  storySessions,
  storyVersions,
  type NewStoryRecord,
  type NewStorySessionRecord,
} from "../../schema/story";
import type { StoryRepository } from "./story.repository";

export class DrizzleStoryRepository implements StoryRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async createStory(input: NewStoryRecord) {
    const [record] = await this.executor.insert(stories).values(input).returning();
    if (!record) throw new Error("Story creation returned no record");
    return record;
  }

  async createVersion(input: {
    storyId: string;
    versionNumber: number;
    content: Record<string, unknown>;
    summary?: string;
  }) {
    const [record] = await this.executor.insert(storyVersions).values(input).returning({ id: storyVersions.id });
    if (!record) throw new Error("Story version creation returned no record");
    return record;
  }

  async startSession(input: NewStorySessionRecord) {
    const [record] = await this.executor.insert(storySessions).values(input).returning();
    if (!record) throw new Error("Story session creation returned no record");
    return record;
  }

  async recordDecision(input: {
    storySessionId: string;
    nodeKey: string;
    choiceKey: string;
    contextSnapshot?: Record<string, unknown>;
    consequence?: Record<string, unknown>;
  }): Promise<void> {
    await this.executor.insert(sessionDecisions).values({
      ...input,
      contextSnapshot: input.contextSnapshot ?? {},
      consequence: input.consequence ?? {},
    });
  }
}
