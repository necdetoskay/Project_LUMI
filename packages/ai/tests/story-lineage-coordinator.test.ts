import { describe, expect, it } from "vitest";

import { TestLabCoordinator } from "../src/test-lab/application/test-lab-coordinator";
import { InMemoryTestLabRepository } from "../src/test-lab/infrastructure/in-memory-test-lab-repository";

const now = "2026-08-18T13:10:00.000Z";

describe("stateful story lineage", () => {
  it("advances Story N+1 from only the selected Story N candidate", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);

    await coordinator.createSession({
      sessionId: "story-session",
      branchId: "branch-main",
      scenarioKey: "story_generation",
      initialStateId: "state-0",
      initialState: {
        storyLab: {
          worldId: "world-1",
          sourceTitle: "Bridge lights",
          stories: [],
        },
      },
      now,
    });

    await coordinator.recordCandidate({
      runId: "run-story-a",
      candidateStateId: "state-story-a",
      sessionId: "story-session",
      branchId: "branch-main",
      phaseId: "story_001",
      parentStateId: "state-0",
      candidateState: {
        storyLab: {
          worldId: "world-1",
          sourceTitle: "Bridge lights",
          stories: [{ id: "story-a" }],
        },
      },
      now,
    });
    await coordinator.recordCandidate({
      runId: "run-story-b",
      candidateStateId: "state-story-b",
      sessionId: "story-session",
      branchId: "branch-main",
      phaseId: "story_001",
      parentStateId: "state-0",
      candidateState: {
        storyLab: {
          worldId: "world-1",
          sourceTitle: "Bridge lights",
          stories: [{ id: "story-b" }],
        },
      },
      now,
    });

    await coordinator.selectCandidate({
      selectionId: "selection-story-a",
      sessionId: "story-session",
      branchId: "branch-main",
      phaseId: "story_001",
      runId: "run-story-a",
      actor: "human",
      now,
    });

    await coordinator.recordCandidate({
      runId: "run-story-002",
      candidateStateId: "state-story-002",
      sessionId: "story-session",
      branchId: "branch-main",
      phaseId: "story_002",
      parentStateId: "state-story-a",
      candidateState: {
        storyLab: {
          worldId: "world-1",
          sourceTitle: "Bridge lights",
          stories: [{ id: "story-a" }, { id: "story-002" }],
        },
      },
      now,
    });

    expect((await repository.getRun("run-story-002"))?.parentStateId).toBe(
      "state-story-a",
    );
    expect((await repository.getState("state-story-b"))?.value).toEqual({
      storyLab: {
        worldId: "world-1",
        sourceTitle: "Bridge lights",
        stories: [{ id: "story-b" }],
      },
    });

    const reselection = await coordinator.selectCandidate({
      selectionId: "selection-story-b-fork",
      sessionId: "story-session",
      branchId: "branch-main",
      phaseId: "story_001",
      runId: "run-story-b",
      actor: "human",
      forkBranchId: "branch-story-b",
      now,
    });

    expect(reselection.forked).toBe(true);
    expect(
      (await repository.getSelection("branch-main", "story_001"))?.runId,
    ).toBe("run-story-a");
    expect(
      (await repository.getSelection("branch-story-b", "story_001"))?.runId,
    ).toBe("run-story-b");
    expect((await repository.getRun("run-story-002"))?.branchId).toBe(
      "branch-main",
    );
  });
});
