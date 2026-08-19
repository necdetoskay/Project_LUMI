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
  createInventoryGenesisManifest,
  generateInventoryGenesis,
  previewInventoryGenesisPrompt,
  validateInventoryGenesisManifest,
  type GenerateInventoryGenesisOptions,
  type InventoryGenesisManifest,
} from "@lumi/profiles";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const INVENTORY_GENESIS_PHASE_ID = "character_genesis_inventory";

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
      const childProfileId = requiredString(body.childProfileId, "childProfileId");
      const modelSlug = requiredString(body.modelSlug, "modelSlug");

      const session = await repository.getSession(sessionId);
      if (!session) throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_INVENTORY_GENESIS_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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

      const localeOverride = optionalString(body.locale);
      const promptOverride = readPromptOverride(body.promptOverride);
      const options: GenerateInventoryGenesisOptions = {
        modelOverride: modelSlug,
        creationOverride: {
          startDirection: "character_first",
          previousSelections: parentState.value,
        },
        recordTrace: false,
        ...(localeOverride ? { localeOverride } : {}),
        ...(promptOverride ? { promptOverride } : {}),
      };

      if (action === "preview") {
        const preview = await previewInventoryGenesisPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_INVENTORY_GENESIS_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateInventoryGenesis(
        parent.id,
        { householdId, childProfileId },
        options,
      );
      const modelProfile =
        await new OpenRouterModelCatalog().resolveModelProfile({
          modelSlug,
          capturedAt: now,
        });
      const usageSnapshot = createUsageSnapshot(generated, modelProfile.pricing);
      const characterId =
        readCharacterId(parentState.value) ?? `testlab-character-${childProfileId}`;
      const baseSeed =
        readGenesisSeed(parentState.value) ?? `${sessionId}:${branchId}`;
      const originFactIds = readOriginFactIds(parentState.value);
      const socialNpcIds = readSocialNpcIds(parentState.value);

      const preparedCandidates = generated.suggestions.map((suggestion, index) => {
        const manifest = createInventoryGenesisManifest({
          characterId,
          seed: `${baseSeed}:inventory:${suggestion.key}`,
          suggestions: suggestion.items,
        });
        const domainIssues = validateInventoryGenesisManifest({
          manifest,
          originFactIds,
          socialNpcIds,
        });
        const validation = {
          production: generated.validation[index],
          domain: {
            valid: domainIssues.every((issue) => issue.severity !== "error"),
            issues: domainIssues,
          },
          quality: evaluateInventoryQuality(manifest),
        };
        const stateDiff = buildInventoryStateDiff(parentState.value, manifest);
        return { suggestion, manifest, validation, stateDiff };
      });

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: INVENTORY_GENESIS_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.inventory",
          generationConfig: null,
          promptKey: generated.provenance.promptKey,
          promptVersion: generated.provenance.promptVersion,
          promptTemplateSnapshot: generated.provenance.promptTemplateSnapshot,
          renderedPrompt: generated.provenance.renderedPrompt,
          finalProviderRequest: generated.provenance.finalProviderRequest
            ? toJsonObject(generated.provenance.finalProviderRequest)
            : null,
          rawProviderOutput: generated.rawProviderOutput,
          renderedPromptFingerprint: fingerprint(generated.provenance.renderedPrompt),
          contextFingerprint: fingerprint(parentState.value),
        },
        candidates: preparedCandidates.map((item) => ({
          candidateId: crypto.randomUUID(),
          candidateStateId: crypto.randomUUID(),
          payload: toJsonObject(item),
          candidateState: inventoryCandidateState(parentState.value, item.manifest),
        })),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: INVENTORY_GENESIS_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          canonicalManifest: preparedCandidates.map((item) => item.manifest),
          validation: preparedCandidates.map((item) => item.validation),
          stateDiff: preparedCandidates.map((item) => item.stateDiff),
          modelProfile,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_INVENTORY_GENESIS_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/inventory");

function evaluateInventoryQuality(manifest: InventoryGenesisManifest) {
  const total = manifest.items.length;
  if (total === 0) {
    return {
      mundaneGrounding: 1,
      personalRelevance: 1,
      futureUsability: 1,
      warnings: [],
    };
  }
  const mundane = manifest.items.filter(
    (item) =>
      item.definition.rarity === "common" && item.provenance.storyPotential !== "high",
  ).length;
  const personal = manifest.items.filter((item) =>
    ["personality", "relationship", "legacy"].includes(item.provenance.role),
  ).length;
  const usable = manifest.items.filter(
    (item) =>
      item.definition.isStorySelectable && item.provenance.storyPotential !== "low",
  ).length;
  const mundaneGrounding = mundane / total;
  const personalRelevance = personal / total;
  const futureUsability = usable / total;
  return {
    mundaneGrounding,
    personalRelevance,
    futureUsability,
    warnings: [
      ...(mundaneGrounding < 0.4 ? ["INVENTORY_QUALITY_LOW_MUNDANE_GROUNDING"] : []),
      ...(personalRelevance < 0.2 ? ["INVENTORY_QUALITY_LOW_PERSONAL_RELEVANCE"] : []),
      ...(futureUsability < 0.2 ? ["INVENTORY_QUALITY_LOW_FUTURE_USABILITY"] : []),
    ],
  };
}

function buildInventoryStateDiff(
  parentState: JsonObject,
  manifest: InventoryGenesisManifest,
) {
  const previous = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).inventory,
  );
  const previousItems = Array.isArray(previous.items) ? previous.items : [];
  return {
    itemCountBefore: previousItems.length,
    itemCountAfter: manifest.items.length,
    definitionKeys: manifest.items.map((item) => item.definition.definitionKey),
    ownerType: manifest.ownerType,
    ownerId: manifest.ownerId,
  };
}

function inventoryCandidateState(
  parentState: JsonObject,
  manifest: InventoryGenesisManifest,
): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        inventory: structuredClone(manifest),
      },
    },
  });
}

function readOriginFactIds(parentState: JsonObject): string[] {
  const sections = asRecord(asRecord(parentState.characterGenesis).sections);
  const origin = asRecord(sections.origin);
  const facts = Array.isArray(origin.facts) ? origin.facts : [];
  return facts
    .map((fact) => optionalString(asRecord(fact).id))
    .filter((id): id is string => Boolean(id));
}

function readSocialNpcIds(parentState: JsonObject): string[] {
  const sections = asRecord(asRecord(parentState.characterGenesis).sections);
  const social = asRecord(sections.social);
  const npcs = Array.isArray(social.npcs) ? social.npcs : [];
  return npcs
    .map((npc) => optionalString(asRecord(npc).candidateId))
    .filter((id): id is string => Boolean(id));
}

function readCharacterId(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).characterId);
}

function readGenesisSeed(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).candidateSeed);
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateInventoryGenesis>>,
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
): GenerateInventoryGenesisOptions["promptOverride"] | undefined {
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
