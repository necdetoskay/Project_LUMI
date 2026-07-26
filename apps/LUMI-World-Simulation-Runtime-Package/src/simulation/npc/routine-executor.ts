export type RoutineExecutionInput = {
  characterId: string;
  routineType: string;
  locationId?: string;
  intensity: number;
  metadata?: Record<string, unknown>;
};

export type RoutineExecutionResult = {
  characterId: string;
  actionType: string;
  success: boolean;
  stateChanges: Array<{
    entityType: string;
    entityId: string;
    field: string;
    previousValue?: unknown;
    nextValue: unknown;
  }>;
  generatedMemory?: {
    summary: string;
    importance: number;
  };
};

export async function executeRoutine(
  input: RoutineExecutionInput,
): Promise<RoutineExecutionResult> {
  return {
    characterId: input.characterId,
    actionType: input.routineType,
    success: true,
    stateChanges: [
      {
        entityType: "character",
        entityId: input.characterId,
        field: "lastRoutine",
        nextValue: {
          routineType: input.routineType,
          locationId: input.locationId,
          intensity: input.intensity,
        },
      },
    ],
    generatedMemory:
      input.intensity >= 0.7
        ? {
            summary: `${input.routineType} rutini dikkat çekici bir sonuç doğurdu.`,
            importance: input.intensity,
          }
        : undefined,
  };
}
