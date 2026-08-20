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
  markCharacterGenesisCommitted,
  selectCharacterGenesisPackage,
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisSections,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { buildProductionFirstStoryContext } from "@/lib/story/genesis-first-story-context.service";

const PHASE_ID = "character_genesis_first_story_context";

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
          `TEST_LAB_FIRST_STORY_CONTEXT_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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

      const qualification = asRecord(
        parentState.value.characterGenesisQualification,
      );
      const validationEvidence = asRecord(qualification.validation);
      const validationSummary = asRecord(validationEvidence.summary);
      if (validationSummary.valid !== true) {
        throw new Error("TEST_LAB_FIRST_STORY_CONTEXT_REQUIRES_VALID_GENESIS");
      }

      const genesis = asRecord(parentState.value.characterGenesis);
      const sections = asRecord(genesis.sections) as CharacterGenesisSections;
      const candidateSeed =
        optionalString(genesis.candidateSeed) ?? `${sessionId}:${branchId}`;
      const characterId =
        optionalString(genesis.characterId) ??
        `testlab-character-${childProfileId}`;
      const staged = createCharacterGenesisPackage({
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
      const validation = validateCharacterGenesisCrossDomain(staged, {
        requireCompletePackage: true,
      });
      if (!validation.valid) {
        const errorCodes = validation.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.code)
          .join(",");
        throw new Error(
          `TEST_LAB_FIRST_STORY_CONTEXT_INVALID_GENESIS:${errorCodes}`,
        );
      }

      // This transition is sandbox-only and exists solely to exercise the exact
      // production first-story handoff contract. No canonical committer is called.
      const committed = markCharacterGenesisCommitted(
        selectCharacterGenesisPackage(staged, now),
        now,
      );
      const environment = asRecord(sections.environment);
      const binding = asRecord(environment.binding);
      const worldId =
        optionalString(binding.worldId) ?? `testlab-world-${childProfileId}`;
      const manifest = await buildProductionFirstStoryContext({
        readers: {
          readWorkingStory: () => null,
          readEmotionalState: () => [],
        },
        candidate: committed,
        request: {
          householdId,
          childProfileId,
          worldId,
          focalCharacterId: characterId,
          storySessionId: `testlab-first-story-${sessionId}`,
          generationIntent: "first_story_preview",
          sceneFocus:
            "Begin the first story from the committed Character Genesis state without inventing hidden knowledge.",
        },
      });

      const preview = toJsonObject({
        manifest,
        evidence: {
          usesProductionComposer: true,
          sandboxCommitSimulation: true,
          canonicalMutationPerformed: false,
          sectionNames: manifest.sections.map((section) => section.name),
          tokenUsage: manifest.tokenUsage,
          findings: manifest.findings,
          contentHash: manifest.contentHash,
        },
      });
      const candidateState = toJsonObject({
        ...structuredClone(parentState.value),
        characterGenesisQualification: {
          ...qualification,
          firstStoryContextPreview: preview,
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
          productionOperation: "story_context.first_story_preview",
          generationConfig: null,
          promptKey: null,
          promptVersion: null,
          promptTemplateSnapshot: null,
          renderedPrompt: null,
          finalProviderRequest: null,
          rawProviderOutput: null,
          renderedPromptFingerprint: null,
          contextFingerprint: manifest.contentHash,
        },
        candidates: [
          {
            candidateId: crypto.randomUUID(),
            candidateStateId: crypto.randomUUID(),
            payload: preview,
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
          manifest,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "TEST_LAB_FIRST_STORY_CONTEXT_ERROR", message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}, "/api/settings/test-lab/genesis/first-story-context");

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
