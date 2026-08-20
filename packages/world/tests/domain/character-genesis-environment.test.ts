import { describe, expect, it } from "vitest";

import {
  buildEnvironmentContextProjection,
  resolveGenesisEnvironment,
  validateGenesisEnvironment,
  type GenesisEnvironmentState,
} from "../../src/domain";

function environment(overrides: Partial<GenesisEnvironmentState> = {}): GenesisEnvironmentState {
  return {
    binding: { worldId: "world-1", regionId: "region-1", homeId: "home-1" },
    regionProfile: {
      habitatType: "temperate forest",
      terrain: ["woodland"],
      vegetation: ["oak"],
      waterFeatures: ["stream"],
      environmentalFeatures: ["old stone bridge"],
      climate: {
        climateType: "cool temperate",
        temperatureBand: "cool",
        precipitationBand: "moderate",
        seasonalVariation: "high",
      },
      loreConstraints: [],
    },
    calendar: {
      calendarId: "calendar-1",
      displayName: "Forest Calendar",
      seasons: [
        {
          id: "leafwhisper",
          displayName: "Leafwhisper",
          order: 1,
          semantics: {
            temperatureTrend: "decreasing",
            precipitationTrend: "increasing",
            daylightTrend: "decreasing",
            vegetationPhase: "senescence",
          },
        },
      ],
    },
    temporal: {
      calendarId: "calendar-1",
      seasonId: "leafwhisper",
      seasonPhase: "early",
      source: "world_lore",
    },
    local: {
      weather: "light rain",
      dayPhase: "afternoon",
      localConditions: ["muddy paths"],
      exceptions: [],
    },
    decisionTrace: [],
    ...overrides,
  };
}

describe("character genesis environment", () => {
  it("prefers world lore over real-world calendar", () => {
    const realWorld = environment({
      temporal: {
        calendarId: "calendar-1",
        seasonId: "leafwhisper",
        source: "real_world_soft",
      },
    });
    const lore = environment({
      temporal: {
        calendarId: "calendar-1",
        seasonId: "leafwhisper",
        source: "world_lore",
      },
    });

    const resolved = resolveGenesisEnvironment({
      candidates: [
        { source: "real_world_calendar", state: realWorld },
        { source: "world_lore", state: lore },
      ],
    });

    expect(resolved.temporal.source).toBe("world_lore");
    expect(resolved.decisionTrace[0]).toMatchObject({
      signal: "world_lore",
      accepted: true,
    });
  });

  it("supports custom fantasy seasons through normalized semantics", () => {
    const result = validateGenesisEnvironment(environment());
    expect(result.status).toBe("valid");
    const projection = buildEnvironmentContextProjection(environment());
    expect(projection.temporal.seasonName).toBe("Leafwhisper");
    expect(projection.temporal.semantics?.temperatureTrend).toBe("decreasing");
  });

  it("rejects tropical heavy snow without an exception", () => {
    const state = environment({
      regionProfile: {
        ...environment().regionProfile,
        habitatType: "tropical island",
        climate: {
          climateType: "tropical",
          temperatureBand: "hot",
          precipitationBand: "high",
          seasonalVariation: "low",
        },
      },
      local: {
        weather: "heavy snow",
        localConditions: [],
        exceptions: [],
      },
    });

    expect(validateGenesisEnvironment(state).status).toBe("invalid");
  });

  it("accepts tropical heavy snow only with explicit provenance", () => {
    const state = environment({
      regionProfile: {
        ...environment().regionProfile,
        habitatType: "tropical island",
        climate: {
          climateType: "tropical",
          temperatureBand: "hot",
          precipitationBand: "high",
          seasonalVariation: "low",
        },
      },
      local: {
        weather: "heavy snow",
        localConditions: [],
        exceptions: [
          {
            sourceType: "world_event",
            sourceId: "event-1",
            explanation: "A canonical magical cold front crossed the island.",
          },
        ],
      },
    });

    expect(validateGenesisEnvironment(state).status).toBe(
      "valid_with_explicit_exception",
    );
  });

  it("rejects conflicting canonical home bindings", () => {
    const result = validateGenesisEnvironment(environment(), {
      expectedHomeId: "different-home",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ENVIRONMENT_HOME_BINDING_CONFLICT",
    );
  });

  it("keeps stable state separate from temporal and ephemeral projections", () => {
    const projection = buildEnvironmentContextProjection(environment());
    expect(projection.stable.homeId).toBe("home-1");
    expect(projection.stable.habitat).toBe("temperate forest");
    expect(projection.temporal.seasonId).toBe("leafwhisper");
    expect(projection.ephemeral.weather).toBe("light rain");
  });
});
