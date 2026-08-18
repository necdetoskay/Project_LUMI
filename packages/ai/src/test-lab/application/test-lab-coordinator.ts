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
  TestRunCandidate,
  TestRunExecutionSnapshot,
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

  async recordRunCandidates(input: {
    runId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    parentStateId: string;
    candidates: Array<{
      candidateId: string;
      candidateStateId: string;
      payload: JsonObject;
      candidateState: JsonObject;
    }>;
    modelSlug?: string | null;
    pricingSnapshot?: ModelPricingSnapshot | null;
    usageSnapshot?: TestRunUsageSnapshot | null;
    executionSnapshot?: TestRunExecutionSnapshot | null;
    now: string;
  }): Promise<{
    run: TestRun;
    candidates: Array<{ candidate: TestRunCandidate; state: StateSnapshot }>;
  }> {
    const session = await this.requireSession(input.sessionId);
    const branch = await this.requireBranch(input.branchId);
    const parentState = await this.requireState(input.parentStateId);
    if (
      branch.sessionId !== session.id ||
      parentState.sessionId !== session.id
    ) {
      throw new TestLabInvariantError("TEST_LAB_CROSS_SESSION_REFERENCE");
    }
    await this.assertParentStateUsable(branch.id, parentState);
    this.assertUsageTraceability(input);
    if (input.candidates.length === 0) {
      throw new TestLabInvariantError("TEST_LAB_RUN_REQUIRES_CANDIDATE");
    }

    const run: TestRun = {
      id: input.runId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      phaseId: input.phaseId,
      parentStateId: input.parentStateId,
      status: "candidate",
      modelSlug: input.modelSlug ?? null,
      pricingSnapshot: input.pricingSnapshot ?? null,
      usageSnapshot: input.usageSnapshot ?? null,
      executionSnapshot: input.executionSnapshot ?? null,
      createdAt: input.now,
    };
    await this.repository.saveRun(run);

    const results: Array<{
      candidate: TestRunCandidate;
      state: StateSnapshot;
    }> = [];
    for (const [ordinal, item] of input.candidates.entries()) {
      const state: StateSnapshot = {
        id: item.candidateStateId,
        sessionId: input.sessionId,
        branchId: input.branchId,
        parentStateId: input.parentStateId,
        createdByRunId: input.runId,
        value: structuredClone(item.candidateState),
        createdAt: input.now,
      };
      const candidate: TestRunCandidate = {
        id: item.candidateId,
        runId: input.runId,
        sessionId: input.sessionId,
        branchId: input.branchId,
        phaseId: input.phaseId,
        ordinal,
        payload: structuredClone(item.payload),
        candidateStateId: item.candidateStateId,
        createdAt: input.now,
      };
      await this.repository.saveState(state);
      await this.repository.saveCandidate(candidate);
      results.push({ candidate, state });
    }
    return { run, candidates: results };
  }

  async recordCandidate(input: {
    runId: string;
    candidateId?: string;
    candidateStateId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    parentStateId: string;
    candidateState: JsonObject;
    candidatePayload?: JsonObject;
    modelSlug?: string | null;
    pricingSnapshot?: ModelPricingSnapshot | null;
    usageSnapshot?: TestRunUsageSnapshot | null;
    executionSnapshot?: TestRunExecutionSnapshot | null;
    now: string;
  }): Promise<{ run: TestRun; candidateState: StateSnapshot }> {
    const result = await this.recordRunCandidates({
      ...input,
      candidates: [
        {
          candidateId: input.candidateId ?? crypto.randomUUID(),
          candidateStateId: input.candidateStateId,
          payload: input.candidatePayload ?? {},
          candidateState: input.candidateState,
        },
      ],
    });
    return { run: result.run, candidateState: result.candidates[0]!.state };
  }

  async selectCandidate(input: {
    selectionId: string;
    sessionId: string;
    branchId: string;
    phaseId: string;
    runId: string;
    candidateId?: string;
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
    const candidate = await this.resolveCandidate(run.id, input.candidateId);
    if (
      candidate.runId !== run.id ||
      candidate.phaseId !== input.phaseId ||
      candidate.sessionId !== session.id
    ) {
      throw new TestLabInvariantError("TEST_LAB_CANDIDATE_RUN_MISMATCH");
    }

    const existing = await this.repository.getSelection(
      input.branchId,
      input.phaseId,
    );
    if (!existing) {
      if (
        run.branchId !== input.branchId ||
        candidate.branchId !== input.branchId
      ) {
        throw new TestLabInvariantError("TEST_LAB_RUN_BRANCH_MISMATCH");
      }
      const selection = this.buildSelection(input, candidate);
      await this.repository.saveSelection(selection);
      await this.repository.saveSession({
        ...session,
        activeBranchId: input.branchId,
      });
      return { selection, activeBranchId: input.branchId, forked: false };
    }

    if (existing.candidateId === candidate.id) {
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
    const selection = this.buildSelection(
      { ...input, branchId: fork.id },
      candidate,
    );
    await this.repository.saveSelection(selection);
    await this.repository.saveSession({ ...session, activeBranchId: fork.id });
    return { selection, activeBranchId: fork.id, forked: true };
  }

  private buildSelection(
    input: {
      selectionId: string;
      sessionId: string;
      branchId: string;
      phaseId: string;
      runId: string;
      actor: TestSelectionActor;
      strategy?: string | null;
      now: string;
    },
    candidate: TestRunCandidate,
  ): TestSelection {
    return {
      id: input.selectionId,
      sessionId: input.sessionId,
      branchId: input.branchId,
      phaseId: input.phaseId,
      runId: input.runId,
      candidateId: candidate.id,
      selectedStateId: candidate.candidateStateId,
      actor: input.actor,
      strategy: input.strategy ?? null,
      createdAt: input.now,
    };
  }

  private async resolveCandidate(runId: string, candidateId?: string) {
    if (candidateId) {
      const candidate = await this.repository.getCandidate(candidateId);
      if (!candidate)
        throw new TestLabInvariantError(
          `TEST_LAB_CANDIDATE_NOT_FOUND:${candidateId}`,
        );
      return candidate;
    }
    const candidates = await this.repository.listCandidates(runId);
    if (candidates.length !== 1) {
      throw new TestLabInvariantError("TEST_LAB_CANDIDATE_ID_REQUIRED");
    }
    return candidates[0]!;
  }

  private async assertParentStateUsable(
    branchId: string,
    parentState: StateSnapshot,
  ) {
    if (parentState.branchId === branchId) return;
    const selections = await this.repository.listSelections(branchId);
    if (
      !selections.some(
        (selection) => selection.selectedStateId === parentState.id,
      )
    ) {
      throw new TestLabInvariantError(
        "TEST_LAB_PARENT_STATE_NOT_SELECTED_ON_BRANCH",
      );
    }
  }

  private assertUsageTraceability(input: {
    modelSlug?: string | null;
    pricingSnapshot?: ModelPricingSnapshot | null;
    usageSnapshot?: TestRunUsageSnapshot | null;
  }) {
    const hasModel = input.modelSlug != null;
    const hasPricing = input.pricingSnapshot != null;
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
  }

  private async requireSession(id: string): Promise<TestSession> {
    const value = await this.repository.getSession(id);
    if (!value)
      throw new TestLabInvariantError(`TEST_LAB_SESSION_NOT_FOUND:${id}`);
    return value;
  }

  private async requireBranch(id: string): Promise<TestBranch> {
    const value = await this.repository.getBranch(id);
    if (!value)
      throw new TestLabInvariantError(`TEST_LAB_BRANCH_NOT_FOUND:${id}`);
    return value;
  }

  private async requireState(id: string): Promise<StateSnapshot> {
    const value = await this.repository.getState(id);
    if (!value)
      throw new TestLabInvariantError(`TEST_LAB_STATE_NOT_FOUND:${id}`);
    return value;
  }

  private async requireRun(id: string): Promise<TestRun> {
    const value = await this.repository.getRun(id);
    if (!value) throw new TestLabInvariantError(`TEST_LAB_RUN_NOT_FOUND:${id}`);
    return value;
  }
}
