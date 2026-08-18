import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  OpenRouterModelCatalog,
  ProductionTestRunner,
  TestLabCoordinator,
  type JsonObject,
} from "@lumi/ai/test-lab";
import { withParent } from "@/lib/auth/with-parent";
import { characterOnboardingProductionScenarioAdapter } from "@/lib/ai/character-onboarding-test-lab-adapter";
import {
  assertSandboxOwner,
  bindSandboxOwner,
  readSandboxOwner,
} from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

function services() {
  const repository = new DrizzleTestLabRepository(getAiDb());
  const coordinator = new TestLabCoordinator(repository);
  const runner = new ProductionTestRunner(
    repository,
    coordinator,
    characterOnboardingProductionScenarioAdapter,
  );
  return { repository, coordinator, runner };
}

export const GET = observeHandler(() => {
  return withParent(async () =>
    NextResponse.json({
      data: {
        scenario: CHARACTER_ONBOARDING_SCENARIO,
        productionBackedPhaseIds: [
          "character_first_identity_suggestions",
          "world_suggestions",
          "compatibility",
          "region_suggestions",
          "origin_suggestions",
          "core_saga",
        ],
      },
    }),
  );
}, "/api/settings/test-lab");

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const now = new Date().toISOString();
    const { repository, coordinator, runner } = services();

    try {
      if (action === "create-session") {
        const suppliedState = asJsonObject(body.initialState, "initialState");
        const householdId = requiredString(body.householdId, "householdId");
        const childProfileId = requiredString(
          body.childProfileId,
          "childProfileId",
        );
        const initialState = bindSandboxOwner(suppliedState, {
          parentId: parent.id,
          householdId,
          childProfileId,
        });
        const sessionId = crypto.randomUUID();
        const branchId = crypto.randomUUID();
        const initialStateId = crypto.randomUUID();
        const created = await coordinator.createSession({
          sessionId,
          branchId,
          scenarioKey: CHARACTER_ONBOARDING_SCENARIO.key,
          initialStateId,
          initialState,
          now,
        });
        return NextResponse.json({ data: created });
      }

      if (action === "run-phase") {
        const sessionId = requiredString(body.sessionId, "sessionId");
        const branchId = requiredString(body.branchId, "branchId");
        const phaseId = requiredString(body.phaseId, "phaseId");
        const parentStateId = requiredString(
          body.parentStateId,
          "parentStateId",
        );
        const modelSlug = requiredString(body.modelSlug, "modelSlug");
        const householdId = requiredString(body.householdId, "householdId");
        const childProfileId = requiredString(
          body.childProfileId,
          "childProfileId",
        );
        const promptVersionOverride = optionalPositiveInteger(
          body.promptVersionOverride,
          "promptVersionOverride",
        );
        const parentState = await repository.getState(parentStateId);
        assertSandboxOwner(parentState, {
          parentId: parent.id,
          householdId,
          childProfileId,
        });

        const phase = CHARACTER_ONBOARDING_SCENARIO.phases.find(
          (candidate) => candidate.id === phaseId,
        );
        if (!phase?.testable || !phase.productionOperation) {
          throw new Error(`TEST_LAB_PHASE_NOT_RUNNABLE:${phaseId}`);
        }

        const modelProfile =
          await new OpenRouterModelCatalog().resolveModelProfile({
            modelSlug,
            capturedAt: now,
          });
        const result = await runner.execute({
          sessionId,
          branchId,
          phaseId,
          productionOperation: phase.productionOperation,
          parentStateId,
          modelSlug,
          ...(promptVersionOverride === undefined
            ? {}
            : { promptVersionOverride }),
          pricingSnapshot: modelProfile.pricing,
          actor: {
            userId: parent.id,
            householdId,
            childProfileId,
          },
          now,
        });
        return NextResponse.json({ data: { ...result, modelProfile } });
      }

      if (action === "select-candidate") {
        const runId = requiredString(body.runId, "runId");
        const run = await repository.getRun(runId);
        if (!run) throw new Error(`TEST_LAB_RUN_NOT_FOUND:${runId}`);
        const parentState = await repository.getState(run.parentStateId);
        const owner = readSandboxOwner(parentState);
        assertSandboxOwner(parentState, { ...owner, parentId: parent.id });
        const forkBranchId =
          typeof body.forkBranchId === "string" && body.forkBranchId
            ? body.forkBranchId
            : null;

        const result = await coordinator.selectCandidate({
          selectionId: crypto.randomUUID(),
          sessionId: requiredString(body.sessionId, "sessionId"),
          branchId: requiredString(body.branchId, "branchId"),
          phaseId: requiredString(body.phaseId, "phaseId"),
          runId,
          candidateId: requiredString(body.candidateId, "candidateId"),
          actor: "human",
          ...(forkBranchId ? { forkBranchId } : {}),
          now,
        });
        return NextResponse.json({ data: result });
      }

      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: `Unknown action: ${action}` },
        { status: 400 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab");

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function optionalPositiveInteger(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`TEST_LAB_POSITIVE_INTEGER_REQUIRED:${field}`);
  }
  return value;
}

function asJsonObject(value: unknown, field: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`TEST_LAB_JSON_OBJECT_REQUIRED:${field}`);
  }
  return value as JsonObject;
}
