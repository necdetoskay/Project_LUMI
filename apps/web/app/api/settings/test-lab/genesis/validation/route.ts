import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  TestLabCoordinator,
  type JsonObject,
} from "@lumi/ai/test-lab";
import {
  createCharacterGenesisPackage,
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisSections,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const PHASE_ID = "character_genesis_validation";

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
          `TEST_LAB_GENESIS_VALIDATION_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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
      const sections = asRecord(genesis.sections) as CharacterGenesisSections;
      const candidateSeed =
        optionalString(genesis.candidateSeed) ?? `${sessionId}:${branchId}`;
      const characterId =
        optionalString(genesis.characterId) ??
        `testlab-character-${childProfileId}`;
      const candidate = createCharacterGenesisPackage({
        id: optionalString(genesis.id) ?? `testlab-genesis-${sessionId}`,
        householdId,
        childProfileId,
        characterId,
        universeSeed:
          optionalString(genesis.universeSeed) ?? `${sessionId}:universe`,
        candidateSeed,
        provenance: {
          schemaRevision: "character-genesis.v1",
          validationRevision: "cross-domain.v1",
          seed: candidateSeed,
          generatedAt: now,
        },
        sections,
        now,
      });

      const environment = asRecord(sections.environment);
      const binding = asRecord(environment.binding);
      const validation = validateCharacterGenesisCrossDomain(candidate, {
        requireCompletePackage: true,
        ...(optionalString(binding.worldId)
          ? { expectedWorldId: optionalString(binding.worldId) }
          : {}),
        ...(optionalString(binding.regionId)
          ? { expectedRegionId: optionalString(binding.regionId) }
          : {}),
        ...(optionalString(binding.homeId)
          ? { expectedHomeId: optionalString(binding.homeId) }
          : {}),
      });
      const futureStoryYieldSignals =
        calculateFutureStoryYieldSignals(sections);
      const evidence = toJsonObject({
        candidate,
        validation,
        futureStoryYieldSignals,
        summary: {
          valid: validation.valid,
          errorCount: validation.issues.filter(
            (issue) => issue.severity === "error",
          ).length,
          warningCount: validation.issues.filter(
            (issue) => issue.severity === "warning",
          ).length,
          sectionCount: Object.keys(sections).length,
          futureStoryYieldScore: futureStoryYieldSignals.score,
        },
      });
      const candidateState = toJsonObject({
        ...structuredClone(parentState.value),
        characterGenesisQualification: {
          ...asRecord(parentState.value.characterGenesisQualification),
          validation: evidence,
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
          productionOperation: "character_genesis.cross_domain_validation",
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
            payload: evidence,
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
          candidate,
          validation,
          futureStoryYieldSignals,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "TEST_LAB_GENESIS_VALIDATION_ERROR", message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}, "/api/settings/test-lab/genesis/validation");

function calculateFutureStoryYieldSignals(sections: CharacterGenesisSections) {
  const hooks = sections.origin?.storyHooks ?? [];
  const questions = sections.origin?.unresolvedQuestions ?? [];
  const npcs = sections.social?.npcs ?? [];
  const relationships = sections.social?.relationships ?? [];
  const items = sections.inventory?.items ?? [];
  const memories = sections.memoryAndThreads?.memories ?? [];
  const threads =
    sections.memoryAndThreads?.threads.filter(
      (thread) => thread.status !== "resolved" && thread.status !== "abandoned",
    ) ?? [];
  const environmentFeatures =
    sections.environment?.regionProfile.environmentalFeatures ?? [];

  const weightedSignals = [
    Math.min(1, hooks.length / 3),
    Math.min(1, questions.length / 3),
    Math.min(1, npcs.length / 4),
    Math.min(1, relationships.length / 6),
    Math.min(
      1,
      items.filter((item) => (item.storyPotential ?? 0) >= 0.45).length / 3,
    ),
    Math.min(1, memories.length / 4),
    Math.min(1, threads.length / 4),
    Math.min(1, environmentFeatures.length / 4),
  ];
  const score =
    weightedSignals.reduce((sum, value) => sum + value, 0) /
    weightedSignals.length;

  return {
    score,
    hookCount: hooks.length,
    unresolvedQuestionCount: questions.length,
    npcCount: npcs.length,
    relationshipCount: relationships.length,
    storyRelevantItemCount: items.filter(
      (item) => (item.storyPotential ?? 0) >= 0.45,
    ).length,
    memoryCount: memories.length,
    openThreadCount: threads.length,
    environmentFeatureCount: environmentFeatures.length,
    diversityAxes: weightedSignals.filter((value) => value > 0).length,
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
