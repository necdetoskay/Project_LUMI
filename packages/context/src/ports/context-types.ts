export type ContextScope =
  | "world_truth"
  | "character_belief"
  | "player_knowledge"
  | "narrative_instruction";

export type ContextPriority = 0 | 1 | 2 | 3 | 4;

export interface ContextItem<T = unknown> {
  id: string;
  type: string;
  content: T;
  text: string;
  sourceEngine: string;
  authority: number;
  confidence: number;
  scope: ContextScope;
  priority: ContextPriority;
  relevance: number;
}

export interface ContextSourceResult<T = unknown> {
  items: ContextItem<T>[];
  sourceRelevance: number;
}
