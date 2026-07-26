import type {
  NewStoryRecord,
  NewStorySessionRecord,
  StoryRecord,
  StorySessionRecord,
} from "../../schema/story";

export interface StoryRepository {
  createStory(input: NewStoryRecord): Promise<StoryRecord>;
  createVersion(input: {
    storyId: string;
    versionNumber: number;
    content: Record<string, unknown>;
    summary?: string;
  }): Promise<{ id: string }>;
  startSession(input: NewStorySessionRecord): Promise<StorySessionRecord>;
  recordDecision(input: {
    storySessionId: string;
    nodeKey: string;
    choiceKey: string;
    contextSnapshot?: Record<string, unknown>;
    consequence?: Record<string, unknown>;
  }): Promise<void>;
}
