import { beforeEach, describe, expect, it, vi } from "vitest";

import { pricingSnapshot } from "@lumi/ai/test-lab";

type ProfilesModule = typeof import("@lumi/profiles");

const mocks = vi.hoisted(() => ({
  executeCharacterOnboardingTestLabPhase: vi.fn(),
}));

vi.mock("@lumi/profiles", async (importOriginal) => {
  const actual = await importOriginal<ProfilesModule>();
  return {
    ...actual,
    executeCharacterOnboardingTestLabPhase:
      mocks.executeCharacterOnboardingTestLabPhase,
  };
});

import { characterOnboardingProductionScenarioAdapter } from "../lib/ai/character-onboarding-test-lab-adapter";

const pricing = pricingSnapshot({
  source: "openrouter_catalog",
  capturedAt: "2026-08-18T10:00:00.000Z",
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

const baseRequest = {
  scenarioKey: "character_onboarding",
  phaseId: "character_first_identity_suggestions",
  productionOperation: "generateCharacterFirstIdentitySuggestions",
  parentState: { characterType: { key: "fantastic" } },
  modelSlug: "vendor/model-a",
  pricingSnapshot: pricing,
  actor: {
    userId: "user-1",
    householdId: "household-1",
    childProfileId: "child-1",
  },
};

describe("characterOnboardingProductionScenarioAdapter", () => {
  beforeEach(() => {
    mocks.executeCharacterOnboardingTestLabPhase.mockReset();
  });

  it("maps production suggestions, usage and provenance to the generic Test Lab contract", async () => {
    mocks.executeCharacterOnboardingTestLabPhase.mockResolvedValue({
      output: { suggestions: [{ key: "a" }, { key: "b" }] },
      candidates: [
        {
          payload: { key: "a" },
          candidateState: {
            characterType: { key: "fantastic" },
            characterIdentity: { key: "a" },
          },
        },
        {
          payload: { key: "b" },
          candidateState: {
            characterType: { key: "fantastic" },
            characterIdentity: { key: "b" },
          },
        },
      ],
      provenance: {
        promptKey: "character_onboarding.character_first_identity_suggestions",
        promptVersion: 4,
        renderedPromptFingerprint: "prompt-sha",
        contextFingerprint: "context-sha",
        modelSlug: "vendor/model-a",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 700,
        estimatedCostUsd: 0.0002,
      },
    });

    const result =
      await characterOnboardingProductionScenarioAdapter.execute(baseRequest);

    expect(mocks.executeCharacterOnboardingTestLabPhase).toHaveBeenCalledWith({
      userId: "user-1",
      householdId: "household-1",
      childProfileId: "child-1",
      phaseId: "character_first_identity_suggestions",
      parentState: { characterType: { key: "fantastic" } },
      modelSlug: "vendor/model-a",
    });
    expect(result.candidates).toHaveLength(2);
    expect(result.provenance.promptVersion).toBe(4);
    expect(result.provenance.usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      latencyMs: 700,
      actualCostUsd: null,
    });
    expect(result.provenance.usage?.estimatedCostUsd).toBe(0.0002);
  });

  it("rejects onboarding phases that are not backed by the production character-first path", async () => {
    await expect(
      characterOnboardingProductionScenarioAdapter.execute({
        ...baseRequest,
        phaseId: "world_first_finalize",
      }),
    ).rejects.toThrow(
      "TEST_LAB_UNSUPPORTED_ONBOARDING_PHASE:world_first_finalize",
    );
    expect(mocks.executeCharacterOnboardingTestLabPhase).not.toHaveBeenCalled();
  });
});
