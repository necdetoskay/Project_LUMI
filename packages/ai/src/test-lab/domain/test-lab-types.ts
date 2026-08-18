export type TestSessionId = string;
export type TestBranchId = string;
export type TestPhaseId = string;
export type TestRunId = string;
export type StateSnapshotId = string;
export type TestSelectionId = string;

export type TestExecutionMode = "manual" | "automated";
export type TestSelectionActor = "human" | "automation";
export type TestRunStatus = "candidate" | "failed";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface TestSession {
  id: TestSessionId;
  scenarioKey: string;
  mode: TestExecutionMode;
  activeBranchId: TestBranchId;
  createdAt: string;
}

export interface TestBranch {
  id: TestBranchId;
  sessionId: TestSessionId;
  parentBranchId: TestBranchId | null;
  forkedFromPhaseId: TestPhaseId | null;
  createdAt: string;
}

export interface StateSnapshot {
  id: StateSnapshotId;
  sessionId: TestSessionId;
  branchId: TestBranchId;
  parentStateId: StateSnapshotId | null;
  createdByRunId: TestRunId | null;
  value: JsonObject;
  createdAt: string;
}

export interface TestRun {
  id: TestRunId;
  sessionId: TestSessionId;
  branchId: TestBranchId;
  phaseId: TestPhaseId;
  parentStateId: StateSnapshotId;
  candidateStateId: StateSnapshotId;
  status: TestRunStatus;
  createdAt: string;
}

export interface TestSelection {
  id: TestSelectionId;
  sessionId: TestSessionId;
  branchId: TestBranchId;
  phaseId: TestPhaseId;
  runId: TestRunId;
  selectedStateId: StateSnapshotId;
  actor: TestSelectionActor;
  strategy: string | null;
  createdAt: string;
}

export interface StateDiff {
  fromStateId: StateSnapshotId;
  toStateId: StateSnapshotId;
  changedTopLevelKeys: string[];
}
