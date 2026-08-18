import { TestLabInvariantError } from "../domain/test-lab-errors";
import type {
  StateSnapshot,
  StateSnapshotId,
  TestBranch,
  TestBranchId,
  TestPhaseId,
  TestRun,
  TestRunId,
  TestSelection,
  TestSession,
  TestSessionId,
} from "../domain/test-lab-types";
import type { TestLabRepository } from "../ports/test-lab-repository";

export class InMemoryTestLabRepository implements TestLabRepository {
  private readonly sessions = new Map<TestSessionId, TestSession>();
  private readonly branches = new Map<TestBranchId, TestBranch>();
  private readonly states = new Map<StateSnapshotId, StateSnapshot>();
  private readonly runs = new Map<TestRunId, TestRun>();
  private readonly selections = new Map<string, TestSelection>();

  async saveSession(session: TestSession): Promise<void> {
    this.sessions.set(session.id, structuredClone(session));
  }

  async getSession(id: TestSessionId): Promise<TestSession | null> {
    const value = this.sessions.get(id);
    return value ? structuredClone(value) : null;
  }

  async saveBranch(branch: TestBranch): Promise<void> {
    if (this.branches.has(branch.id)) {
      throw new TestLabInvariantError(`TEST_LAB_BRANCH_ALREADY_EXISTS:${branch.id}`);
    }
    this.branches.set(branch.id, structuredClone(branch));
  }

  async getBranch(id: TestBranchId): Promise<TestBranch | null> {
    const value = this.branches.get(id);
    return value ? structuredClone(value) : null;
  }

  async saveState(snapshot: StateSnapshot): Promise<void> {
    if (this.states.has(snapshot.id)) {
      throw new TestLabInvariantError(`TEST_LAB_STATE_ALREADY_EXISTS:${snapshot.id}`);
    }
    this.states.set(snapshot.id, structuredClone(snapshot));
  }

  async getState(id: StateSnapshotId): Promise<StateSnapshot | null> {
    const value = this.states.get(id);
    return value ? structuredClone(value) : null;
  }

  async saveRun(run: TestRun): Promise<void> {
    if (this.runs.has(run.id)) {
      throw new TestLabInvariantError(`TEST_LAB_RUN_ALREADY_EXISTS:${run.id}`);
    }
    this.runs.set(run.id, structuredClone(run));
  }

  async getRun(id: TestRunId): Promise<TestRun | null> {
    const value = this.runs.get(id);
    return value ? structuredClone(value) : null;
  }

  async listRuns(branchId: TestBranchId): Promise<TestRun[]> {
    return [...this.runs.values()]
      .filter((run) => run.branchId === branchId)
      .map((run) => structuredClone(run));
  }

  async saveSelection(selection: TestSelection): Promise<void> {
    const key = this.selectionKey(selection.branchId, selection.phaseId);
    if (this.selections.has(key)) {
      throw new TestLabInvariantError(
        `TEST_LAB_SELECTION_ALREADY_EXISTS:${selection.branchId}:${selection.phaseId}`,
      );
    }
    this.selections.set(key, structuredClone(selection));
  }

  async getSelection(
    branchId: TestBranchId,
    phaseId: TestPhaseId,
  ): Promise<TestSelection | null> {
    const value = this.selections.get(this.selectionKey(branchId, phaseId));
    return value ? structuredClone(value) : null;
  }

  async listSelections(branchId: TestBranchId): Promise<TestSelection[]> {
    return [...this.selections.values()]
      .filter((selection) => selection.branchId === branchId)
      .map((selection) => structuredClone(selection));
  }

  private selectionKey(branchId: TestBranchId, phaseId: TestPhaseId): string {
    return `${branchId}::${phaseId}`;
  }
}
