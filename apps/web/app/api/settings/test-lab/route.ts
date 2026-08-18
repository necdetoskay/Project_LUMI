import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  OpenRouterModelCatalog,
  ProductionTestRunner,
  TestLabCoordinator,
  type JsonObject,
  type StateSnapshot,
} from "@lumi/ai/test-lab";
import { withParent } from "@/lib/auth/with-parent";
import { characterOnboardingProductionScenarioAdapter } from "@/lib/ai/character-onboarding-test-lab-adapter";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const OWNER_KEY = "__testLabOwner";

type SandboxOwner = {
  parentId: string;
  householdId: string;
  childProfileId: string;
};

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
        const owner = {
          parentId: parent.id,
          householdId,
          childProfileId,
        } satisfies SandboxOwner;
        const initialState: JsonObject = {
          ...suppliedState,
          [OWNER_KEY]: owner,
        };
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
        assertSandboxOwner(parentState, {
          parentId: parent.id,
          householdId: ownerString(parentState, "householdId"),
          childProfileId: ownerString(parentState, "childProfileId"),
        });

        const result = await coordinator.selectCandidate({
          selectionId: crypto.randomUUID(),
          sessionId: requiredString(body.sessionId, "sessionId"),
          branchId: requiredString(body.branchId, "branchId"),
          phaseId: requiredString(body.phaseId, "phaseId"),
          runId,
          candidateId: requiredString(body.candidateId, "candidateId"),
          actor: "human",
          forkBranchId:
            typeof body.forkBranchId === "string" && body.forkBranchId
              ? body.forkBranchId
              : undefined,
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

function asJsonObject(value: unknown, field: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`TEST_LAB_JSON_OBJECT_REQUIRED:${field}`);
  }
  return value as JsonObject;
}

function assertSandboxOwner(
  state: StateSnapshot | null,
  expected: SandboxOwner,
): void {
  if (!state) throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  const owner = state.value[OWNER_KEY];
  if (!owner || typeof owner !== "object" || Array.isArray(owner)) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  if (
    owner.parentId !== expected.parentId ||
    owner.householdId !== expected.householdId ||
    owner.childProfileId !== expected.childProfileId
  ) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
}

function ownerString(state: StateSnapshot | null, field: keyof SandboxOwner): string {
  if (!state) throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  const owner = state.value[OWNER_KEY];
  if (!owner || typeof owner !== "object" || Array.isArray(owner)) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  const value = owner[field];
  if (typeof value !== "string") throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  return value;
}
