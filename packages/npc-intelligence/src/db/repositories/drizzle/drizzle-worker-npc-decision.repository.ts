import { and, eq } from "drizzle-orm";

import type { Database } from "../../client";
import { workerNpcDecisions } from "../../schema/npc-intelligence/worker-decisions";

export interface WorkerNpcDecisionCommit {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  decisionKey: string;
  selectedCandidateId: string | null;
  usedMemoryIds: string[];
  resultJson: Record<string, unknown>;
  decidedAt: Date;
}

export type WorkerNpcDecisionCommitResult = "applied" | "duplicate";

export class DrizzleWorkerNpcDecisionRepository {
  constructor(private readonly db: Database) {}

  async commit(
    input: WorkerNpcDecisionCommit,
  ): Promise<WorkerNpcDecisionCommitResult> {
    const rows = await this.db
      .insert(workerNpcDecisions)
      .values({
        id: crypto.randomUUID(),
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        npcId: input.npcId,
        decisionKey: input.decisionKey,
        selectedCandidateId: input.selectedCandidateId,
        usedMemoryIds: [...input.usedMemoryIds].sort(),
        resultJson: input.resultJson,
        decidedAt: input.decidedAt,
      })
      .onConflictDoNothing({
        target: [
          workerNpcDecisions.householdId,
          workerNpcDecisions.worldId,
          workerNpcDecisions.childProfileId,
          workerNpcDecisions.npcId,
          workerNpcDecisions.decisionKey,
        ],
      })
      .returning({ id: workerNpcDecisions.id });

    return rows.length === 1 ? "applied" : "duplicate";
  }

  async has(
    householdId: string,
    worldId: string,
    childProfileId: string,
    npcId: string,
    decisionKey: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: workerNpcDecisions.id })
      .from(workerNpcDecisions)
      .where(
        and(
          eq(workerNpcDecisions.householdId, householdId),
          eq(workerNpcDecisions.worldId, worldId),
          eq(workerNpcDecisions.childProfileId, childProfileId),
          eq(workerNpcDecisions.npcId, npcId),
          eq(workerNpcDecisions.decisionKey, decisionKey),
        ),
      )
      .limit(1);

    return rows.length === 1;
  }
}
