import type { QueryExecutor } from "../../db/transaction";
import {
  backgroundActions,
  memories,
  memorySubjects,
  simulationEvents,
  stateChanges,
} from "../../db/schema";

export async function persistSimulationSlice(
  tx: QueryExecutor,
  input: {
    simulationRunId: string;
    worldId: string;
    sliceStart: Date;
    sliceEnd: Date;
    events: Array<{
      eventType: string;
      summary: string;
      payload: Record<string, unknown>;
    }>;
    actions: Array<{
      characterId: string;
      actionType: string;
      payload: Record<string, unknown>;
      memory?: {
        summary: string;
        importance: number;
      };
    }>;
    changes: Array<{
      entityType: string;
      entityId: string;
      field: string;
      previousValue?: unknown;
      nextValue: unknown;
    }>;
  },
) {
  for (const event of input.events) {
    await tx.insert(simulationEvents).values({
      simulationRunId:
        input.simulationRunId,
      worldId: input.worldId,
      eventType: event.eventType,
      summary: event.summary,
      payload: event.payload,
      occurredAt: input.sliceEnd,
    });
  }

  for (const action of input.actions) {
    const [backgroundAction] = await tx
      .insert(backgroundActions)
      .values({
        simulationRunId:
          input.simulationRunId,
        worldId: input.worldId,
        characterId:
          action.characterId,
        actionType: action.actionType,
        payload: action.payload,
        occurredAt: input.sliceEnd,
      })
      .returning();

    if (
      backgroundAction &&
      action.memory
    ) {
      const [memory] = await tx
        .insert(memories)
        .values({
          worldId: input.worldId,
          memoryType:
            "background_action",
          summary:
            action.memory.summary,
          importance:
            action.memory.importance,
          occurredAt: input.sliceEnd,
          sourceEntityType:
            "background_action",
          sourceEntityId:
            backgroundAction.id,
        })
        .returning();

      if (memory) {
        await tx
          .insert(memorySubjects)
          .values({
            memoryId: memory.id,
            subjectType: "character",
            subjectId:
              action.characterId,
            relevanceWeight:
              action.memory.importance,
          });
      }
    }
  }

  for (const change of input.changes) {
    await tx.insert(stateChanges).values({
      simulationRunId:
        input.simulationRunId,
      worldId: input.worldId,
      entityType:
        change.entityType,
      entityId: change.entityId,
      field: change.field,
      previousValue:
        change.previousValue,
      nextValue: change.nextValue,
      changedAt: input.sliceEnd,
    });
  }
}
