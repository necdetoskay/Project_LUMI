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
  generateCharacterDnaEvidence,
  previewCharacterDnaEvidencePrompt,
  type CharacterDnaEvidenceSuggestion,
  type GenerateCharacterDnaEvidenceOptions,
} from "@lumi/profiles";
import {
  createInitialCharacterTraitState,
  normalizeSemanticCharacterTraitEvidence,
  validateCharacterTraitEvidenceReferences,
  validateCharacterTraitState,
  type CharacterContextualTrait,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const CHARACTER_GENESIS_DNA_PHASE_ID = "character_genesis_character_dna";
const STRENGTH_TO_NUMBER = {
  weak: 0.35,
  moderate: 0.6,
  strong: 0.85,
} as const;

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
          `TEST_LAB_CHARACTER_DNA_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
        );
      }

      const parentState = await repository.getState(parentStateId);
      assertSandboxOwner(parentState, {
        parentId: parent.id,
        householdId,
        childProfileId,
      });
      if (!parentState) throw new Error(`TEST_LAB_STATE_NOT_FOUND:${parentStateId}`);

      const options: GenerateCharacterDnaEvidenceOptions = {
        modelOverride: modelSlug,
        creationOverride: {
          startDirection: "character_first",
          previousSelections: parentState.value,
        },
        recordTrace: false,
        ...(optionalString(body.locale)
          ? { localeOverride: optionalString(body.locale) }
          : {}),
        ...(readPromptOverride(body.promptOverride)
          ? { promptOverride: readPromptOverride(body.promptOverride) }
          : {}),
      };

      if (action === "preview") {
        const preview = await previewCharacterDnaEvidencePrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_CHARACTER_DNA_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateCharacterDnaEvidence(
        parent.id,
        { householdId, childProfileId },
        options,
      );
      const modelProfile = await new OpenRouterModelCatalog().resolveModelProfile({
        modelSlug,
        capturedAt: now,
      });
      const usageSnapshot = createUsageSnapshot(generated, modelProfile.pricing);
      const originFactIds = readOriginFactIds(parentState.value);
      const baseSeed = readGenesisSeed(parentState.value) ?? `${sessionId}:${branchId}`;

      const preparedCandidates = generated.suggestions.map((suggestion, index) => {
        const traits = deriveTraitState(suggestion, `${baseSeed}:dna:${suggestion.key}`);
        const referenceIssues = validateCharacterTraitEvidenceReferences({
          originFactIds,
          evidence: traits.evidence,
          contextual: traits.contextual,
        });
        const traitValidation = validateCharacterTraitState(traits);
        const validation = {
          production: generated.validation[index],
          domain: {
            valid:
              traitValidation.valid &&
              referenceIssues.every((issue) => issue.severity !== "error"),
            issues: [...traitValidation.issues, ...referenceIssues],
          },
        };
        return { suggestion, traits, validation };
      });

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: CHARACTER_GENESIS_DNA_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.character_dna_evidence",
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
        candidates: preparedCandidates.map(({ suggestion, traits, validation }) => ({
          candidateId: crypto.randomUUID(),
          candidateStateId: crypto.randomUUID(),
          payload: toJsonObject({ suggestion, traits, validation }),
          candidateState: characterDnaCandidateState(parentState.value, traits),
        })),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: CHARACTER_GENESIS_DNA_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          derivedTraits: preparedCandidates.map((item) => item.traits),
          validation: preparedCandidates.map((item) => item.validation),
          modelProfile,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_CHARACTER_DNA_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/dna");

function deriveTraitState(suggestion: CharacterDnaEvidenceSuggestion, seed: string) {
  const evidence = suggestion.evidence.map(normalizeSemanticCharacterTraitEvidence);
  const contextual: CharacterContextualTrait[] = suggestion.contextual.map((item) => ({
    id: item.id,
    kind: item.kind,
    context: item.context,
    intensity: STRENGTH_TO_NUMBER[item.intensity],
    sourceFactIds: [...item.sourceFactIds],
  }));
  return createInitialCharacterTraitState({ evidence, contextual, seed });
}

function characterDnaCandidateState(parentState: JsonObject, traits: object): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        traits: structuredClone(traits),
      },
    },
  });
}

function readOriginFactIds(parentState: JsonObject): string[] {
  const genesis = asRecord(parentState.characterGenesis);
  const sections = asRecord(genesis.sections);
  const origin = asRecord(sections.origin);
  const facts = Array.isArray(origin.facts) ? origin.facts : [];
  return facts
    .map((fact) => optionalString(asRecord(fact).id))
    .filter((id): id is string => Boolean(id));
}

function readGenesisSeed(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).candidateSeed);
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateCharacterDnaEvidence>>,
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
): GenerateCharacterDnaEvidenceOptions["promptOverride"] | undefined {
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
