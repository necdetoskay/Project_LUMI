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
  type EnvironmentGenesisSuggestion,
  type GenerateEnvironmentGenesisOptions,
} from "@lumi/profiles";
import {
  createEnvironmentGenesisState,
  inspectEnvironmentGenesisQuality,
  validateEnvironmentGenesisState,
  type EnvironmentClimateCandidate,
  type EnvironmentGenesisState,
  type EnvironmentSeasonCandidate,
} from "@lumi/world";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const ENVIRONMENT_GENESIS_PHASE_ID = "character_genesis_environment";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const now = new Date();
    const nowIso = now.toISOString();
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
      const initialSeasonHint = optionalString(body.initialSeasonHint);
      const promptOverride = readPromptOverride(body.promptOverride);
      const options: GenerateEnvironmentGenesisOptions = {
        modelOverride: modelSlug,
        creationOverride: {
          startDirection: "character_first",
          previousSelections: parentState.value,
        },
        recordTrace: false,
        initialSeasonHint: initialSeasonHint ?? null,
        realWorldDateHint: nowIso.slice(0, 10),
        ...(localeOverride ? { localeOverride } : {}),
        ...(promptOverride ? { promptOverride } : {}),
      };

      if (action === "preview") {
        const preview = await previewEnvironmentGenesisPrompt(
          parent.id,
          { householdId, childProfileId },
          options,
        );
        return NextResponse.json({
          data: {
            ...preview,
            initialSeasonContext: {
              universeCalendarHint: initialSeasonHint ?? null,
              realWorldDateSoftHint: nowIso.slice(0, 10),
            },
          },
        });
      }
      if (action !== "run") {
        throw new Error(`TEST_LAB_ENVIRONMENT_GENESIS_UNKNOWN_ACTION:${action}`);
      }

      const generated = await generateEnvironmentGenesis(
        parent.id,
        { householdId, childProfileId },
        options,
      );
      const modelProfile =
        await new OpenRouterModelCatalog().resolveModelProfile({
          modelSlug,
          capturedAt: nowIso,
        });
      const usageSnapshot = createUsageSnapshot(
        generated,
        modelProfile.pricing,
      );
      const baseSeed =
        readGenesisSeed(parentState.value) ?? `${sessionId}:${branchId}`;
      const refs = readEnvironmentRefs(parentState.value);
      const existingCandidates = readExistingEnvironmentCandidates(
        parentState.value,
      );
      const externalSeasonCandidates = [
        ...existingCandidates.seasons,
        ...(initialSeasonHint
          ? [calendarSeasonCandidate(initialSeasonHint)]
          : []),
        realWorldSeasonCandidate(now),
      ];

      const preparedCandidates = generated.suggestions.map(
        (suggestion, index) => {
          const environment = createEnvironmentGenesisState({
            seed: `${baseSeed}:environment:${suggestion.key}`,
            suggestion: toWorldSuggestion(suggestion),
            ...(refs.worldId ? { worldId: refs.worldId } : {}),
            ...(refs.regionId ? { regionId: refs.regionId } : {}),
            ...(refs.homeId ? { homeId: refs.homeId } : {}),
            climateCandidates: existingCandidates.climates,
            seasonCandidates: externalSeasonCandidates,
          });
          const domainIssues = validateEnvironmentGenesisState(environment);
          const quality = inspectEnvironmentGenesisQuality(environment);
          const stateDiff = buildEnvironmentStateDiff(
            parentState.value,
            environment,
          );
          const worldPromptState = projectEnvironmentForWorldPrompt(environment);
          return {
            suggestion,
            environment,
            validation: {
              production: generated.validation[index],
              domain: {
                valid: domainIssues.every(
                  (issue) => issue.severity !== "error",
                ),
                issues: domainIssues,
              },
              quality,
            },
            sourceResolution: environment.binding?.provenance ?? null,
            worldPromptState,
            stateDiff,
          };
        },
      );

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
          renderedPromptFingerprint: fingerprint(
            generated.provenance.renderedPrompt,
          ),
          contextFingerprint: fingerprint(parentState.value),
        },
        candidates: preparedCandidates.map((item) => ({
          candidateId: crypto.randomUUID(),
          candidateStateId: crypto.randomUUID(),
          payload: toJsonObject(item),
          candidateState: environmentCandidateState(
            parentState.value,
            item.environment,
          ),
        })),
        now: nowIso,
      });

      return NextResponse.json({
        data: {
          phaseId: ENVIRONMENT_GENESIS_PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          rawProviderOutput: generated.rawProviderOutput,
          parsedOutput: generated.suggestions,
          canonicalEnvironment: preparedCandidates.map(
            (item) => item.environment,
          ),
          validation: preparedCandidates.map((item) => item.validation),
          sourceResolution: preparedCandidates.map(
            (item) => item.sourceResolution,
          ),
          worldPromptState: preparedCandidates.map(
            (item) => item.worldPromptState,
          ),
          stateDiff: preparedCandidates.map((item) => item.stateDiff),
          initialSeasonContext: {
            universeCalendarHint: initialSeasonHint ?? null,
            realWorldDateSoftHint: nowIso.slice(0, 10),
            priorityRule:
              "world_lore > region_climate > universe_calendar > real_world_soft_hint",
          },
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

function toWorldSuggestion(
  suggestion: EnvironmentGenesisSuggestion,
): Parameters<typeof createEnvironmentGenesisState>[0]["suggestion"] {
  return structuredClone(suggestion);
}

function projectEnvironmentForWorldPrompt(environment: EnvironmentGenesisState) {
  const binding = environment.binding;
  if (!binding) return null;
  return {
    persistent: {
      worldId: environment.worldId ?? null,
      regionId: environment.regionId ?? null,
      homeId: environment.homeId ?? null,
      habitat: binding.habitat,
      climate: {
        temperatureBand: binding.climate.temperatureBand,
        moistureBand: binding.climate.moistureBand,
        precipitationBand: binding.climate.precipitationBand,
        environmentVector: binding.climate.environmentVector,
      },
    },
    current: {
      season: binding.season,
      weather: binding.transient.weather,
      dayPhase: binding.transient.dayPhase,
    },
    resolution: {
      climateSource: binding.provenance.climateResolution.selectedSource,
      seasonSource: binding.provenance.seasonResolution.selectedSource,
    },
  };
}

function buildEnvironmentStateDiff(
  parentState: JsonObject,
  environment: EnvironmentGenesisState,
) {
  const previous = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).environment,
  );
  const previousBinding = asRecord(previous.binding);
  const previousHabitat = asRecord(previousBinding.habitat);
  const previousClimate = asRecord(previousBinding.climate);
  const nextBinding = environment.binding;
  return {
    persistent: {
      worldIdBefore: optionalString(previous.worldId) ?? null,
      worldIdAfter: environment.worldId ?? null,
      regionIdBefore: optionalString(previous.regionId) ?? null,
      regionIdAfter: environment.regionId ?? null,
      homeIdBefore: optionalString(previous.homeId) ?? null,
      homeIdAfter: environment.homeId ?? null,
      habitatBefore: optionalString(previousHabitat.key) ?? null,
      habitatAfter: nextBinding?.habitat.key ?? null,
      climateBefore: previousClimate,
      climateAfter: nextBinding?.climate ?? null,
    },
    current: {
      seasonBefore: asRecord(previousBinding.season),
      seasonAfter: nextBinding?.season ?? null,
      weatherBefore: asRecord(asRecord(previousBinding.transient).weather),
      weatherAfter: nextBinding?.transient.weather ?? null,
      dayPhaseBefore:
        optionalString(asRecord(previousBinding.transient).dayPhase) ?? null,
      dayPhaseAfter: nextBinding?.transient.dayPhase ?? null,
    },
  };
}

function environmentCandidateState(
  parentState: JsonObject,
  environment: EnvironmentGenesisState,
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

function readEnvironmentRefs(parentState: JsonObject) {
  const existing = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).environment,
  );
  return {
    worldId:
      optionalString(existing.worldId) ?? optionalString(parentState.worldId),
    regionId:
      optionalString(existing.regionId) ?? optionalString(parentState.regionId),
    homeId: optionalString(existing.homeId) ?? optionalString(parentState.homeId),
  };
}

function readExistingEnvironmentCandidates(parentState: JsonObject): {
  climates: EnvironmentClimateCandidate[];
  seasons: EnvironmentSeasonCandidate[];
} {
  const environment = asRecord(
    asRecord(asRecord(parentState.characterGenesis).sections).environment,
  );
  const binding = asRecord(environment.binding);
  const climate = asRecord(binding.climate);
  const season = asRecord(binding.season);
  return {
    climates: isClimateCandidate(climate)
      ? [climate as unknown as EnvironmentClimateCandidate]
      : [],
    seasons: isSeasonCandidate(season)
      ? [season as unknown as EnvironmentSeasonCandidate]
      : [],
  };
}

function isClimateCandidate(value: Record<string, unknown>): boolean {
  return Boolean(
    optionalString(value.temperatureBand) &&
      optionalString(value.moistureBand) &&
      optionalString(value.precipitationBand) &&
      optionalString(value.source),
  );
}

function isSeasonCandidate(value: Record<string, unknown>): boolean {
  return Boolean(
    optionalString(value.key) &&
      optionalString(value.displayName) &&
      optionalString(value.thermalShift) &&
      optionalString(value.moistureShift) &&
      optionalString(value.daylightShift) &&
      optionalString(value.source),
  );
}

function calendarSeasonCandidate(hint: string): EnvironmentSeasonCandidate {
  const normalized = hint.trim().toLowerCase();
  const semantics = standardSeasonSemantics(normalized);
  return {
    key: normalized || "calendar-hint",
    displayName: hint.trim(),
    ...semantics,
    source: "universe_calendar",
    sourceRefs: ["testlab:initial-season-context"],
    rationale: "Explicit Test Lab universe-calendar initialization hint",
  };
}

function realWorldSeasonCandidate(date: Date): EnvironmentSeasonCandidate {
  const month = date.getUTCMonth() + 1;
  const key =
    month >= 3 && month <= 5
      ? "spring"
      : month >= 6 && month <= 8
        ? "summer"
        : month >= 9 && month <= 11
          ? "autumn"
          : "winter";
  return {
    key,
    displayName: key,
    ...standardSeasonSemantics(key),
    source: "real_world_soft_hint",
    sourceRefs: [],
    rationale:
      "Real-world calendar soft initialization only; canonical world sources override this hint",
  };
}

function standardSeasonSemantics(key: string): Pick<
  EnvironmentSeasonCandidate,
  "thermalShift" | "moistureShift" | "daylightShift"
> {
  if (key === "summer") {
    return {
      thermalShift: "warmer",
      moistureShift: "drier",
      daylightShift: "longer",
    };
  }
  if (key === "winter") {
    return {
      thermalShift: "much_colder",
      moistureShift: "neutral",
      daylightShift: "much_shorter",
    };
  }
  if (key === "autumn" || key === "fall") {
    return {
      thermalShift: "colder",
      moistureShift: "wetter",
      daylightShift: "shorter",
    };
  }
  if (key === "spring") {
    return {
      thermalShift: "neutral",
      moistureShift: "wetter",
      daylightShift: "longer",
    };
  }
  return {
    thermalShift: "neutral",
    moistureShift: "neutral",
    daylightShift: "neutral",
  };
}

function readGenesisSeed(parentState: JsonObject): string | undefined {
  return optionalString(asRecord(parentState.characterGenesis).candidateSeed);
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
