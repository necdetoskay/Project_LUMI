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
  generateSocialGenesis,
  previewSocialGenesisPrompt,
  type GenerateSocialGenesisOptions,
  type SocialGenesisSuggestion,
} from "@lumi/profiles";
import {
  createGenesisSocialState,
  validateGenesisSocialState,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const SOCIAL_GENESIS_PHASE_ID = "character_genesis_social";

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
          `TEST_LAB_SOCIAL_GENESIS_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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
      const options: GenerateSocialGenesisOptions = {
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
        const preview = await previewSocialGenesisPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_SOCIAL_GENESIS_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateSocialGenesis(
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
      const originFactIds = readOriginFactIds(parentState.value);
      const characterId =
        readCharacterId(parentState.value) ??
        `testlab-character-${childProfileId}`;
      const baseSeed =
        readGenesisSeed(parentState.value) ?? `${sessionId}:${branchId}`;

      const preparedCandidates = generated.suggestions.map(
        (suggestion, index) => {
          const social = deriveSocialState(
            suggestion,
            characterId,
            `${baseSeed}:social:${suggestion.key}`,
          );
          const domainIssues = validateGenesisSocialState({
            characterId,
            social,
            originFactIds,
          });
          const contradictions = domainIssues.filter(
            (issue) => issue.code === "GENESIS_SOCIAL_CONTRADICTORY_EVIDENCE",
          );
          const stateDiff = buildSocialStateDiff(parentState.value, social);
          const validation = {
            production: generated.validation[index],
            domain: {
              valid: domainIssues.every((issue) => issue.severity !== "error"),
              issues: domainIssues,
            },
            quality: evaluateSocialQuality(social),
          };
          return {
            suggestion,
            social,
            validation,
            contradictions,
            stateDiff,
          };
        },
      );

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: SOCIAL_GENESIS_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.social",
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
        candidates: preparedCandidates.map(
          ({ suggestion, social, validation, contradictions, stateDiff }) => ({
            candidateId: crypto.randomUUID(),
            candidateStateId: crypto.randomUUID(),
            payload: toJsonObject({
              suggestion,
              social,
              validation,
              contradictions,
              stateDiff,
            }),
            candidateState: socialCandidateState(parentState.value, social),
          }),
        ),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: SOCIAL_GENESIS_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          derivedSocial: preparedCandidates.map((item) => item.social),
          validation: preparedCandidates.map((item) => item.validation),
          contradictions: preparedCandidates.map((item) => item.contradictions),
          stateDiff: preparedCandidates.map((item) => item.stateDiff),
          modelProfile,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_SOCIAL_GENESIS_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/social");

function deriveSocialState(
  suggestion: SocialGenesisSuggestion,
  characterId: string,
  seed: string,
) {
  return createGenesisSocialState({
    characterId,
    characterIdentityKey: suggestion.characterIdentityKey,
    candidates: suggestion.npcs,
    evidence: suggestion.relationships,
    seed,
  });
}

function evaluateSocialQuality(
  social: ReturnType<typeof createGenesisSocialState>,
) {
  const styles = new Set(
    social.npcs.map((npc) =>
      npc.personality.interactionStyle.trim().toLowerCase(),
    ),
  );
  const highPotential = social.npcs.filter(
    (npc) => npc.personality.futureInteractionPotential === "high",
  ).length;
  const distinctiveness =
    social.npcs.length === 0 ? 1 : styles.size / social.npcs.length;
  const coherence = social.relationships.every(
    (edge) => edge.evidence.length > 0,
  )
    ? 1
    : 0.5;
  const futureInteractionPotential =
    social.npcs.length === 0 ? 1 : highPotential / social.npcs.length;
  return {
    distinctiveness,
    coherence,
    futureInteractionPotential,
    warnings: [
      ...(distinctiveness < 0.6
        ? ["SOCIAL_QUALITY_LOW_DISTINCTIVENESS"]
        : []),
      ...(futureInteractionPotential < 0.25 && social.npcs.length > 0
        ? ["SOCIAL_QUALITY_LOW_FUTURE_POTENTIAL"]
        : []),
    ],
  };
}

function buildSocialStateDiff(
  parentState: JsonObject,
  social: ReturnType<typeof createGenesisSocialState>,
) {
  const previousSocial = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).social,
  );
  const previousNpcs = Array.isArray(previousSocial.npcs)
    ? previousSocial.npcs
    : [];
  const previousRelationships = Array.isArray(previousSocial.relationships)
    ? previousSocial.relationships
    : [];
  return {
    npcCountBefore: previousNpcs.length,
    npcCountAfter: social.npcs.length,
    relationshipCountBefore: previousRelationships.length,
    relationshipCountAfter: social.relationships.length,
    addedNpcIds: social.npcs.map((npc) => npc.candidateId),
    relationshipEdges: social.relationships.map(
      (edge) => `${edge.fromCandidateId}->${edge.toCandidateId}`,
    ),
  };
}

function socialCandidateState(
  parentState: JsonObject,
  social: object,
): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        social: structuredClone(social),
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

function readCharacterId(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).characterId);
}

function readGenesisSeed(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).candidateSeed);
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateSocialGenesis>>,
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
): GenerateSocialGenesisOptions["promptOverride"] | undefined {
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
