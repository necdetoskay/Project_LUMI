import type {
  ModelPricingSnapshot,
  TestRunUsageSnapshot,
} from "../domain/model-profile";
import type { JsonObject } from "../domain/test-lab-types";

export interface ProductionScenarioExecutionRequest {
  scenarioKey: string;
  phaseId: string;
  productionOperation: string;
  parentState: JsonObject;
  modelSlug: string;
  promptVersionOverride?: number;
  generationConfig?: JsonObject;
  pricingSnapshot: ModelPricingSnapshot;
  actor: {
    userId: string;
    householdId: string;
    childProfileId: string;
  };
}

export interface ProductionScenarioExecutionProvenance {
  promptKey: string;
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
  modelSlug: string;
  usage: TestRunUsageSnapshot | null;
}

export interface ProductionScenarioExecutionCandidate {
  payload: JsonObject;
  candidateState: JsonObject;
}

export interface ProductionScenarioExecutionResult {
  output: JsonObject;
  candidates: ProductionScenarioExecutionCandidate[];
  provenance: ProductionScenarioExecutionProvenance;
}

/**
 * Executes a Test Lab phase through production-owned generation services.
 *
 * Implementations must not mutate canonical/production domain state. They may
 * reuse production prompt/context/gateway/validation code, but selected Test
 * Lab state is committed only through Test Lab persistence.
 */
export interface ProductionScenarioAdapter {
  execute(
    request: ProductionScenarioExecutionRequest,
  ): Promise<ProductionScenarioExecutionResult>;
}
