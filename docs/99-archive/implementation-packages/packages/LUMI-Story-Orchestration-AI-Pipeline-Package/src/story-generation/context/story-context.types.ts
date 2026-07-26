export type StoryContext = {
  world: {
    id: string;
    name: string;
    currentState: Record<string, unknown>;
  };
  child: {
    id: string;
    name: string;
    ageBand?: string;
    interests: string[];
    preferences: Record<string, unknown>;
  };
  participants: Array<{
    id: string;
    name: string;
    traits: Record<string, number>;
    emotions: Record<string, number>;
    conditions: string[];
  }>;
  location?: {
    id: string;
    name: string;
    biome?: string;
  };
  selectedItem?: {
    id: string;
    name: string;
    properties: Record<string, unknown>;
  };
  relevantMemories: Array<{
    summary: string;
    relevance: number;
  }>;
  currentEvents: Array<{
    eventType: string;
    summary: string;
  }>;
};
