import { describe, expect, it } from "vitest";

import {
  validateEnvironmentGenesisSuggestion,
  type EnvironmentGenesisSuggestion,
} from "./environment-genesis.service";

function candidate(): EnvironmentGenesisSuggestion {
  return {
    key: "forest-home",
    title: "Forest home",
    habitat: {
      key: "forest",
      displayName: "Forest",
      regionType: "forest",
      tags: ["pine"],
      source: "character_concept",
      sourceRefs: [],
      rationale: "Fits the character concept",
    },
    climate: {
      temperatureBand: "cool",
      moistureBand: "humid",
      precipitationBand: "regular",
      source: "region_climate",
      sourceRefs: ["region:forest"],
      rationale: "Canonical region climate",
    },
    season: {
      key: "moon-bloom",
      displayName: "Moon Bloom",
      thermalShift: "warmer",
      moistureShift: "neutral",
      daylightShift: "longer",
      source: "universe_calendar",
      sourceRefs: ["calendar:moon-bloom"],
      rationale: "Universe calendar",
    },
    weather: {
      condition: "clear",
      intensity: "light",
      rationale: "Calm opening weather",
    },
    dayPhase: "morning",
    loreExceptions: [],
  };
}

describe("Environment Genesis generation validation", () => {
  it("accepts grounded semantic environment candidates", () => {
    expect(validateEnvironmentGenesisSuggestion(candidate())).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("requires evidence when lore or region claims authority", () => {
    const value = candidate();
    value.climate.sourceRefs = [];
    value.season.source = "world_lore";
    value.season.sourceRefs = [];

    const validation = validateEnvironmentGenesisSuggestion(value);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ENVIRONMENT_GENESIS_CLIMATE_SOURCE_REQUIRED",
        "ENVIRONMENT_GENESIS_SEASON_SOURCE_REQUIRED",
      ]),
    );
  });

  it("treats real-world season as a soft warning, not canonical authority", () => {
    const value = candidate();
    value.season.source = "real_world_soft_hint";
    value.season.sourceRefs = [];

    const validation = validateEnvironmentGenesisSuggestion(value);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        code: "ENVIRONMENT_GENESIS_REAL_WORLD_SOFT_ONLY",
        severity: "warning",
      }),
    );
  });

  it("rejects ungrounded lore exceptions", () => {
    const value = candidate();
    value.loreExceptions = [
      {
        kind: "weather_temperature",
        reason: "Magic snow",
        sourceRefs: [],
      },
    ];

    expect(validateEnvironmentGenesisSuggestion(value).valid).toBe(false);
  });
});
