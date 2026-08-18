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

export interface TestLabRepository {
  saveSession(session: TestSession): Promise<void>;
  getSession(id: TestSessionId): Promise<TestSession | null>;
  saveBranch(branch: TestBranch): Promise<void>;
  getBranch(id: TestBranchId): Promise<TestBranch | null>;
  saveState(snapshot: StateSnapshot): Promise<void>;
  getState(id: StateSnapshotId): Promise<StateSnapshot | null>;
  saveRun(run: TestRun): Promise<void>;
  getRun(id: TestRunId): Promise<TestRun | null>;
  listRuns(branchId: TestBranchId): Promise<TestRun[]>;
  saveSelection(selection: TestSelection): Promise<void>;
  getSelection(
    branchId: TestBranchId,
    phaseId: TestPhaseId,
  ): Promise<TestSelection | null>;
  listSelections(branchId: TestBranchId): Promise<TestSelection[]>;
}
