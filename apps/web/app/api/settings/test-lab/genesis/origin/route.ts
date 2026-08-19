import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  createTestRunUsageSnapshot,
  DrizzleTestLabRepository,
  OpenRouterModelCatalog,
  TestLabCoordinator,
  type JsonObject,
} from "@lumi/ai/test-lab";
import {
  generateDeepCharacterOrigins,
  previewDeepCharacterOriginPrompt,
  type DeepCharacterOriginSuggestion,
  type GenerateDeepCharacterOriginsOptions,
} from "@lumi/profiles";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const CHARACTER_GENESIS_DEEP_ORIGIN_PHASE_ID =
  "character_genesis_deep_origin";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const now = new Date().toISOString();
    const repository = new DrizzleTestLabRepository(getAiDb());
    const coordinator = new TestLabCoordinator(repository);

    try {
      const action = optionalString(body.action) ?? "run";
      const sessionId = requiredString(body.sessionId, "sessionId");
      const branchId = requiredString(body.branchId, "branchId");
      const parentStateId = requiredString(body.parentStateId, "parentStateId");
      const householdId = requiredString(body.householdId, "householdId");
      const childProfileId = requiredString(
        body.childProfileId,
        "childProfileId",
      );
      const modelSlug = requiredString(body.modelSlug, "modelSlug");

      const session = await repository.getSession(sessionId);
      if (!session) {
        throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      }
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_DEEP_ORIGIN_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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

      const promptOverride = readPromptOverride(body.promptOverride);
      const localeOverride = optionalString(body.locale);
      const promptVersionOverride = optionalPositiveInteger(
        body.promptVersionOverride,
        "promptVersionOverride",
      );
      const options: GenerateDeepCharacterOriginsOptions = {
        modelOverride: modelSlug,
        creationOverride: {
          startDirection: "character_first",
          previousSelections: parentState.value,
        },
        recordTrace: false,
        ...(localeOverride ? { localeOverride } : {}),
        ...(promptOverride ? { promptOverride } : {}),
        ...(promptVersionOverride === undefined
          ? {}
          : { promptVersionOverride }),
      };

      if (action === "preview") {
        const preview = await previewDeepCharacterOriginPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_DEEP_ORIGIN_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateDeepCharacterOrigins(
        parent.id,
        { householdId, childProfileId },
        options,
      );
      const modelProfile =
        await new OpenRouterModelCatalog().resolveModelProfile({
          modelSlug,
          capturedAt: now,
        });
      const usageSnapshot = createUsageSnapshot(
        generated,
        modelProfile.pricing,
      );
      const runId = crypto.randomUUID();

      const recorded = await coordinator.recordRunCandidates({
        runId,
        sessionId,
        branchId,
        phaseId: CHARACTER_GENESIS_DEEP_ORIGIN_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.deep_origin",
          generationConfig: null,
          promptKey: generated.provenance.promptKey,
          promptVersion: generated.provenance.promptVersion,
          promptTemplateSnapshot: generated.provenance.promptTemplateSnapshot,
          renderedPrompt: generated.provenance.renderedPrompt,
          finalProviderRequest: generated.provenance.finalProviderRequest
            ? toJsonObject(generated.provenance.finalProviderRequest)
            : null,
          rawProviderOutput: generated.rawProviderOutput,
          renderedPromptFingerprint: fingerprint(
            generated.provenance.renderedPrompt,
          ),
          contextFingerprint: fingerprint(parentState.value),
        },
        candidates: generated.suggestions.map((origin, index) => ({
          candidateId: crypto.randomUUID(),
          candidateStateId: crypto.randomUUID(),
          payload: toJsonObject({
            origin,
            validation: generated.validation[index],
          }),
          candidateState: deepOriginCandidateState(parentState.value, origin),
        })),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: CHARACTER_GENESIS_DEEP_ORIGIN_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          validation: generated.validation,
          modelProfile,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_DEEP_ORIGIN_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/origin");

function deepOriginCandidateState(
  parentState: JsonObject,
  origin: DeepCharacterOriginSuggestion,
): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        origin: structuredClone(origin),
      },
    },
  });
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateDeepCharacterOrigins>>,
  pricing: Parameters<typeof createTestRunUsageSnapshot>[0]["pricing"],
) {
  const provenance = generated.provenance;
  if (
    provenance.promptTokens === null ||
    provenance.completionTokens === null ||
    provenance.totalTokens === null
  ) {
    return null;
  }
  return createTestRunUsageSnapshot({
    pricing,
    providerUsage: {
      promptTokens: provenance.promptTokens,
      completionTokens: provenance.completionTokens,
      totalTokens: provenance.totalTokens,
      latencyMs: provenance.latencyMs,
      costUsd: provenance.estimatedCostUsd ?? 0,
    },
  });
}

function readPromptOverride(
  value: unknown,
): GenerateDeepCharacterOriginsOptions["promptOverride"] | undefined {
  const record = asRecord(value);
  const system = optionalString(record.system);
  const user = optionalString(record.user);
  if (!system && !user) return undefined;
  return {
    ...(system ? { system } : {}),
    ...(user ? { user } : {}),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
