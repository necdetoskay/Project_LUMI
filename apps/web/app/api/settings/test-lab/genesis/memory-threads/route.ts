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
  createMemoryThreadGenesisManifest,
  generateMemoryThreadGenesis,
  inspectMemoryThreadQuality,
  previewMemoryThreadGenesisPrompt,
  projectMemoryThreadGenesisContext,
  validateMemoryThreadGenesisManifest,
  type GenerateMemoryThreadGenesisOptions,
  type MemoryThreadGenesisManifest,
} from "@lumi/profiles";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const MEMORY_THREAD_GENESIS_PHASE_ID = "character_genesis_memory_threads";

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
      if (!session) throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_MEMORY_THREAD_GENESIS_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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
      const options: GenerateMemoryThreadGenesisOptions = {
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
        const preview = await previewMemoryThreadGenesisPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(
          `TEST_LAB_MEMORY_THREAD_GENESIS_UNKNOWN_ACTION:${action}`,
        );
      }

      const generated = await generateMemoryThreadGenesis(
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
      const characterId =
        readCharacterId(parentState.value) ??
        `testlab-character-${childProfileId}`;
      const baseSeed =
        readGenesisSeed(parentState.value) ?? `${sessionId}:${branchId}`;
      const references = readReferenceSet(parentState.value);

      const preparedCandidates = generated.suggestions.map(
        (suggestion, index) => {
          const manifest = createMemoryThreadGenesisManifest({
            characterId,
            seed: `${baseSeed}:memory-threads:${suggestion.key}`,
            suggestion,
          });
          const domainIssues = validateMemoryThreadGenesisManifest({
            manifest,
            references,
          });
          const quality = inspectMemoryThreadQuality(manifest);
          const projection = projectMemoryThreadGenesisContext(manifest);
          const validation = {
            production: generated.validation[index],
            domain: {
              valid: domainIssues.every((issue) => issue.severity !== "error"),
              issues: domainIssues,
            },
            quality,
            visibilityInspection: {
              characterVisibleThreadIds:
                projection.characterVisible.threads.map(
                  (thread) => thread.candidateId,
                ),
              hiddenPlannerThreadIds: projection.planner.threads
                .map((entry) => entry.thread)
                .filter(
                  (thread) =>
                    !projection.characterVisible.threads.some(
                      (visible) => visible.candidateId === thread.candidateId,
                    ),
                )
                .map((thread) => thread.candidateId),
            },
          };
          const stateDiff = buildMemoryThreadStateDiff(
            parentState.value,
            manifest,
          );
          return { suggestion, manifest, validation, stateDiff };
        },
      );

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: MEMORY_THREAD_GENESIS_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.memory_threads",
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
        candidates: preparedCandidates.map((item) => ({
          candidateId: crypto.randomUUID(),
          candidateStateId: crypto.randomUUID(),
          payload: toJsonObject(item),
          candidateState: memoryThreadCandidateState(
            parentState.value,
            item.manifest,
          ),
        })),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: MEMORY_THREAD_GENESIS_PHASE_ID,
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
        { error: "TEST_LAB_MEMORY_THREAD_GENESIS_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/memory-threads");

function buildMemoryThreadStateDiff(
  parentState: JsonObject,
  manifest: MemoryThreadGenesisManifest,
) {
  const previous = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).memoryAndThreads,
  );
  const previousMemories = Array.isArray(previous.memories)
    ? previous.memories
    : [];
  const previousThreads = Array.isArray(previous.threads)
    ? previous.threads
    : [];
  return {
    memoryCountBefore: previousMemories.length,
    memoryCountAfter: manifest.memories.length,
    threadCountBefore: previousThreads.length,
    threadCountAfter: manifest.threads.length,
    memoryIds: manifest.memories.map((memory) => memory.candidateId),
    threadIds: manifest.threads.map((thread) => thread.candidateId),
  };
}

function memoryThreadCandidateState(
  parentState: JsonObject,
  manifest: MemoryThreadGenesisManifest,
): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        memoryAndThreads: structuredClone(manifest),
      },
    },
  });
}

function readReferenceSet(parentState: JsonObject) {
  const genesis = asRecord(parentState.characterGenesis);
  const sections = asRecord(genesis.sections);
  const origin = asRecord(sections.origin);
  const traits = asRecord(sections.traits);
  const social = asRecord(sections.social);
  const inventory = asRecord(sections.inventory);
  const facts = asArray(origin.facts);
  const questions = asArray(origin.unresolvedQuestions);
  const hooks = asArray(origin.storyHooks);
  const npcs = asArray(social.npcs);
  const items = asArray(inventory.items);
  const contextual = asArray(traits.contextual);
  const identity = asRecord(parentState.characterIdentity);
  const identityGoals = asArray(identity.goals);

  return {
    originFactIds: collectStringField(facts, "id"),
    originQuestionIds: collectStringField(questions, "id"),
    originHookIds: collectStringField(hooks, "id"),
    socialNpcIds: collectStringField(npcs, "candidateId"),
    placeRefs: facts
      .map((fact) => optionalString(asRecord(fact).sourceRef))
      .filter((value): value is string => Boolean(value)),
    inventoryItemKeys: items
      .map((item) =>
        optionalString(asRecord(asRecord(item).definition).definitionKey),
      )
      .filter((value): value is string => Boolean(value)),
    fearIds: contextual
      .filter((entry) => asRecord(entry).kind === "fear")
      .map((entry) => optionalString(asRecord(entry).id))
      .filter((value): value is string => Boolean(value)),
    goalKeys: identityGoals
      .map((goal) => {
        const record = asRecord(goal);
        return optionalString(record.key) ?? optionalString(record.id);
      })
      .filter((value): value is string => Boolean(value)),
  };
}

function collectStringField(values: unknown[], field: string): string[] {
  return values
    .map((value) => optionalString(asRecord(value)[field]))
    .filter((value): value is string => Boolean(value));
}

function readCharacterId(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).characterId);
}

function readGenesisSeed(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).candidateSeed);
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateMemoryThreadGenesis>>,
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
): GenerateMemoryThreadGenesisOptions["promptOverride"] | undefined {
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
