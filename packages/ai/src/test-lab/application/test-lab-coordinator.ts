import type {
  ModelPricingSnapshot,
  TestRunUsageSnapshot,
} from "../domain/model-profile";
import { TestLabInvariantError } from "../domain/test-lab-errors";
import type {
  JsonObject,
  StateSnapshot,
  TestBranch,
  TestExecutionMode,
  TestRun,
  TestSelection,
  TestSelectionActor,
  TestSession,
} from "../domain/test-lab-types";
import type { TestLabRepository } from "../ports/test-lab-repository";

export class TestLabCoordinator {
  constructor(private readonly repository: TestLabRepository) {}

  async createSession(input: {
    sessionId: string;
    branchId: string;
    scenarioKey: string;
    mode?: TestExecutionMode;
    initialStateId: string;
    initialState: JsonObject;
    now: string;
  }): Promise<{ session: TestSession; initialState: StateSnapshot }> {
    if (await this.repository.getSession(input.sessionId)) {
      throw new TestLabInvariantError(
        `TEST_LAB_SESSION_ALREADY_EXISTS:${input.sessionId}`,
      );
    }

    const branch: TestBranch = {
      id: input.branchId,
      sessionId: input.sessionId,
      parentBranchId: null,
      forkedFromPhaseId: null,
      createdAt: input.now,
    };

    const state: StateSnapshot = {
      id: input.initialStateId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      parentStateId: null,
      createdByRunId: null,
      value: structuredClone(input.initialState),
      createdAt: input.now,
    };

    const session: TestSession = {
      id: input.sessionId,
      scenarioKey: input.scenarioKey,
      mode: input.mode ?? "manual",
      activeBranchId: input.branchId,
      createdAt: input.now,
    };

    await this.repository.saveSession(session);
    await this.repository.saveBranch(branch);
    await this.repository.saveState(state);

    return { session, initialState: state };
  }

  async recordCandidate(input: {
    runId: string;
    candidateStateId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    parentStateId: string;
    candidateState: JsonObject;
    modelSlug?: string | null;
    pricingSnapshot?: ModelPricingSnapshot | null;
    usageSnapshot?: TestRunUsageSnapshot | null;
    now: string;
  }): Promise<{ run: TestRun; candidateState: StateSnapshot }> {
    const session = await this.requireSession(input.sessionId);
    const branch = await this.requireBranch(input.branchId);
    const parentState = await this.requireState(input.parentStateId);

    if (
      branch.sessionId !== session.id ||
      parentState.sessionId !== session.id
    ) {
      throw new TestLabInvariantError("TEST_LAB_CROSS_SESSION_REFERENCE");
    }

    if (parentState.branchId !== branch.id) {
      const branchSelections = await this.repository.listSelections(branch.id);
      const selectedOnBranch = branchSelections.some(
        (selection) => selection.selectedStateId === parentState.id,
      );
      if (!selectedOnBranch) {
        throw new TestLabInvariantError(
          "TEST_LAB_PARENT_STATE_NOT_SELECTED_ON_BRANCH",
        );
      }
    }

    const hasModel = input.modelSlug !== undefined && input.modelSlug !== null;
    const hasPricing =
      input.pricingSnapshot !== undefined && input.pricingSnapshot !== null;
    if (hasModel !== hasPricing) {
      throw new TestLabInvariantError(
        "TEST_LAB_MODEL_PRICING_SNAPSHOT_REQUIRES_MODEL_SLUG",
      );
    }
    if (input.usageSnapshot && (!hasModel || !hasPricing)) {
      throw new TestLabInvariantError(
        "TEST_LAB_USAGE_REQUIRES_MODEL_PRICING_SNAPSHOT",
      );
    }

    const candidateState: StateSnapshot = {
      id: input.candidateStateId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      parentStateId: input.parentStateId,
      createdByRunId: input.runId,
      value: structuredClone(input.candidateState),
      createdAt: input.now,
    };

    const run: TestRun = {
      id: input.runId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      phaseId: input.phaseId,
      parentStateId: input.parentStateId,
      candidateStateId: input.candidateStateId,
      status: "candidate",
      modelSlug: input.modelSlug ?? null,
      pricingSnapshot: input.pricingSnapshot ?? null,
      usageSnapshot: input.usageSnapshot ?? null,
      createdAt: input.now,
    };

    await this.repository.saveState(candidateState);
    await this.repository.saveRun(run);

    return { run, candidateState };
  }

  async selectCandidate(input: {
    selectionId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    runId: string;
    actor: TestSelectionActor;
    strategy?: string | null;
    forkBranchId?: string;
    now: string;
  }): Promise<{
    selection: TestSelection;
    activeBranchId: string;
    forked: boolean;
  }> {
    const session = await this.requireSession(input.sessionId);
    const branch = await this.requireBranch(input.branchId);
    const run = await this.requireRun(input.runId);

    if (branch.sessionId !== session.id || run.sessionId !== session.id) {
      throw new TestLabInvariantError("TEST_LAB_CROSS_SESSION_REFERENCE");
    }
    if (run.phaseId !== input.phaseId) {
      throw new TestLabInvariantError("TEST_LAB_RUN_PHASE_MISMATCH");
    }

    const existing = await this.repository.getSelection(
      input.branchId,
      input.phaseId,
    );
    if (!existing) {
      if (run.branchId !== input.branchId) {
        throw new TestLabInvariantError("TEST_LAB_RUN_BRANCH_MISMATCH");
      }
      const selection = this.buildSelection({
        ...input,
        selectedStateId: run.candidateStateId,
      });
      await this.repository.saveSelection(selection);
      await this.repository.saveSession({
        ...session,
        activeBranchId: input.branchId,
      });
      return { selection, activeBranchId: input.branchId, forked: false };
    }

    if (existing.runId === run.id) {
      return {
        selection: existing,
        activeBranchId: input.branchId,
        forked: false,
      };
    }

    if (!input.forkBranchId) {
      throw new TestLabInvariantError(
        "TEST_LAB_RESELECTION_REQUIRES_FORK_BRANCH",
      );
    }

    const fork: TestBranch = {
      id: input.forkBranchId,
      sessionId: session.id,
      parentBranchId: branch.id,
      forkedFromPhaseId: input.phaseId,
      createdAt: input.now,
    };
    await this.repository.saveBranch(fork);

    const selection = this.buildSelection({
      ...input,
      branchId: fork.id,
      selectedStateId: run.candidateStateId,
    });
    await this.repository.saveSelection(selection);
    await this.repository.saveSession({ ...session, activeBranchId: fork.id });

    return { selection, activeBranchId: fork.id, forked: true };
  }

  private buildSelection(input: {
    selectionId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    runId: string;
    selectedStateId: string;
    actor: TestSelectionActor;
    strategy?: string | null;
    now: string;
  }): TestSelection {
    return {
      id: input.selectionId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      phaseId: input.phaseId,
      runId: input.runId,
      selectedStateId: input.selectedStateId,
      actor: input.actor,
      strategy: input.strategy ?? null,
      createdAt: input.now,
    };
  }

  private async requireSession(id: string): Promise<TestSession> {
    const value = await this.repository.getSession(id);
    if (!value) {
      throw new TestLabInvariantError(`TEST_LAB_SESSION_NOT_FOUND:${id}`);
    }
    return value;
  }

  private async requireBranch(id: string): Promise<TestBranch> {
    const value = await this.repository.getBranch(id);
    if (!value) {
      throw new TestLabInvariantError(`TEST_LAB_BRANCH_NOT_FOUND:${id}`);
    }
    return value;
  }

  private async requireState(id: string): Promise<StateSnapshot> {
    const value = await this.repository.getState(id);
    if (!value) {
      throw new TestLabInvariantError(`TEST_LAB_STATE_NOT_FOUND:${id}`);
    }
    return value;
  }

  private async requireRun(id: string): Promise<TestRun> {
    const value = await this.repository.getRun(id);
    if (!value) {
      throw new TestLabInvariantError(`TEST_LAB_RUN_NOT_FOUND:${id}`);
    }
    return value;
  }
}
