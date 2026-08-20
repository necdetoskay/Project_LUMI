import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  TestLabCoordinator,
  type JsonObject,
} from "@lumi/ai/test-lab";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const PHASE_ID = "character_genesis_origin_structure";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const repository = new DrizzleTestLabRepository(getAiDb());
    const coordinator = new TestLabCoordinator(repository);
    const now = new Date().toISOString();

    try {
      const sessionId = requiredString(body.sessionId, "sessionId");
      const branchId = requiredString(body.branchId, "branchId");
      const parentStateId = requiredString(body.parentStateId, "parentStateId");
      const householdId = requiredString(body.householdId, "householdId");
      const childProfileId = requiredString(
        body.childProfileId,
        "childProfileId",
      );

      const session = await repository.getSession(sessionId);
      if (!session) throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_ORIGIN_STRUCTURE_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
        );
      }

      const parentState = await repository.getState(parentStateId);
      assertSandboxOwner(parentState, {
        parentId: parent.id,
        householdId,
        childProfileId,
      });
      if (!parentState) {
        throw new Error(`TEST_LAB_STATE_NOT_FOUND:${parentStateId}`);
      }

      const genesis = asRecord(parentState.value.characterGenesis);
      const sections = asRecord(genesis.sections);
      const origin = asRecord(sections.origin);
      if (!optionalString(origin.summary) || !Array.isArray(origin.facts)) {
        throw new Error(
          "TEST_LAB_ORIGIN_STRUCTURE_REQUIRES_SELECTED_DEEP_ORIGIN",
        );
      }

      const unresolvedQuestions = Array.isArray(origin.unresolvedQuestions)
        ? origin.unresolvedQuestions
        : [];
      const storyHooks = Array.isArray(origin.storyHooks)
        ? origin.storyHooks
        : [];
      const extraction = toJsonObject({
        summary: origin.summary,
        facts: origin.facts,
        summaryFactIds: Array.isArray(origin.summaryFactIds)
          ? origin.summaryFactIds
          : [],
        unresolvedQuestions,
        storyHooks,
        evidence: {
          factCount: origin.facts.length,
          unresolvedQuestionCount: unresolvedQuestions.length,
          storyHookCount: storyHooks.length,
          derivedFrom: "character_genesis_deep_origin",
        },
      });

      const candidateState = toJsonObject({
        ...structuredClone(parentState.value),
        characterGenesisQualification: {
          ...asRecord(parentState.value.characterGenesisQualification),
          originStructure: extraction,
        },
      });

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: PHASE_ID,
        parentStateId,
        modelSlug: null,
        pricingSnapshot: null,
        usageSnapshot: null,
        executionSnapshot: {
          productionOperation: "character_genesis.origin_structure",
          generationConfig: null,
          promptKey: null,
          promptVersion: null,
          promptTemplateSnapshot: null,
          renderedPrompt: null,
          finalProviderRequest: null,
          rawProviderOutput: null,
          renderedPromptFingerprint: null,
          contextFingerprint: null,
        },
        candidates: [
          {
            candidateId: crypto.randomUUID(),
            candidateStateId: crypto.randomUUID(),
            payload: extraction,
            candidateState,
          },
        ],
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          extraction,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "TEST_LAB_ORIGIN_STRUCTURE_ERROR", message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}, "/api/settings/test-lab/genesis/origin-structure");

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TEST_LAB_JSON_OBJECT_REQUIRED");
  }
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
