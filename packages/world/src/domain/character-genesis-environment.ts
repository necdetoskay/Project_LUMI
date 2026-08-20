import {
  REGION_TYPES,
  type RegionType,
} from "./world-types";

export const ENVIRONMENT_GENESIS_REVISION = "environment-genesis.v1" as const;

export const CLIMATE_TEMPERATURE_BANDS = [
  "freezing",
  "cold",
  "cool",
  "temperate",
  "warm",
  "hot",
] as const;
export type ClimateTemperatureBand =
  (typeof CLIMATE_TEMPERATURE_BANDS)[number];

export const CLIMATE_MOISTURE_BANDS = [
  "arid",
  "dry",
  "balanced",
  "humid",
  "wet",
] as const;
export type ClimateMoistureBand = (typeof CLIMATE_MOISTURE_BANDS)[number];

export const CLIMATE_PRECIPITATION_BANDS = [
  "rare",
  "low",
  "seasonal",
  "regular",
  "heavy",
] as const;
export type ClimatePrecipitationBand =
  (typeof CLIMATE_PRECIPITATION_BANDS)[number];

export const SEASON_THERMAL_SHIFTS = [
  "much_colder",
  "colder",
  "neutral",
  "warmer",
  "much_warmer",
] as const;
export type SeasonThermalShift = (typeof SEASON_THERMAL_SHIFTS)[number];

export const SEASON_MOISTURE_SHIFTS = [
  "much_drier",
  "drier",
  "neutral",
  "wetter",
  "much_wetter",
] as const;
export type SeasonMoistureShift = (typeof SEASON_MOISTURE_SHIFTS)[number];

export const SEASON_DAYLIGHT_SHIFTS = [
  "much_shorter",
  "shorter",
  "neutral",
  "longer",
  "much_longer",
] as const;
export type SeasonDaylightShift = (typeof SEASON_DAYLIGHT_SHIFTS)[number];

export const GENESIS_WEATHER_CONDITIONS = [
  "clear",
  "cloudy",
  "drizzle",
  "rain",
  "snow",
  "sleet",
  "storm",
  "fog",
  "wind",
  "heat",
  "custom",
] as const;
export type GenesisWeatherCondition =
  (typeof GENESIS_WEATHER_CONDITIONS)[number];

export const GENESIS_WEATHER_INTENSITIES = [
  "light",
  "moderate",
  "strong",
] as const;
export type GenesisWeatherIntensity =
  (typeof GENESIS_WEATHER_INTENSITIES)[number];

export const GENESIS_DAY_PHASES = [
  "dawn",
  "morning",
  "noon",
  "afternoon",
  "evening",
  "dusk",
  "night",
] as const;
export type GenesisDayPhase = (typeof GENESIS_DAY_PHASES)[number];

export const ENVIRONMENT_SEASON_SOURCES = [
  "world_lore",
  "region_climate",
  "universe_calendar",
  "real_world_soft_hint",
] as const;
export type EnvironmentSeasonSource =
  (typeof ENVIRONMENT_SEASON_SOURCES)[number];

export const ENVIRONMENT_CLIMATE_SOURCES = [
  "world_lore",
  "region_climate",
  "character_concept",
] as const;
export type EnvironmentClimateSource =
  (typeof ENVIRONMENT_CLIMATE_SOURCES)[number];

export const ENVIRONMENT_HABITAT_SOURCES = [
  "world_lore",
  "region_climate",
  "character_concept",
] as const;
export type EnvironmentHabitatSource =
  (typeof ENVIRONMENT_HABITAT_SOURCES)[number];

export const ENVIRONMENT_LORE_EXCEPTION_KINDS = [
  "season_climate",
  "weather_temperature",
  "weather_precipitation",
] as const;
export type EnvironmentLoreExceptionKind =
  (typeof ENVIRONMENT_LORE_EXCEPTION_KINDS)[number];

export interface EnvironmentHabitatSuggestion {
  key: string;
  displayName: string;
  regionType: RegionType;
  tags: string[];
  source: EnvironmentHabitatSource;
  sourceRefs: string[];
  rationale: string;
}

export interface EnvironmentClimateCandidate {
  temperatureBand: ClimateTemperatureBand;
  moistureBand: ClimateMoistureBand;
  precipitationBand: ClimatePrecipitationBand;
  source: EnvironmentClimateSource;
  sourceRefs: string[];
  rationale: string;
}

export interface EnvironmentSeasonCandidate {
  key: string;
  displayName: string;
  thermalShift: SeasonThermalShift;
  moistureShift: SeasonMoistureShift;
  daylightShift: SeasonDaylightShift;
  source: EnvironmentSeasonSource;
  sourceRefs: string[];
  rationale: string;
}

export interface EnvironmentWeatherSuggestion {
  condition: GenesisWeatherCondition;
  intensity: GenesisWeatherIntensity;
  customLabel?: string;
  rationale: string;
}

export interface EnvironmentLoreException {
  kind: EnvironmentLoreExceptionKind;
  reason: string;
  sourceRefs: string[];
}

export interface EnvironmentGenesisSuggestionLike {
  key: string;
  title: string;
  habitat: EnvironmentHabitatSuggestion;
  climate: EnvironmentClimateCandidate;
  season: EnvironmentSeasonCandidate;
  weather: EnvironmentWeatherSuggestion;
  dayPhase: GenesisDayPhase;
  loreExceptions: EnvironmentLoreException[];
}

export interface GenesisEnvironmentClimateState
  extends EnvironmentClimateCandidate {
  environmentVector: Record<string, number>;
}

export interface GenesisEnvironmentBindingState {
  habitat: EnvironmentHabitatSuggestion & { persistent: true };
  climate: GenesisEnvironmentClimateState;
  season: EnvironmentSeasonCandidate;
  transient: {
    weather: EnvironmentWeatherSuggestion;
    dayPhase: GenesisDayPhase;
  };
  loreExceptions: EnvironmentLoreException[];
  provenance: {
    seed: string;
    derivationRevision: typeof ENVIRONMENT_GENESIS_REVISION;
    climateResolution: {
      selectedSource: EnvironmentClimateSource;
      candidates: EnvironmentClimateCandidate[];
    };
    seasonResolution: {
      selectedSource: EnvironmentSeasonSource;
      candidates: EnvironmentSeasonCandidate[];
    };
  };
}

/**
 * Backward-compatible staged Genesis environment state. The legacy scalar
 * fields remain available while `binding` carries the separated canonical
 * habitat/climate/season/transient semantics used by #386 and #387.
 */
export interface EnvironmentGenesisState {
  worldId?: string;
  regionId?: string;
  homeId?: string;
  habitat: string;
  climate: string;
  season: string;
  weather?: string;
  dayPhase?: string;
  binding?: GenesisEnvironmentBindingState;
}

export interface EnvironmentGenesisValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  path?: string;
}

const CLIMATE_SOURCE_PRIORITY: Readonly<
  Record<EnvironmentClimateSource, number>
> = {
  world_lore: 400,
  region_climate: 300,
  character_concept: 100,
};

/** Issue #386 priority: world lore > region climate > universe calendar > real world. */
const SEASON_SOURCE_PRIORITY: Readonly<
  Record<EnvironmentSeasonSource, number>
> = {
  world_lore: 400,
  region_climate: 300,
  universe_calendar: 200,
  real_world_soft_hint: 100,
};

const TEMPERATURE_VECTOR: Readonly<Record<ClimateTemperatureBand, number>> = {
  freezing: -1,
  cold: -0.65,
  cool: -0.3,
  temperate: 0,
  warm: 0.5,
  hot: 1,
};

const MOISTURE_VECTOR: Readonly<Record<ClimateMoistureBand, number>> = {
  arid: -1,
  dry: -0.5,
  balanced: 0,
  humid: 0.55,
  wet: 1,
};

const PRECIPITATION_VECTOR: Readonly<
  Record<ClimatePrecipitationBand, number>
> = {
  rare: -1,
  low: -0.5,
  seasonal: 0,
  regular: 0.55,
  heavy: 1,
};

const THERMAL_DELTA: Readonly<Record<SeasonThermalShift, number>> = {
  much_colder: -2,
  colder: -1,
  neutral: 0,
  warmer: 1,
  much_warmer: 2,
};

export function environmentClimateToVector(
  climate: Pick<
    EnvironmentClimateCandidate,
    "temperatureBand" | "moistureBand" | "precipitationBand"
  >,
): Record<string, number> {
  return {
    temperature: TEMPERATURE_VECTOR[climate.temperatureBand],
    moisture: MOISTURE_VECTOR[climate.moistureBand],
    precipitation: PRECIPITATION_VECTOR[climate.precipitationBand],
  };
}

export function createEnvironmentGenesisState(input: {
  seed: string;
  suggestion: EnvironmentGenesisSuggestionLike;
  worldId?: string;
  regionId?: string;
  homeId?: string;
  climateCandidates?: EnvironmentClimateCandidate[];
  seasonCandidates?: EnvironmentSeasonCandidate[];
}): EnvironmentGenesisState {
  const climateCandidates = [
    ...(input.climateCandidates ?? []),
    input.suggestion.climate,
  ];
  const seasonCandidates = [
    ...(input.seasonCandidates ?? []),
    input.suggestion.season,
  ];
  const climate = selectClimateCandidate(climateCandidates);
  const season = selectSeasonCandidate(seasonCandidates);
  const weatherLabel =
    input.suggestion.weather.condition === "custom"
      ? input.suggestion.weather.customLabel?.trim() || "custom"
      : input.suggestion.weather.condition;

  return {
    ...(input.worldId ? { worldId: input.worldId } : {}),
    ...(input.regionId ? { regionId: input.regionId } : {}),
    ...(input.homeId ? { homeId: input.homeId } : {}),
    habitat: input.suggestion.habitat.displayName,
    climate: `${climate.temperatureBand}/${climate.moistureBand}/${climate.precipitationBand}`,
    season: season.displayName,
    weather: weatherLabel,
    dayPhase: input.suggestion.dayPhase,
    binding: {
      habitat: {
        ...structuredClone(input.suggestion.habitat),
        persistent: true,
      },
      climate: {
        ...structuredClone(climate),
        environmentVector: environmentClimateToVector(climate),
      },
      season: structuredClone(season),
      transient: {
        weather: structuredClone(input.suggestion.weather),
        dayPhase: input.suggestion.dayPhase,
      },
      loreExceptions: structuredClone(input.suggestion.loreExceptions),
      provenance: {
        seed: input.seed,
        derivationRevision: ENVIRONMENT_GENESIS_REVISION,
        climateResolution: {
          selectedSource: climate.source,
          candidates: structuredClone(climateCandidates),
        },
        seasonResolution: {
          selectedSource: season.source,
          candidates: structuredClone(seasonCandidates),
        },
      },
    },
  };
}

function selectClimateCandidate(
  candidates: EnvironmentClimateCandidate[],
): EnvironmentClimateCandidate {
  if (candidates.length === 0) {
    throw new Error("ENVIRONMENT_CLIMATE_CANDIDATE_REQUIRED");
  }
  return structuredClone(
    candidates.reduce((selected, candidate) =>
      CLIMATE_SOURCE_PRIORITY[candidate.source] >
      CLIMATE_SOURCE_PRIORITY[selected.source]
        ? candidate
        : selected,
    ),
  );
}

export function selectSeasonCandidate(
  candidates: EnvironmentSeasonCandidate[],
): EnvironmentSeasonCandidate {
  if (candidates.length === 0) {
    throw new Error("ENVIRONMENT_SEASON_CANDIDATE_REQUIRED");
  }
  return structuredClone(
    candidates.reduce((selected, candidate) =>
      SEASON_SOURCE_PRIORITY[candidate.source] >
      SEASON_SOURCE_PRIORITY[selected.source]
        ? candidate
        : selected,
    ),
  );
}

export function applyEnvironmentSeasonUpdate(
  state: EnvironmentGenesisState,
  input: {
    season: EnvironmentSeasonCandidate;
    weather?: EnvironmentWeatherSuggestion;
    dayPhase?: GenesisDayPhase;
  },
): EnvironmentGenesisState {
  if (!state.binding) {
    throw new Error("ENVIRONMENT_BINDING_REQUIRED");
  }
  const next = structuredClone(state);
  next.season = input.season.displayName;
  next.binding!.season = structuredClone(input.season);
  if (input.weather) {
    next.binding!.transient.weather = structuredClone(input.weather);
    next.weather =
      input.weather.condition === "custom"
        ? input.weather.customLabel?.trim() || "custom"
        : input.weather.condition;
  }
  if (input.dayPhase) {
    next.binding!.transient.dayPhase = input.dayPhase;
    next.dayPhase = input.dayPhase;
  }
  return next;
}

export function validateEnvironmentGenesisState(
  state: EnvironmentGenesisState,
): EnvironmentGenesisValidationIssue[] {
  const issues: EnvironmentGenesisValidationIssue[] = [];
  const binding = state.binding;
  if (!binding) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_BINDING_REQUIRED",
      message: "Environment Genesis requires separated binding semantics",
      severity: "error",
      path: "binding",
    });
    return issues;
  }

  if (!binding.habitat.key.trim() || !binding.habitat.displayName.trim()) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_HABITAT_REQUIRED",
      message: "Habitat key and display name must be non-empty",
      severity: "error",
      path: "binding.habitat",
    });
  }
  if (!REGION_TYPES.includes(binding.habitat.regionType)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_REGION_TYPE_INVALID",
      message: `Unknown region type ${binding.habitat.regionType}`,
      severity: "error",
      path: "binding.habitat.regionType",
    });
  }

  validateClimate(binding.climate, issues);
  validateSeason(binding.season, issues);
  validateResolutionPriority(binding, issues);
  validateLoreExceptions(binding.loreExceptions, issues);
  validateWeatherCompatibility(binding, issues);

  if (!GENESIS_DAY_PHASES.includes(binding.transient.dayPhase)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_DAY_PHASE_INVALID",
      message: `Unknown day phase ${binding.transient.dayPhase}`,
      severity: "error",
      path: "binding.transient.dayPhase",
    });
  }

  return issues;
}

export function validateEnvironmentTransition(
  previous: EnvironmentGenesisState,
  next: EnvironmentGenesisState,
): EnvironmentGenesisValidationIssue[] {
  const issues: EnvironmentGenesisValidationIssue[] = [];
  if (!previous.binding || !next.binding) return issues;
  if (previous.binding.season.key === next.binding.season.key) return issues;

  const persistentPairs: Array<[string, unknown, unknown]> = [
    ["worldId", previous.worldId, next.worldId],
    ["regionId", previous.regionId, next.regionId],
    ["homeId", previous.homeId, next.homeId],
    [
      "habitat",
      previous.binding.habitat.key,
      next.binding.habitat.key,
    ],
    [
      "climate",
      climateFingerprint(previous.binding.climate),
      climateFingerprint(next.binding.climate),
    ],
  ];

  for (const [field, before, after] of persistentPairs) {
    if (before !== after) {
      issues.push({
        code: "GENESIS_ENVIRONMENT_SEASON_CHANGED_PERSISTENT_STATE",
        message: `Season change must not mutate persistent ${field}`,
        severity: "error",
        path: field,
      });
    }
  }
  return issues;
}

export function inspectEnvironmentGenesisQuality(state: EnvironmentGenesisState) {
  const issues = validateEnvironmentGenesisState(state);
  const binding = state.binding;
  return {
    habitatPersistenceReady: Boolean(binding?.habitat.persistent),
    climateCompatibility: issues.every(
      (issue) => !issue.code.includes("INCOMPATIBLE"),
    ),
    lorePriorityRespected: !issues.some(
      (issue) => issue.code === "GENESIS_ENVIRONMENT_PRIORITY_VIOLATION",
    ),
    customSeasonSemanticsReady: Boolean(
      binding?.season.key.trim() &&
        binding.season.displayName.trim() &&
        SEASON_THERMAL_SHIFTS.includes(binding.season.thermalShift) &&
        SEASON_MOISTURE_SHIFTS.includes(binding.season.moistureShift),
    ),
    transientStateSeparated: Boolean(
      binding?.transient.weather && binding.transient.dayPhase,
    ),
    issues,
  };
}

function validateClimate(
  climate: GenesisEnvironmentClimateState,
  issues: EnvironmentGenesisValidationIssue[],
) {
  if (!CLIMATE_TEMPERATURE_BANDS.includes(climate.temperatureBand)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_TEMPERATURE_INVALID",
      message: `Unknown temperature band ${climate.temperatureBand}`,
      severity: "error",
      path: "binding.climate.temperatureBand",
    });
  }
  if (!CLIMATE_MOISTURE_BANDS.includes(climate.moistureBand)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_MOISTURE_INVALID",
      message: `Unknown moisture band ${climate.moistureBand}`,
      severity: "error",
      path: "binding.climate.moistureBand",
    });
  }
  if (!CLIMATE_PRECIPITATION_BANDS.includes(climate.precipitationBand)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_PRECIPITATION_INVALID",
      message: `Unknown precipitation band ${climate.precipitationBand}`,
      severity: "error",
      path: "binding.climate.precipitationBand",
    });
  }
}

function validateSeason(
  season: EnvironmentSeasonCandidate,
  issues: EnvironmentGenesisValidationIssue[],
) {
  if (!season.key.trim() || !season.displayName.trim()) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_SEASON_REQUIRED",
      message: "Season key and display name must be non-empty",
      severity: "error",
      path: "binding.season",
    });
  }
  if (!SEASON_THERMAL_SHIFTS.includes(season.thermalShift)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_SEASON_THERMAL_INVALID",
      message: `Unknown thermal shift ${season.thermalShift}`,
      severity: "error",
      path: "binding.season.thermalShift",
    });
  }
  if (!SEASON_MOISTURE_SHIFTS.includes(season.moistureShift)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_SEASON_MOISTURE_INVALID",
      message: `Unknown moisture shift ${season.moistureShift}`,
      severity: "error",
      path: "binding.season.moistureShift",
    });
  }
  if (!SEASON_DAYLIGHT_SHIFTS.includes(season.daylightShift)) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_SEASON_DAYLIGHT_INVALID",
      message: `Unknown daylight shift ${season.daylightShift}`,
      severity: "error",
      path: "binding.season.daylightShift",
    });
  }
}

function validateResolutionPriority(
  binding: GenesisEnvironmentBindingState,
  issues: EnvironmentGenesisValidationIssue[],
) {
  const highestClimate = Math.max(
    ...binding.provenance.climateResolution.candidates.map(
      (candidate) => CLIMATE_SOURCE_PRIORITY[candidate.source],
    ),
  );
  if (
    CLIMATE_SOURCE_PRIORITY[binding.provenance.climateResolution.selectedSource] <
    highestClimate
  ) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_PRIORITY_VIOLATION",
      message: "Climate resolution ignored a higher-priority canonical source",
      severity: "error",
      path: "binding.provenance.climateResolution",
    });
  }

  const highestSeason = Math.max(
    ...binding.provenance.seasonResolution.candidates.map(
      (candidate) => SEASON_SOURCE_PRIORITY[candidate.source],
    ),
  );
  if (
    SEASON_SOURCE_PRIORITY[binding.provenance.seasonResolution.selectedSource] <
    highestSeason
  ) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_PRIORITY_VIOLATION",
      message:
        "Season resolution must follow world lore > region climate > universe calendar > real-world soft hint",
      severity: "error",
      path: "binding.provenance.seasonResolution",
    });
  }
}

function validateLoreExceptions(
  exceptions: EnvironmentLoreException[],
  issues: EnvironmentGenesisValidationIssue[],
) {
  for (const exception of exceptions) {
    if (!ENVIRONMENT_LORE_EXCEPTION_KINDS.includes(exception.kind)) {
      issues.push({
        code: "GENESIS_ENVIRONMENT_LORE_EXCEPTION_INVALID",
        message: `Unknown lore exception ${exception.kind}`,
        severity: "error",
        path: "binding.loreExceptions",
      });
    }
    if (!exception.reason.trim() || exception.sourceRefs.length === 0) {
      issues.push({
        code: "GENESIS_ENVIRONMENT_LORE_EXCEPTION_UNGROUNDED",
        message: `${exception.kind} must include explicit lore evidence`,
        severity: "error",
        path: "binding.loreExceptions",
      });
    }
  }
}

function validateWeatherCompatibility(
  binding: GenesisEnvironmentBindingState,
  issues: EnvironmentGenesisValidationIssue[],
) {
  const temperatureIndex = effectiveTemperatureIndex(
    binding.climate.temperatureBand,
    binding.season.thermalShift,
  );
  const weather = binding.transient.weather;

  if (
    (weather.condition === "snow" || weather.condition === "sleet") &&
    temperatureIndex > 2 &&
    !hasGroundedException(binding, "weather_temperature")
  ) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_INCOMPATIBLE_WEATHER_TEMPERATURE",
      message:
        "Snow/sleet is incompatible with the effective warm climate unless world lore explicitly supports it",
      severity: "error",
      path: "binding.transient.weather",
    });
  }

  if (
    weather.condition === "heat" &&
    temperatureIndex < 3 &&
    !hasGroundedException(binding, "weather_temperature")
  ) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_INCOMPATIBLE_WEATHER_TEMPERATURE",
      message:
        "Heat weather is incompatible with the effective cold climate unless world lore explicitly supports it",
      severity: "error",
      path: "binding.transient.weather",
    });
  }

  if (
    ["rain", "storm", "drizzle"].includes(weather.condition) &&
    binding.climate.precipitationBand === "rare" &&
    binding.season.moistureShift === "much_drier" &&
    !hasGroundedException(binding, "weather_precipitation")
  ) {
    issues.push({
      code: "GENESIS_ENVIRONMENT_INCOMPATIBLE_WEATHER_PRECIPITATION",
      message:
        "Wet weather conflicts with an extremely dry/rare-precipitation state unless lore explicitly supports it",
      severity: "error",
      path: "binding.transient.weather",
    });
  }
}

function effectiveTemperatureIndex(
  band: ClimateTemperatureBand,
  shift: SeasonThermalShift,
): number {
  const base = CLIMATE_TEMPERATURE_BANDS.indexOf(band);
  return Math.max(
    0,
    Math.min(CLIMATE_TEMPERATURE_BANDS.length - 1, base + THERMAL_DELTA[shift]),
  );
}

function hasGroundedException(
  binding: GenesisEnvironmentBindingState,
  kind: EnvironmentLoreExceptionKind,
): boolean {
  return binding.loreExceptions.some(
    (exception) =>
      exception.kind === kind &&
      exception.reason.trim().length > 0 &&
      exception.sourceRefs.length > 0,
  );
}

function climateFingerprint(climate: GenesisEnvironmentClimateState): string {
  return [
    climate.temperatureBand,
    climate.moistureBand,
    climate.precipitationBand,
    climate.source,
  ].join(":");
}
