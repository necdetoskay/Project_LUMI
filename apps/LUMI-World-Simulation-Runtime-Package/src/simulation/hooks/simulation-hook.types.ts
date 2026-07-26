export type SimulationHookContext = {
  worldId: string;
  sliceStart: Date;
  sliceEnd: Date;
  intensity: number;
};

export type SimulationHookResult = {
  hookCode: string;
  events: Array<{
    eventType: string;
    summary: string;
    payload: Record<string, unknown>;
  }>;
  stateChanges: Array<{
    entityType: string;
    entityId: string;
    field: string;
    nextValue: unknown;
  }>;
};

export interface SimulationHook {
  readonly hookCode: string;

  execute(
    context: SimulationHookContext,
  ): Promise<SimulationHookResult>;
}
