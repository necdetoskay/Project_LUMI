import { describe, expect, it } from "vitest";

import { TestLabCoordinator } from "../src/test-lab/application/test-lab-coordinator";
import { pricingSnapshot } from "../src/test-lab/domain/model-profile";
import { InMemoryTestLabRepository } from "../src/test-lab/infrastructure/in-memory-test-lab-repository";

describe("TestLabCoordinator", () => {
  it("keeps candidate states isolated and advances only the selected candidate", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T07:45:00.000Z";
    await coordinator.createSession({ sessionId: "session-1", branchId: "branch-main", scenarioKey: "character_onboarding", initialStateId: "state-0", initialState: { world: null, marker: "initial" }, now });
    await coordinator.recordCandidate({ runId: "run-a", candidateStateId: "state-a", sessionId: "session-1", branchId: "branch-main", phaseId: "world", parentStateId: "state-0", candidateState: { world: "A", marker: "candidate-a" }, now });
    await coordinator.recordCandidate({ runId: "run-b", candidateStateId: "state-b", sessionId: "session-1", branchId: "branch-main", phaseId: "world", parentStateId: "state-0", candidateState: { world: "B", marker: "candidate-b" }, now });
    const selectedB = await coordinator.selectCandidate({ selectionId: "selection-b", sessionId: "session-1", branchId: "branch-main", phaseId: "world", runId: "run-b", actor: "human", now });
    expect(selectedB.selection.selectedStateId).toBe("state-b");
    await coordinator.recordCandidate({ runId: "run-next", candidateStateId: "state-next", sessionId: "session-1", branchId: "branch-main", phaseId: "region", parentStateId: "state-b", candidateState: { world: "B", region: "B-region" }, now });
    expect((await repository.getRun("run-next"))?.parentStateId).toBe("state-b");
    expect((await repository.getState("state-a"))?.value).toEqual({ world: "A", marker: "candidate-a" });
  });

  it("selects one output inside a multi-candidate model run", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T09:15:00.000Z";
    await coordinator.createSession({ sessionId: "session-multi", branchId: "branch-main", scenarioKey: "character_onboarding", initialStateId: "state-0", initialState: { characterType: "fantastic" }, now });
    const recorded = await coordinator.recordRunCandidates({
      runId: "run-identity",
      sessionId: "session-multi",
      branchId: "branch-main",
      phaseId: "character_first_identity_suggestions",
      parentStateId: "state-0",
      candidates: [
        { candidateId: "candidate-a", candidateStateId: "state-a", payload: { key: "a", name: "A" }, candidateState: { characterType: "fantastic", characterIdentity: { key: "a", name: "A" } } },
        { candidateId: "candidate-b", candidateStateId: "state-b", payload: { key: "b", name: "B" }, candidateState: { characterType: "fantastic", characterIdentity: { key: "b", name: "B" } } },
        { candidateId: "candidate-c", candidateStateId: "state-c", payload: { key: "c", name: "C" }, candidateState: { characterType: "fantastic", characterIdentity: { key: "c", name: "C" } } },
      ],
      now,
    });
    expect(recorded.candidates).toHaveLength(3);
    expect((await repository.listCandidates("run-identity")).map((item) => item.id)).toEqual(["candidate-a", "candidate-b", "candidate-c"]);

    const selected = await coordinator.selectCandidate({ selectionId: "selection-b", sessionId: "session-multi", branchId: "branch-main", phaseId: "character_first_identity_suggestions", runId: "run-identity", candidateId: "candidate-b", actor: "human", now });
    expect(selected.selection.candidateId).toBe("candidate-b");
    expect(selected.selection.selectedStateId).toBe("state-b");

    await expect(coordinator.selectCandidate({ selectionId: "selection-ambiguous", sessionId: "session-multi", branchId: "branch-main", phaseId: "character_first_identity_suggestions", runId: "run-identity", actor: "human", now })).rejects.toThrow("TEST_LAB_CANDIDATE_ID_REQUIRED");

    await coordinator.recordCandidate({ runId: "run-world", candidateStateId: "state-world", sessionId: "session-multi", branchId: "branch-main", phaseId: "universe", parentStateId: "state-b", candidateState: { characterIdentity: { key: "b", name: "B" }, universe: { key: "u", name: "U" } }, now });
    expect((await repository.getRun("run-world"))?.parentStateId).toBe("state-b");
  });

  it("forks instead of overwriting history when an earlier selection changes", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T07:46:00.000Z";
    await coordinator.createSession({ sessionId: "session-2", branchId: "branch-main", scenarioKey: "character_onboarding", initialStateId: "state-0", initialState: { world: null }, now });
    for (const candidate of ["a", "b"] as const) await coordinator.recordCandidate({ runId: `run-${candidate}`, candidateStateId: `state-${candidate}`, sessionId: "session-2", branchId: "branch-main", phaseId: "world", parentStateId: "state-0", candidateState: { world: candidate.toUpperCase() }, now });
    await coordinator.selectCandidate({ selectionId: "selection-b", sessionId: "session-2", branchId: "branch-main", phaseId: "world", runId: "run-b", actor: "human", now });
    await coordinator.recordCandidate({ runId: "run-region-b", candidateStateId: "state-region-b", sessionId: "session-2", branchId: "branch-main", phaseId: "region", parentStateId: "state-b", candidateState: { world: "B", region: "B-region" }, now });
    const reselection = await coordinator.selectCandidate({ selectionId: "selection-a-fork", sessionId: "session-2", branchId: "branch-main", phaseId: "world", runId: "run-a", actor: "human", forkBranchId: "branch-a", now });
    expect(reselection.forked).toBe(true);
    expect((await repository.getSelection("branch-main", "world"))?.runId).toBe("run-b");
    expect((await repository.getSelection("branch-a", "world"))?.runId).toBe("run-a");
  });

  it("rejects usage snapshots without a traceable model and pricing snapshot", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    const now = "2026-08-18T08:45:00.000Z";
    await coordinator.createSession({ sessionId: "session-usage", branchId: "branch-main", scenarioKey: "character_onboarding", initialStateId: "state-0", initialState: { world: null }, now });
    const usageSnapshot = { promptTokens: 100, completionTokens: 50, totalTokens: 150, cachedInputTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, estimatedCostUsd: 0.0002, actualCostUsd: 0.00023, upstreamInferenceCostUsd: null, latencyMs: 500, retryCount: 0 };
    await expect(coordinator.recordCandidate({ runId: "run-untraceable", candidateStateId: "state-untraceable", sessionId: "session-usage", branchId: "branch-main", phaseId: "world", parentStateId: "state-0", candidateState: { world: "A" }, usageSnapshot, now })).rejects.toThrow("TEST_LAB_USAGE_REQUIRES_MODEL_PRICING_SNAPSHOT");
    const pricing = pricingSnapshot({ source: "openrouter_catalog", capturedAt: now, perTokenUsd: { prompt: 0.000001, completion: 0.000002, request: 0, image: 0, webSearch: 0, internalReasoning: 0.000002, inputCacheRead: 0.000001, inputCacheWrite: 0.000001 } });
    const { run } = await coordinator.recordCandidate({ runId: "run-traceable", candidateStateId: "state-traceable", sessionId: "session-usage", branchId: "branch-main", phaseId: "world", parentStateId: "state-0", candidateState: { world: "B" }, modelSlug: "vendor/model-b", pricingSnapshot: pricing, usageSnapshot, now });
    expect(run.modelSlug).toBe("vendor/model-b");
    expect(run.pricingSnapshot).toEqual(pricing);
    expect(run.usageSnapshot).toEqual(usageSnapshot);
  });
});
