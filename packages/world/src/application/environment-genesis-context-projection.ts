import type { EnvironmentGenesisState } from "../domain";

export interface EnvironmentGenesisContextProjection {
  persistent: {
    worldId: string | null;
    regionId: string | null;
    homeId: string | null;
    habitat: {
      key: string;
      displayName: string;
      regionType: string;
      tags: string[];
    };
    climate: {
      temperatureBand: string;
      moistureBand: string;
      precipitationBand: string;
      environmentVector: Record<string, number>;
    };
  };
  current: {
    season: {
      key: string;
      displayName: string;
      thermalShift: string;
      moistureShift: string;
      daylightShift: string;
    };
    weather: {
      condition: string;
      intensity: string;
      customLabel?: string;
    };
    dayPhase: string;
  };
  resolution: {
    climateSource: string;
    seasonSource: string;
  };
}

export interface EnvironmentRegionClimateProjection {
  regionId: string | null;
  environmentVector: Record<string, number>;
  climateSource: string;
}

/**
 * Stable Context Assembly projection for #387. It deliberately keeps
 * persistent location/climate facts separate from short-lived season/weather.
 */
export function projectEnvironmentGenesisContext(
  environment: EnvironmentGenesisState,
): EnvironmentGenesisContextProjection | null {
  const binding = environment.binding;
  if (!binding) return null;

  return {
    persistent: {
      worldId: environment.worldId ?? null,
      regionId: environment.regionId ?? null,
      homeId: environment.homeId ?? null,
      habitat: {
        key: binding.habitat.key,
        displayName: binding.habitat.displayName,
        regionType: binding.habitat.regionType,
        tags: [...binding.habitat.tags],
      },
      climate: {
        temperatureBand: binding.climate.temperatureBand,
        moistureBand: binding.climate.moistureBand,
        precipitationBand: binding.climate.precipitationBand,
        environmentVector: { ...binding.climate.environmentVector },
      },
    },
    current: {
      season: {
        key: binding.season.key,
        displayName: binding.season.displayName,
        thermalShift: binding.season.thermalShift,
        moistureShift: binding.season.moistureShift,
        daylightShift: binding.season.daylightShift,
      },
      weather: {
        condition: binding.transient.weather.condition,
        intensity: binding.transient.weather.intensity,
        ...(binding.transient.weather.customLabel
          ? { customLabel: binding.transient.weather.customLabel }
          : {}),
      },
      dayPhase: binding.transient.dayPhase,
    },
    resolution: {
      climateSource: binding.provenance.climateResolution.selectedSource,
      seasonSource: binding.provenance.seasonResolution.selectedSource,
    },
  };
}

/**
 * Projection used by the later canonical commit/handoff to populate or compare
 * Region.environmentVector without exposing transient season/weather state.
 */
export function projectEnvironmentRegionClimate(
  environment: EnvironmentGenesisState,
): EnvironmentRegionClimateProjection | null {
  const binding = environment.binding;
  if (!binding) return null;
  return {
    regionId: environment.regionId ?? null,
    environmentVector: { ...binding.climate.environmentVector },
    climateSource: binding.provenance.climateResolution.selectedSource,
  };
}
