export const ENVIRONMENT_VALIDATION_STATUSES = [
  "valid",
  "valid_with_explicit_exception",
  "invalid",
] as const;

export type EnvironmentValidationStatus =
  (typeof ENVIRONMENT_VALIDATION_STATUSES)[number];

export const ENVIRONMENT_EXCEPTION_SOURCE_TYPES = [
  "world_lore",
  "world_event",
  "magic",
  "story_consequence",
] as const;

export type EnvironmentExceptionSourceType =
  (typeof ENVIRONMENT_EXCEPTION_SOURCE_TYPES)[number];

export type EnvironmentTrend =
  | "strongly_decreasing"
  | "decreasing"
  | "stable"
  | "increasing"
  | "strongly_increasing";

export interface NormalizedSeasonSemantics {
  temperatureTrend: EnvironmentTrend;
  precipitationTrend: EnvironmentTrend;
  daylightTrend: EnvironmentTrend;
  vegetationPhase?: string;
}

export interface RegionEnvironmentProfile {
  habitatType: string;
  terrain: string[];
  vegetation: string[];
  waterFeatures: string[];
  environmentalFeatures: string[];
  climate: {
    climateType: string;
    temperatureBand: string;
    precipitationBand: string;
    humidityBand?: string;
    seasonalVariation: "low" | "moderate" | "high" | "extreme";
  };
  loreConstraints: string[];
}

export interface WorldSeasonDefinition {
  id: string;
  displayName: string;
  order: number;
  semantics: NormalizedSeasonSemantics;
}

export interface WorldCalendarDefinition {
  calendarId: string;
  displayName: string;
  seasons: WorldSeasonDefinition[];
}

export interface WorldTemporalState {
  calendarId: string;
  seasonId: string;
  seasonPhase?: "early" | "mid" | "late" | "transition";
  universeTimeMarker?: string;
  source: "world_lore" | "universe_calendar" | "real_world_soft" | "seeded_default";
}

export interface EnvironmentalException {
  sourceType: EnvironmentExceptionSourceType;
  sourceId?: string;
  explanation: string;
}

export interface LocalEnvironmentState {
  weather?: string;
  dayPhase?: string;
  localConditions: string[];
  exceptions: EnvironmentalException[];
}

export interface EnvironmentBinding {
  worldId?: string;
  regionId?: string;
  locationId?: string;
  homeId?: string;
}

export interface EnvironmentDecisionTraceEntry {
  signal:
    | "world_lore"
    | "canonical_origin_home"
    | "region_climate"
    | "universe_calendar"
    | "character_concept"
    | "character_dna"
    | "child_interests"
    | "real_world_calendar"
    | "seeded_diversity";
  accepted: boolean;
  value?: string;
  reason: string;
}

export interface GenesisEnvironmentState {
  binding: EnvironmentBinding;
  regionProfile: RegionEnvironmentProfile;
  calendar: WorldCalendarDefinition;
  temporal: WorldTemporalState;
  local: LocalEnvironmentState;
  decisionTrace: EnvironmentDecisionTraceEntry[];
}

export interface EnvironmentCompatibilityContext {
  canonicalOriginHomeText?: string;
  expectedWorldId?: string;
  expectedRegionId?: string;
  expectedHomeId?: string;
}

export interface EnvironmentValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EnvironmentValidationResult {
  status: EnvironmentValidationStatus;
  valid: boolean;
  issues: EnvironmentValidationIssue[];
}

export interface ResolveEnvironmentInput {
  candidates: Array<{
    source: EnvironmentDecisionTraceEntry["signal"];
    state: GenesisEnvironmentState;
  }>;
}

const SOURCE_PRIORITY: Record<EnvironmentDecisionTraceEntry["signal"], number> = {
  world_lore: 100,
  canonical_origin_home: 90,
  region_climate: 80,
  universe_calendar: 70,
  character_concept: 60,
  character_dna: 50,
  child_interests: 40,
  real_world_calendar: 20,
  seeded_diversity: 10,
};

export function resolveGenesisEnvironment(
  input: ResolveEnvironmentInput,
): GenesisEnvironmentState {
  if (input.candidates.length === 0) {
    throw new Error("ENVIRONMENT_CANDIDATE_REQUIRED");
  }

  const sorted = [...input.candidates].sort(
    (left, right) => SOURCE_PRIORITY[right.source] - SOURCE_PRIORITY[left.source],
  );
  const winner = structuredClone(sorted[0]!.state);

  winner.decisionTrace = sorted.map((candidate, index) => ({
    signal: candidate.source,
    accepted: index === 0,
    value: `${candidate.state.regionProfile.habitatType}/${candidate.state.temporal.seasonId}`,
    reason:
      index === 0
        ? `Selected by deterministic priority (${SOURCE_PRIORITY[candidate.source]})`
        : `Lower priority than ${sorted[0]!.source}`,
  }));

  return winner;
}

export function validateGenesisEnvironment(
  state: GenesisEnvironmentState,
  context: EnvironmentCompatibilityContext = {},
): EnvironmentValidationResult {
  const issues: EnvironmentValidationIssue[] = [];

  if (state.calendar.calendarId !== state.temporal.calendarId) {
    issues.push({
      code: "ENVIRONMENT_CALENDAR_MISMATCH",
      message: "Temporal state must reference the active calendar definition",
      severity: "error",
    });
  }

  const season = state.calendar.seasons.find(
    (candidate) => candidate.id === state.temporal.seasonId,
  );
  if (!season) {
    issues.push({
      code: "ENVIRONMENT_UNKNOWN_SEASON",
      message: `Unknown season '${state.temporal.seasonId}'`,
      severity: "error",
    });
  }

  if (context.expectedWorldId && state.binding.worldId !== context.expectedWorldId) {
    issues.push({
      code: "ENVIRONMENT_WORLD_BINDING_CONFLICT",
      message: "Environment world binding contradicts canonical world identity",
      severity: "error",
    });
  }
  if (context.expectedRegionId && state.binding.regionId !== context.expectedRegionId) {
    issues.push({
      code: "ENVIRONMENT_REGION_BINDING_CONFLICT",
      message: "Environment region binding contradicts canonical region identity",
      severity: "error",
    });
  }
  if (context.expectedHomeId && state.binding.homeId !== context.expectedHomeId) {
    issues.push({
      code: "ENVIRONMENT_HOME_BINDING_CONFLICT",
      message: "Environment home binding contradicts canonical home identity",
      severity: "error",
    });
  }

  if (context.canonicalOriginHomeText) {
    const normalizedOrigin = context.canonicalOriginHomeText.toLocaleLowerCase("en-US");
    const normalizedHabitat = state.regionProfile.habitatType.toLocaleLowerCase("en-US");
    if (
      normalizedOrigin.includes("harbor") &&
      (normalizedHabitat.includes("forest") || normalizedHabitat.includes("desert"))
    ) {
      issues.push({
        code: "ENVIRONMENT_ORIGIN_HOME_CONTRADICTION",
        message: "Generated habitat contradicts canonical Origin home/place evidence",
        severity: "error",
      });
    }
  }

  const incompatibility = detectWeatherClimateIncompatibility(state);
  if (incompatibility) {
    if (state.local.exceptions.length === 0) {
      issues.push({
        code: "ENVIRONMENT_WEATHER_CLIMATE_INCOMPATIBLE",
        message: incompatibility,
        severity: "error",
      });
    } else {
      issues.push({
        code: "ENVIRONMENT_EXPLICIT_EXCEPTION_APPLIED",
        message: incompatibility,
        severity: "warning",
      });
    }
  }

  for (const exception of state.local.exceptions) {
    if (!exception.explanation.trim()) {
      issues.push({
        code: "ENVIRONMENT_EXCEPTION_EXPLANATION_REQUIRED",
        message: "Environmental exceptions require an explanation",
        severity: "error",
      });
    }
  }

  const hasError = issues.some((issue) => issue.severity === "error");
  const hasException =
    state.local.exceptions.length > 0 &&
    issues.some((issue) => issue.code === "ENVIRONMENT_EXPLICIT_EXCEPTION_APPLIED");

  return {
    status: hasError
      ? "invalid"
      : hasException
        ? "valid_with_explicit_exception"
        : "valid",
    valid: !hasError,
    issues,
  };
}

function detectWeatherClimateIncompatibility(
  state: GenesisEnvironmentState,
): string | null {
  const climate = state.regionProfile.climate.climateType.toLocaleLowerCase("en-US");
  const weather = state.local.weather?.toLocaleLowerCase("en-US") ?? "";
  const habitat = state.regionProfile.habitatType.toLocaleLowerCase("en-US");

  const tropical = climate.includes("tropical") || habitat.includes("tropical");
  const heavySnow = weather.includes("heavy snow") || weather.includes("blizzard");
  if (tropical && heavySnow) {
    return "Heavy snow is incompatible with the active tropical environment without an explicit lore/event exception";
  }

  return null;
}

export function buildEnvironmentContextProjection(state: GenesisEnvironmentState) {
  const season = state.calendar.seasons.find(
    (candidate) => candidate.id === state.temporal.seasonId,
  );

  return {
    stable: {
      ...structuredClone(state.binding),
      habitat: state.regionProfile.habitatType,
      climate: structuredClone(state.regionProfile.climate),
      terrain: [...state.regionProfile.terrain],
      environmentalFeatures: [...state.regionProfile.environmentalFeatures],
    },
    temporal: {
      seasonId: state.temporal.seasonId,
      seasonName: season?.displayName ?? state.temporal.seasonId,
      seasonPhase: state.temporal.seasonPhase,
      semantics: season ? structuredClone(season.semantics) : null,
    },
    ephemeral: {
      weather: state.local.weather,
      dayPhase: state.local.dayPhase,
      localConditions: [...state.local.localConditions],
    },
    exceptions: structuredClone(state.local.exceptions),
  };
}
