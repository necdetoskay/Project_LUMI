import {
  createTestRunUsageSnapshot,
  type JsonObject,
  type ProductionScenarioAdapter,
} from "@lumi/ai/test-lab";
import {
  executeCharacterOnboardingTestLabPhase,
  type CharacterOnboardingTestLabPhase,
} from "@lumi/profiles";

const CHARACTER_ONBOARDING_PHASES = new Set<CharacterOnboardingTestLabPhase>([
  "character_first_identity_suggestions",
  "world_suggestions",
  "compatibility",
  "region_suggestions",
  "origin_suggestions",
  "core_saga",
]);

export const characterOnboardingProductionScenarioAdapter: ProductionScenarioAdapter = {
  async execute(request) {
    if (request.scenarioKey !== "character_onboarding") {
      throw new Error(`TEST_LAB_UNSUPPORTED_SCENARIO:${request.scenarioKey}`);
    }
    if (!isCharacterOnboardingPhase(request.phaseId)) {
      throw new Error(`TEST_LAB_UNSUPPORTED_ONBOARDING_PHASE:${request.phaseId}`);
    }

    const result = await executeCharacterOnboardingTestLabPhase({
      userId: request.actor.userId,
      householdId: request.actor.householdId,
      childProfileId: request.actor.childProfileId,
      phaseId: request.phaseId,
      parentState: request.parentState,
      modelSlug: request.modelSlug,
    });

    const usage =
      result.provenance.promptTokens !== null &&
      result.provenance.completionTokens !== null &&
      result.provenance.totalTokens !== null
        ? createTestRunUsageSnapshot({
            pricing: request.pricingSnapshot,
            providerUsage: {
              promptTokens: result.provenance.promptTokens,
              completionTokens: result.provenance.completionTokens,
              totalTokens: result.provenance.totalTokens,
              latencyMs: result.provenance.latencyMs,
              costUsd: result.provenance.estimatedCostUsd ?? 0,
            },
          })
        : null;

    return {
      output: toJsonObject(result.output),
      candidates: result.candidates.map((candidate) => ({
        payload: toJsonObject(candidate.payload),
        candidateState: toJsonObject(candidate.candidateState),
      })),
      provenance: {
        promptKey: result.provenance.promptKey,
        promptVersion: result.provenance.promptVersion,
        renderedPromptFingerprint: result.provenance.renderedPromptFingerprint,
        contextFingerprint: result.provenance.contextFingerprint,
        modelSlug: result.provenance.modelSlug,
        usage,
      },
    };
  },
};

function isCharacterOnboardingPhase(
  phaseId: string,
): phaseId is CharacterOnboardingTestLabPhase {
  return CHARACTER_ONBOARDING_PHASES.has(
    phaseId as CharacterOnboardingTestLabPhase,
  );
}

function toJsonObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("TEST_LAB_JSON_OBJECT_REQUIRED");
  }
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
