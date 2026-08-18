import { and, eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import {
  testLabBranches,
  testLabRuns,
  testLabSelections,
  testLabSessions,
  testLabStateSnapshots,
} from "../../db/schema/ai";
import type {
  JsonObject,
  StateSnapshot,
  TestBranch,
  TestBranchId,
  TestPhaseId,
  TestRun,
  TestRunId,
  TestSelection,
  TestSession,
  TestSessionId,
  StateSnapshotId,
} from "../domain/test-lab-types";
import type { TestLabRepository } from "../ports/test-lab-repository";

export class DrizzleTestLabRepository implements TestLabRepository {
  constructor(private readonly db: Database) {}

  async saveSession(session: TestSession): Promise<void> {
    await this.db
      .insert(testLabSessions)
      .values({
        id: session.id,
        scenarioKey: session.scenarioKey,
        mode: session.mode,
        activeBranchId: session.activeBranchId,
        createdAt: new Date(session.createdAt),
      })
      .onConflictDoUpdate({
        target: testLabSessions.id,
        set: { activeBranchId: session.activeBranchId },
      });
  }

  async getSession(id: TestSessionId): Promise<TestSession | null> {
    const [row] = await this.db
      .select()
      .from(testLabSessions)
      .where(eq(testLabSessions.id, id))
      .limit(1);
    if (!row || !row.activeBranchId) return null;
    return {
      id: row.id,
      scenarioKey: row.scenarioKey,
      mode: row.mode as TestSession["mode"],
      activeBranchId: row.activeBranchId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async saveBranch(branch: TestBranch): Promise<void> {
    await this.db.insert(testLabBranches).values({
      id: branch.id,
      sessionId: branch.sessionId,
      parentBranchId: branch.parentBranchId,
      forkedFromPhaseId: branch.forkedFromPhaseId,
      createdAt: new Date(branch.createdAt),
    });
  }

  async getBranch(id: TestBranchId): Promise<TestBranch | null> {
    const [row] = await this.db
      .select()
      .from(testLabBranches)
      .where(eq(testLabBranches.id, id))
      .limit(1);
    return row
      ? {
          id: row.id,
          sessionId: row.sessionId,
          parentBranchId: row.parentBranchId,
          forkedFromPhaseId: row.forkedFromPhaseId,
          createdAt: row.createdAt.toISOString(),
        }
      : null;
  }

  async saveState(snapshot: StateSnapshot): Promise<void> {
    await this.db.insert(testLabStateSnapshots).values({
      id: snapshot.id,
      sessionId: snapshot.sessionId,
      branchId: snapshot.branchId,
      parentStateId: snapshot.parentStateId,
      createdByRunId: snapshot.createdByRunId,
      value: snapshot.value,
      createdAt: new Date(snapshot.createdAt),
    });
  }

  async getState(id: StateSnapshotId): Promise<StateSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(testLabStateSnapshots)
      .where(eq(testLabStateSnapshots.id, id))
      .limit(1);
    return row
      ? {
          id: row.id,
          sessionId: row.sessionId,
          branchId: row.branchId,
          parentStateId: row.parentStateId,
          createdByRunId: row.createdByRunId,
          value: row.value as JsonObject,
          createdAt: row.createdAt.toISOString(),
        }
      : null;
  }

  async saveRun(run: TestRun): Promise<void> {
    await this.db.insert(testLabRuns).values({
      id: run.id,
      sessionId: run.sessionId,
      branchId: run.branchId,
      phaseId: run.phaseId,
      parentStateId: run.parentStateId,
      candidateStateId: run.candidateStateId,
      status: run.status,
      createdAt: new Date(run.createdAt),
    });
  }

  async getRun(id: TestRunId): Promise<TestRun | null> {
    const [row] = await this.db
      .select()
      .from(testLabRuns)
      .where(eq(testLabRuns.id, id))
      .limit(1);
    return row ? this.mapRun(row) : null;
  }

  async listRuns(branchId: TestBranchId): Promise<TestRun[]> {
    const rows = await this.db.select().from(testLabRuns).where(eq(testLabRuns.branchId, branchId));
    return rows.map((row) => this.mapRun(row));
  }

  async saveSelection(selection: TestSelection): Promise<void> {
    await this.db.insert(testLabSelections).values({
      id: selection.id,
      sessionId: selection.sessionId,
      branchId: selection.branchId,
      phaseId: selection.phaseId,
      runId: selection.runId,
      selectedStateId: selection.selectedStateId,
      actor: selection.actor,
      strategy: selection.strategy,
      createdAt: new Date(selection.createdAt),
    });
  }

  async getSelection(
    branchId: TestBranchId,
    phaseId: TestPhaseId,
  ): Promise<TestSelection | null> {
    const [row] = await this.db
      .select()
      .from(testLabSelections)
      .where(and(eq(testLabSelections.branchId, branchId), eq(testLabSelections.phaseId, phaseId)))
      .limit(1);
    return row ? this.mapSelection(row) : null;
  }

  async listSelections(branchId: TestBranchId): Promise<TestSelection[]> {
    const rows = await this.db
      .select()
      .from(testLabSelections)
      .where(eq(testLabSelections.branchId, branchId));
    return rows.map((row) => this.mapSelection(row));
  }

  private mapRun(row: typeof testLabRuns.$inferSelect): TestRun {
    return {
      id: row.id,
      sessionId: row.sessionId,
      branchId: row.branchId,
      phaseId: row.phaseId,
      parentStateId: row.parentStateId,
      candidateStateId: row.candidateStateId,
      status: row.status as TestRun["status"],
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapSelection(row: typeof testLabSelections.$inferSelect): TestSelection {
    return {
      id: row.id,
      sessionId: row.sessionId,
      branchId: row.branchId,
      phaseId: row.phaseId,
      runId: row.runId,
      selectedStateId: row.selectedStateId,
      actor: row.actor as TestSelection["actor"],
      strategy: row.strategy,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
