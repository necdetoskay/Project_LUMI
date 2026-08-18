import type {
  ModelPricingSnapshot,
  TestRunUsageSnapshot,
} from "./model-profile";

export type TestSessionId = string;
export type TestBranchId = string;
export type TestPhaseId = string;
export type TestRunId = string;
export type TestRunCandidateId = string;
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

export interface TestRunExecutionSnapshot {
  productionOperation: string;
  promptKey: string | null;
  promptVersion: number | null;
  promptTemplateSnapshot: {
    system: string;
    user: string;
  } | null;
  renderedPrompt: {
    system: string;
    user: string;
  } | null;
  finalProviderRequest: JsonObject | null;
  renderedPromptFingerprint: string | null;
  contextFingerprint: string | null;
}

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
  status: TestRunStatus;
  modelSlug: string | null;
  pricingSnapshot: ModelPricingSnapshot | null;
  usageSnapshot: TestRunUsageSnapshot | null;
  executionSnapshot: TestRunExecutionSnapshot | null;
  createdAt: string;
}

export interface TestRunCandidate {
  id: TestRunCandidateId;
  runId: TestRunId;
  sessionId: TestSessionId;
  branchId: TestBranchId;
  phaseId: TestPhaseId;
  ordinal: number;
  payload: JsonObject;
  candidateStateId: StateSnapshotId;
  createdAt: string;
}

export interface TestSelection {
  id: TestSelectionId;
  sessionId: TestSessionId;
  branchId: TestBranchId;
  phaseId: TestPhaseId;
  runId: TestRunId;
  candidateId: TestRunCandidateId;
  selectedStateId: StateSnapshotId;
  actor: TestSelectionActor;
  strategy: string | null;
  createdAt: string;
}

export interface StateDiff {
  fromStateId: StateSnapshotId;
  toStateId: StateSnapshotId;
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
}
