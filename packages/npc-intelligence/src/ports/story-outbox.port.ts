export interface StoryOutboxIntent {
  householdId: string;
  worldId: string;
  commitId: string;
  idempotencyKey: string;
  intentType: "npc_rumor_spread";
  payload: Record<string, unknown>;
  evidenceRef: string | null;
}

export interface StoryOutboxPort {
  enqueue(intent: StoryOutboxIntent): Promise<void>;
}
