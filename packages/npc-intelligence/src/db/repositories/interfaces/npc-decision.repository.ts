import type { DecisionTrace, NpcDecisionEvent } from "../../../domain";

export interface NpcDecisionRepository {
  saveTrace(trace: DecisionTrace): Promise<void>;
  listTraces(
    householdId: string,
    npcId: string,
    limit: number,
  ): Promise<DecisionTrace[]>;
  saveEvent(event: NpcDecisionEvent): Promise<void>;
}
