import type { DecisionTrace, NpcDecisionEvent } from "../domain/decision-trace";

export interface NpcDecisionStorePort {
  saveTrace(trace: DecisionTrace): Promise<void>;
  listTraces(
    householdId: string,
    npcId: string,
    limit: number,
  ): Promise<DecisionTrace[]>;
  saveEvent(event: NpcDecisionEvent): Promise<void>;
}
