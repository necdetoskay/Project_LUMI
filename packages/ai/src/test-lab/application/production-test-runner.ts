import { TestLabInvariantError } from "../domain/test-lab-errors";
import type { ModelPricingSnapshot } from "../domain/model-profile";
import type {
  JsonObject,
  TestRun,
  TestRunCandidate,
} from "../domain/test-lab-types";
import type { ProductionScenarioAdapter } from "../ports/production-scenario-adapter";
import type { TestLabRepository } from "../ports/test-lab-repository";
import type { TestLabCoordinator } from "./test-lab-coordinator";

export interface TestLabIdFactory {
  create(): string;
}

const DEFAULT_ID_FACTORY: TestLabIdFactory = {
  create: () => crypto.randomUUID(),
};

export class ProductionTestRunner {
  constructor(
    private readonly repository: TestLabRepository,
    private readonly coordinator: TestLabCoordinator,
    private readonly adapter: ProductionScenarioAdapter,
    private readonly idFactory: TestLabIdFactory = DEFAULT_ID_FACTORY,
  ) {}

  async execute(input: {
    sessionId: string;
    branchId: string;
    phaseId: string;
    productionOperation: string;
    parentStateId: string;
    modelSlug: string;
    promptVersionOverride?: number;
    generationConfig?: JsonObject;
    pricingSnapshot: ModelPricingSnapshot;
    actor: {
      userId: string;
      householdId: string;
      childProfileId: string;
    };
    now: string;
  }): Promise<{ run: TestRun; candidates: TestRunCandidate[] }> {
    const session = await this.repository.getSession(input.sessionId);
    if (!session) {
      throw new TestLabInvariantError(
        `TEST_LAB_SESSION_NOT_FOUND:${input.sessionId}`,
      );
    }
    const parentState = await this.repository.getState(input.parentStateId);
    if (!parentState) {
      throw new TestLabInvariantError(
        `TEST_LAB_STATE_NOT_FOUND:${input.parentStateId}`,
      );
    }

    const result = await this.adapter.execute({
      scenarioKey: session.scenarioKey,
      phaseId: input.phaseId,
      productionOperation: input.productionOperation,
      parentState: parentState.value,
      modelSlug: input.modelSlug,
      ...(input.promptVersionOverride === undefined
        ? {}
        : { promptVersionOverride: input.promptVersionOverride }),
      ...(input.generationConfig === undefined
        ? {}
        : { generationConfig: input.generationConfig }),
      pricingSnapshot: input.pricingSnapshot,
      actor: input.actor,
    });

    if (result.provenance.modelSlug !== input.modelSlug) {
      throw new TestLabInvariantError(
        `TEST_LAB_ADAPTER_MODEL_MISMATCH:${input.modelSlug}:${result.provenance.modelSlug}`,
      );
    }
    if (result.candidates.length === 0) {
      throw new TestLabInvariantError(
        "TEST_LAB_ADAPTER_RETURNED_NO_CANDIDATES",
      );
    }

    const recorded = await this.coordinator.recordRunCandidates({
      runId: this.idFactory.create(),
      sessionId: input.sessionId,
      branchId: input.branchId,
      phaseId: input.phaseId,
      parentStateId: input.parentStateId,
      candidates: result.candidates.map((candidate) => ({
        candidateId: this.idFactory.create(),
        candidateStateId: this.idFactory.create(),
        payload: candidate.payload,
        candidateState: candidate.candidateState,
      })),
      modelSlug: result.provenance.modelSlug,
      pricingSnapshot: input.pricingSnapshot,
      usageSnapshot: result.provenance.usage,
      executionSnapshot: {
        productionOperation: input.productionOperation,
        generationConfig: input.generationConfig ?? null,
        promptKey: result.provenance.promptKey,
        promptVersion: result.provenance.promptVersion,
        renderedPromptFingerprint: result.provenance.renderedPromptFingerprint,
        contextFingerprint: result.provenance.contextFingerprint,
        promptTemplateSnapshot: result.provenance.promptTemplateSnapshot,
        renderedPrompt: result.provenance.renderedPrompt,
        finalProviderRequest: result.provenance.finalProviderRequest,
      },
      now: input.now,
    });

    return {
      run: recorded.run,
      candidates: recorded.candidates.map((value) => value.candidate),
    };
  }
}
