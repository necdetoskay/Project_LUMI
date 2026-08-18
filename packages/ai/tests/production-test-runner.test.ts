import { describe, expect, it } from "vitest";

import { ProductionTestRunner } from "../src/test-lab/application/production-test-runner";
import { TestLabCoordinator } from "../src/test-lab/application/test-lab-coordinator";
import { pricingSnapshot } from "../src/test-lab/domain/model-profile";
import { InMemoryTestLabRepository } from "../src/test-lab/infrastructure/in-memory-test-lab-repository";
import type { ProductionScenarioAdapter } from "../src/test-lab/ports/production-scenario-adapter";

const now = "2026-08-18T09:35:00.000Z";
const pricing = pricingSnapshot({
  source: "openrouter_catalog",
  capturedAt: now,
  perTokenUsd: {
    prompt: 0.000001,
    completion: 0.000002,
    request: 0,
    image: 0,
    webSearch: 0,
    internalReasoning: 0.000002,
    inputCacheRead: 0.000001,
    inputCacheWrite: 0.000001,
  },
});

function idFactory(ids: string[]) {
  let index = 0;
  return {
    create() {
      const id = ids[index];
      if (!id) throw new Error("TEST_ID_FACTORY_EXHAUSTED");
      index += 1;
      return id;
    },
  };
}

describe("ProductionTestRunner", () => {
  it("records one production call with many candidates and immutable provenance", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    await coordinator.createSession({
      sessionId: "session-1",
      branchId: "branch-1",
      scenarioKey: "character_onboarding",
      initialStateId: "state-0",
      initialState: { characterType: { key: "fantastic" } },
      now,
    });

    let receivedParentState: unknown;
    let receivedPromptVersionOverride: number | undefined;
    const adapter: ProductionScenarioAdapter = {
      async execute(request) {
        receivedParentState = request.parentState;
        receivedPromptVersionOverride = request.promptVersionOverride;
        return {
          output: { suggestions: [{ key: "a" }, { key: "b" }] },
          candidates: [
            {
              payload: { key: "a" },
              candidateState: {
                ...request.parentState,
                characterIdentity: { key: "a" },
              },
            },
            {
              payload: { key: "b" },
              candidateState: {
                ...request.parentState,
                characterIdentity: { key: "b" },
              },
            },
          ],
          provenance: {
            promptKey:
              "character_onboarding.character_first_identity_suggestions",
            promptVersion: 7,
            renderedPromptFingerprint: "prompt-sha",
            contextFingerprint: "context-sha",
            promptTemplateSnapshot: {
              systemTemplate: "System {{previousSelections}}",
              userTemplate: "User {{locale}}",
            },
            renderedPrompt: {
              system: "System rendered",
              user: "User rendered",
            },
            finalProviderRequest: {
              model: request.modelSlug,
              messages: [
                { role: "system", content: "System rendered" },
                { role: "user", content: "User rendered" },
              ],
            },
            modelSlug: request.modelSlug,
            usage: {
              promptTokens: 120,
              completionTokens: 80,
              totalTokens: 200,
              cachedInputTokens: 0,
              cacheWriteTokens: 0,
              reasoningTokens: 0,
              estimatedCostUsd: 0.00028,
              actualCostUsd: 0.00027,
              upstreamInferenceCostUsd: null,
              latencyMs: 900,
              retryCount: 0,
            },
          },
        };
      },
    };

    const runner = new ProductionTestRunner(
      repository,
      coordinator,
      adapter,
      idFactory(["run-1", "candidate-a", "state-a", "candidate-b", "state-b"]),
    );

    const result = await runner.execute({
      sessionId: "session-1",
      branchId: "branch-1",
      phaseId: "character_first_identity_suggestions",
      productionOperation: "generateCharacterFirstIdentitySuggestions",
      parentStateId: "state-0",
      modelSlug: "vendor/model-a",
      promptVersionOverride: 9,
      pricingSnapshot: pricing,
      actor: {
        userId: "user-1",
        householdId: "household-1",
        childProfileId: "child-1",
      },
      now,
    });

    expect(receivedParentState).toEqual({
      characterType: { key: "fantastic" },
    });
    expect(receivedPromptVersionOverride).toBe(9);
    expect(result.run.id).toBe("run-1");
    expect(result.run.executionSnapshot).toEqual({
      productionOperation: "generateCharacterFirstIdentitySuggestions",
      promptKey: "character_onboarding.character_first_identity_suggestions",
      promptVersion: 7,
      renderedPromptFingerprint: "prompt-sha",
      contextFingerprint: "context-sha",
      promptTemplateSnapshot: {
        systemTemplate: "System {{previousSelections}}",
        userTemplate: "User {{locale}}",
      },
      renderedPrompt: {
        system: "System rendered",
        user: "User rendered",
      },
      finalProviderRequest: {
        model: "vendor/model-a",
        messages: [
          { role: "system", content: "System rendered" },
          { role: "user", content: "User rendered" },
        ],
      },
    });
    expect(result.run.usageSnapshot?.actualCostUsd).toBe(0.00027);
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate-a",
      "candidate-b",
    ]);
    expect((await repository.getState("state-a"))?.value).toEqual({
      characterType: { key: "fantastic" },
      characterIdentity: { key: "a" },
    });
    expect((await repository.getState("state-b"))?.value).toEqual({
      characterType: { key: "fantastic" },
      characterIdentity: { key: "b" },
    });
  });

  it("rejects an adapter model mismatch before persisting a priced run", async () => {
    const repository = new InMemoryTestLabRepository();
    const coordinator = new TestLabCoordinator(repository);
    await coordinator.createSession({
      sessionId: "session-2",
      branchId: "branch-2",
      scenarioKey: "character_onboarding",
      initialStateId: "state-0",
      initialState: { characterType: { key: "fantastic" } },
      now,
    });

    const adapter: ProductionScenarioAdapter = {
      async execute() {
        return {
          output: { suggestions: [{ key: "a" }] },
          candidates: [
            {
              payload: { key: "a" },
              candidateState: { characterIdentity: { key: "a" } },
            },
          ],
          provenance: {
            promptKey:
              "character_onboarding.character_first_identity_suggestions",
            promptVersion: 1,
            renderedPromptFingerprint: "prompt-sha",
            contextFingerprint: "context-sha",
            promptTemplateSnapshot: {
              systemTemplate: "system",
              userTemplate: "user",
            },
            renderedPrompt: { system: "system", user: "user" },
            finalProviderRequest: null,
            modelSlug: "vendor/unexpected-model",
            usage: null,
          },
        };
      },
    };

    const runner = new ProductionTestRunner(repository, coordinator, adapter);
    await expect(
      runner.execute({
        sessionId: "session-2",
        branchId: "branch-2",
        phaseId: "character_first_identity_suggestions",
        productionOperation: "generateCharacterFirstIdentitySuggestions",
        parentStateId: "state-0",
        modelSlug: "vendor/model-a",
        pricingSnapshot: pricing,
        actor: {
          userId: "user-1",
          householdId: "household-1",
          childProfileId: "child-1",
        },
        now,
      }),
    ).rejects.toThrow("TEST_LAB_ADAPTER_MODEL_MISMATCH");
    expect(await repository.listRuns("branch-2")).toEqual([]);
  });
});
