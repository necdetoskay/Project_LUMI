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
  generateEnvironmentGenesis,
  previewEnvironmentGenesisPrompt,
  type EnvironmentGenesisCandidateDto,
  type GenerateEnvironmentGenesisOptions,
} from "@lumi/profiles";
import {
  buildEnvironmentContextProjection,
  resolveGenesisEnvironment,
  validateGenesisEnvironment,
  type GenesisEnvironmentState,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const ENVIRONMENT_GENESIS_PHASE_ID = "character_genesis_environment";

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
          `TEST_LAB_ENVIRONMENT_GENESIS_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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
      const options: GenerateEnvironmentGenesisOptions = {
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
        const preview = await previewEnvironmentGenesisPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({ data: preview });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_ENVIRONMENT_GENESIS_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateEnvironmentGenesis(
        parent.id,
        { householdId, childProfileId },
        options,
      );
      const modelProfile = await new OpenRouterModelCatalog().resolveModelProfile({
        modelSlug,
        capturedAt: now,
      });
      const usageSnapshot = createUsageSnapshot(generated, modelProfile.pricing);
      const compatibility = readCompatibilityContext(parentState.value);

      const preparedCandidates = generated.suggestions.map((suggestion) => {
        const canonical = resolveGenesisEnvironment({
          candidates: [
            {
              source: suggestion.sourceSignal,
              state: toCanonicalEnvironment(suggestion),
            },
          ],
        });
        const validation = validateGenesisEnvironment(canonical, compatibility);
        const projection = buildEnvironmentContextProjection(canonical);
        const stateDiff = buildEnvironmentStateDiff(parentState.value, canonical);
        return { suggestion, canonical, validation, projection, stateDiff };
      });

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: ENVIRONMENT_GENESIS_PHASE_ID,
        parentStateId,
        modelSlug,
        pricingSnapshot: modelProfile.pricing,
        usageSnapshot,
        executionSnapshot: {
          productionOperation: "character_genesis.environment",
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
          candidateState: environmentCandidateState(parentState.value, item.canonical),
        })),
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: ENVIRONMENT_GENESIS_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          canonicalEnvironment: preparedCandidates.map((item) => item.canonical),
          validation: preparedCandidates.map((item) => item.validation),
          contextProjection: preparedCandidates.map((item) => item.projection),
          stateDiff: preparedCandidates.map((item) => item.stateDiff),
          modelProfile,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_ENVIRONMENT_GENESIS_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis/environment");

function toCanonicalEnvironment(
  dto: EnvironmentGenesisCandidateDto,
): GenesisEnvironmentState {
  return {
    binding: compactOptionalIds(dto.binding),
    regionProfile: {
      habitatType: dto.regionProfile.habitatType,
      terrain: [...dto.regionProfile.terrain],
      vegetation: [...dto.regionProfile.vegetation],
      waterFeatures: [...dto.regionProfile.waterFeatures],
      environmentalFeatures: [...dto.regionProfile.environmentalFeatures],
      climate: {
        climateType: dto.regionProfile.climate.climateType,
        temperatureBand: dto.regionProfile.climate.temperatureBand,
        precipitationBand: dto.regionProfile.climate.precipitationBand,
        ...(dto.regionProfile.climate.humidityBand
          ? { humidityBand: dto.regionProfile.climate.humidityBand }
          : {}),
        seasonalVariation: dto.regionProfile.climate.seasonalVariation,
      },
      loreConstraints: [...dto.regionProfile.loreConstraints],
    },
    calendar: {
      calendarId: dto.calendar.calendarId,
      displayName: dto.calendar.displayName,
      seasons: dto.calendar.seasons.map((season) => ({
        id: season.id,
        displayName: season.displayName,
        order: season.order,
        semantics: {
          temperatureTrend: season.semantics.temperatureTrend,
          precipitationTrend: season.semantics.precipitationTrend,
          daylightTrend: season.semantics.daylightTrend,
          ...(season.semantics.vegetationPhase
            ? { vegetationPhase: season.semantics.vegetationPhase }
            : {}),
        },
      })),
    },
    temporal: {
      calendarId: dto.temporal.calendarId,
      seasonId: dto.temporal.seasonId,
      ...(dto.temporal.seasonPhase
        ? { seasonPhase: dto.temporal.seasonPhase }
        : {}),
      ...(dto.temporal.universeTimeMarker
        ? { universeTimeMarker: dto.temporal.universeTimeMarker }
        : {}),
      source: dto.temporal.source,
    },
    local: {
      ...(dto.local.weather ? { weather: dto.local.weather } : {}),
      ...(dto.local.dayPhase ? { dayPhase: dto.local.dayPhase } : {}),
      localConditions: [...dto.local.localConditions],
      exceptions: dto.local.exceptions.map((exception) => ({
        sourceType: exception.sourceType,
        ...(exception.sourceId ? { sourceId: exception.sourceId } : {}),
        explanation: exception.explanation,
      })),
    },
    decisionTrace: [],
  };
}

function compactOptionalIds(binding: EnvironmentGenesisCandidateDto["binding"]) {
  return {
    ...(binding.worldId ? { worldId: binding.worldId } : {}),
    ...(binding.regionId ? { regionId: binding.regionId } : {}),
    ...(binding.locationId ? { locationId: binding.locationId } : {}),
    ...(binding.homeId ? { homeId: binding.homeId } : {}),
  };
}

function readCompatibilityContext(parentState: JsonObject) {
  const sections = asRecord(asRecord(parentState.characterGenesis).sections);
  const origin = asRecord(sections.origin);
  const originSummary = optionalString(origin.summary);
  const existingEnvironment = asRecord(sections.environment);
  const binding = asRecord(existingEnvironment.binding);
  return {
    ...(originSummary ? { canonicalOriginHomeText: originSummary } : {}),
    ...(optionalString(binding.worldId)
      ? { expectedWorldId: optionalString(binding.worldId) }
      : {}),
    ...(optionalString(binding.regionId)
      ? { expectedRegionId: optionalString(binding.regionId) }
      : {}),
    ...(optionalString(binding.homeId)
      ? { expectedHomeId: optionalString(binding.homeId) }
      : {}),
  };
}

function buildEnvironmentStateDiff(
  parentState: JsonObject,
  environment: GenesisEnvironmentState,
) {
  const sections = asRecord(asRecord(parentState.characterGenesis).sections);
  const previous = asRecord(sections.environment);
  return {
    hadEnvironmentBefore: Object.keys(previous).length > 0,
    stableBinding: structuredClone(environment.binding),
    habitat: environment.regionProfile.habitatType,
    climate: environment.regionProfile.climate.climateType,
    season: environment.temporal.seasonId,
    weather: environment.local.weather ?? null,
    dayPhase: environment.local.dayPhase ?? null,
    exceptionCount: environment.local.exceptions.length,
  };
}

function environmentCandidateState(
  parentState: JsonObject,
  environment: GenesisEnvironmentState,
): JsonObject {
  const existingGenesis = asRecord(parentState.characterGenesis);
  const existingSections = asRecord(existingGenesis.sections);
  return toJsonObject({
    ...structuredClone(parentState),
    characterGenesis: {
      ...structuredClone(existingGenesis),
      sections: {
        ...structuredClone(existingSections),
        environment: structuredClone(environment),
      },
    },
  });
}

function createUsageSnapshot(
  generated: Awaited<ReturnType<typeof generateEnvironmentGenesis>>,
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
): GenerateEnvironmentGenesisOptions["promptOverride"] | undefined {
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
