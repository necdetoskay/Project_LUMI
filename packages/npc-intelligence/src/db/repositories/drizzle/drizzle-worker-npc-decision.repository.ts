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

export interface WorkerNpcDecisionEvidence extends WorkerNpcDecisionCommit {
  id: string;
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

  async get(
    householdId: string,
    worldId: string,
    childProfileId: string,
    npcId: string,
    decisionKey: string,
  ): Promise<WorkerNpcDecisionEvidence | null> {
    const rows = await this.db
      .select()
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
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      householdId: row.householdId,
      worldId: row.worldId,
      childProfileId: row.childProfileId,
      npcId: row.npcId,
      decisionKey: row.decisionKey,
      selectedCandidateId: row.selectedCandidateId,
      usedMemoryIds: row.usedMemoryIds ?? [],
      resultJson: row.resultJson,
      decidedAt: row.decidedAt,
    };
  }

  async has(
    householdId: string,
    worldId: string,
    childProfileId: string,
    npcId: string,
    decisionKey: string,
  ): Promise<boolean> {
    return (
      (await this.get(
        householdId,
        worldId,
        childProfileId,
        npcId,
        decisionKey,
      )) !== null
    );
  }
}
