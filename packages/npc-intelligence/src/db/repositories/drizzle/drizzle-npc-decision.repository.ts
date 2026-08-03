import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../../client";
import type { NpcDecisionRepository } from "../interfaces/npc-decision.repository";
import { decisionEvents, decisionTraces } from "../../schema/npc-intelligence";
import type {
  CandidateAction,
  DecisionTrace,
  Elimination,
  NpcDecisionEvent,
  TraceStep,
  UtilityScore,
} from "../../../domain";

interface SerializedTrace {
  traceId: string;
  npcId: string;
  householdId: string;
  decidedAt: string;
  seed: string;
  steps: TraceStep[];
  candidates: CandidateAction[];
  eliminations: Elimination[];
  scores: UtilityScore[];
  selectedCandidateId: string | null;
  selectionReason: string;
  contentHash: string;
}

export class DrizzleNpcDecisionRepository implements NpcDecisionRepository {
  constructor(private readonly db: Database) {}

  async saveTrace(trace: DecisionTrace): Promise<void> {
    const payload = this.serializeTrace(trace);
    await this.db
      .insert(decisionTraces)
      .values({
        id: trace.traceId,
        npcId: trace.npcId,
        householdId: trace.householdId,
        seed: trace.seed,
        selectedCandidateId: trace.selectedCandidateId,
        selectionReason: trace.selectionReason,
        contentHash: trace.contentHash,
        traceJson: payload,
        decidedAt: trace.decidedAt,
      })
      .onConflictDoNothing();
  }

  async listTraces(
    householdId: string,
    npcId: string,
    limit: number,
  ): Promise<DecisionTrace[]> {
    const rows = await this.db
      .select()
      .from(decisionTraces)
      .where(
        and(
          eq(decisionTraces.householdId, householdId),
          eq(decisionTraces.npcId, npcId),
        ),
      )
      .orderBy(desc(decisionTraces.decidedAt))
      .limit(limit);

    return rows.map((row) =>
      this.deserializeTrace(row.traceJson as unknown as SerializedTrace),
    );
  }

  async saveEvent(event: NpcDecisionEvent): Promise<void> {
    await this.db
      .insert(decisionEvents)
      .values({
        id: event.id,
        npcId: event.npcId,
        householdId: event.householdId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        aggregateVersion: event.aggregateVersion,
        traceId: event.traceId,
        selectedCandidateId: event.selectedCandidateId,
        createdAt: event.createdAt,
      })
      .onConflictDoNothing();
  }

  private serializeTrace(trace: DecisionTrace): SerializedTrace {
    return {
      traceId: trace.traceId,
      npcId: trace.npcId,
      householdId: trace.householdId,
      decidedAt: trace.decidedAt.toISOString(),
      seed: trace.seed,
      steps: trace.steps,
      candidates: trace.candidates,
      eliminations: trace.eliminations,
      scores: trace.scores,
      selectedCandidateId: trace.selectedCandidateId,
      selectionReason: trace.selectionReason,
      contentHash: trace.contentHash,
    };
  }

  private deserializeTrace(payload: SerializedTrace): DecisionTrace {
    return {
      ...payload,
      decidedAt: new Date(payload.decidedAt),
    };
  }
}
