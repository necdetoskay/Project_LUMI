import { describe, expect, it } from "vitest";

import { TestLabCoordinator } from "../src/application/test-lab-coordinator";
import { InMemoryTestLabRepository } from "../src/infrastructure/in-memory-test-lab-repository";

describe("TestLabCoordinator", () => {
  it("keeps candidate states isolated and advances only the selected candidate", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T07:45:00.000Z";

    await coordinator.createSession({
      sessionId: "session-1",
      branchId: "branch-main",
      scenarioKey: "character_onboarding",
      initialStateId: "state-0",
      initialState: { world: null, marker: "initial" },
      now,
    });

    await coordinator.recordCandidate({
      runId: "run-a",
      candidateStateId: "state-a",
      sessionId: "session-1",
      branchId: "branch-main",
      phaseId: "world",
      parentStateId: "state-0",
      candidateState: { world: "A", marker: "candidate-a" },
      now,
    });

    await coordinator.recordCandidate({
      runId: "run-b",
      candidateStateId: "state-b",
      sessionId: "session-1",
      branchId: "branch-main",
      phaseId: "world",
      parentStateId: "state-0",
      candidateState: { world: "B", marker: "candidate-b" },
      now,
    });

    expect((await repository.getState("state-0"))?.value).toEqual({
      world: null,
      marker: "initial",
    });
    expect((await repository.getState("state-a"))?.value).toEqual({
      world: "A",
      marker: "candidate-a",
    });
    expect((await repository.getState("state-b"))?.value).toEqual({
      world: "B",
      marker: "candidate-b",
    });

    const selectedB = await coordinator.selectCandidate({
      selectionId: "selection-b",
      sessionId: "session-1",
      branchId: "branch-main",
      phaseId: "world",
      runId: "run-b",
      actor: "human",
      now,
    });

    expect(selectedB.selection.selectedStateId).toBe("state-b");
    expect(selectedB.forked).toBe(false);

    await coordinator.recordCandidate({
      runId: "run-next",
      candidateStateId: "state-next",
      sessionId: "session-1",
      branchId: "branch-main",
      phaseId: "region",
      parentStateId: "state-b",
      candidateState: { world: "B", region: "B-region" },
      now,
    });

    expect((await repository.getRun("run-next"))?.parentStateId).toBe("state-b");
    expect((await repository.getState("state-a"))?.value).toEqual({
      world: "A",
      marker: "candidate-a",
    });
  });

  it("forks instead of overwriting history when an earlier selection changes", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T07:46:00.000Z";

    await coordinator.createSession({
      sessionId: "session-2",
      branchId: "branch-main",
      scenarioKey: "character_onboarding",
      initialStateId: "state-0",
      initialState: { world: null },
      now,
    });

    for (const candidate of ["a", "b"] as const) {
      await coordinator.recordCandidate({
        runId: `run-${candidate}`,
        candidateStateId: `state-${candidate}`,
        sessionId: "session-2",
        branchId: "branch-main",
        phaseId: "world",
        parentStateId: "state-0",
        candidateState: { world: candidate.toUpperCase() },
        now,
      });
    }

    await coordinator.selectCandidate({
      selectionId: "selection-b",
      sessionId: "session-2",
      branchId: "branch-main",
      phaseId: "world",
      runId: "run-b",
      actor: "human",
      now,
    });

    await coordinator.recordCandidate({
      runId: "run-region-b",
      candidateStateId: "state-region-b",
      sessionId: "session-2",
      branchId: "branch-main",
      phaseId: "region",
      parentStateId: "state-b",
      candidateState: { world: "B", region: "B-region" },
      now,
    });

    const reselection = await coordinator.selectCandidate({
      selectionId: "selection-a-fork",
      sessionId: "session-2",
      branchId: "branch-main",
      phaseId: "world",
      runId: "run-a",
      actor: "human",
      forkBranchId: "branch-a",
      now,
    });

    expect(reselection.forked).toBe(true);
    expect(reselection.activeBranchId).toBe("branch-a");
    expect((await repository.getSelection("branch-main", "world"))?.runId).toBe("run-b");
    expect((await repository.getSelection("branch-a", "world"))?.runId).toBe("run-a");
    expect((await repository.getRun("run-region-b"))?.branchId).toBe("branch-main");

    await coordinator.recordCandidate({
      runId: "run-region-a",
      candidateStateId: "state-region-a",
      sessionId: "session-2",
      branchId: "branch-a",
      phaseId: "region",
      parentStateId: "state-a",
      candidateState: { world: "A", region: "A-region" },
      now,
    });

    expect((await repository.getRun("run-region-a"))?.parentStateId).toBe("state-a");
    expect((await repository.getRun("run-region-b"))?.parentStateId).toBe("state-b");
    expect((await repository.getSession("session-2"))?.activeBranchId).toBe("branch-a");
  });
});
