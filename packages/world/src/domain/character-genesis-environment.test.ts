import { describe, expect, it } from "vitest";

import {
  applyEnvironmentSeasonUpdate,
  createEnvironmentGenesisState,
  environmentClimateToVector,
  inspectEnvironmentGenesisQuality,
  selectSeasonCandidate,
  validateEnvironmentGenesisState,
  validateEnvironmentTransition,
  type EnvironmentGenesisSuggestionLike,
  type EnvironmentSeasonCandidate,
} from "./character-genesis-environment";

function baseSuggestion(): EnvironmentGenesisSuggestionLike {
  return {
    key: "forest-home",
    title: "Kuzey Ormanı başlangıcı",
    habitat: {
      key: "north-forest",
      displayName: "Kuzey Ormanı",
      regionType: "forest",
      tags: ["pine", "quiet"],
      source: "character_concept",
      sourceRefs: [],
      rationale: "Karakterin geçmişi orman yaşamıyla uyumlu.",
    },
    climate: {
      temperatureBand: "cool",
      moistureBand: "humid",
      precipitationBand: "regular",
      source: "region_climate",
      sourceRefs: ["region:north-forest"],
      rationale: "Bölgenin canonical iklimi serin ve nemli.",
    },
    season: {
      key: "moon-bloom",
      displayName: "Ayçiçeği Mevsimi",
      thermalShift: "warmer",
      moistureShift: "neutral",
      daylightShift: "longer",
      source: "universe_calendar",
      sourceRefs: ["calendar:moon-bloom"],
      rationale: "Evren takvimindeki mevcut mevsim.",
    },
    weather: {
      condition: "clear",
      intensity: "light",
      rationale: "Açılış anında sakin hava.",
    },
    dayPhase: "morning",
    loreExceptions: [],
  };
}

function season(
  source: EnvironmentSeasonCandidate["source"],
  key: string,
): EnvironmentSeasonCandidate {
  return {
    key,
    displayName: key,
    thermalShift: "neutral",
    moistureShift: "neutral",
    daylightShift: "neutral",
    source,
    sourceRefs:
      source === "real_world_soft_hint" ? [] : [`source:${source}:${key}`],
    rationale: `${source} candidate`,
  };
}

describe("Character Genesis environment binding", () => {
  it("supports custom fantasy season vocabulary through canonical semantics", () => {
    const state = createEnvironmentGenesisState({
      seed: "seed-386",
      suggestion: baseSuggestion(),
      worldId: "world-1",
      regionId: "region-1",
      homeId: "home-1",
    });

    expect(state.season).toBe("Ayçiçeği Mevsimi");
    expect(state.binding?.season.key).toBe("moon-bloom");
    expect(state.binding?.season.thermalShift).toBe("warmer");
    expect(inspectEnvironmentGenesisQuality(state).customSeasonSemanticsReady).toBe(
      true,
    );
    expect(validateEnvironmentGenesisState(state)).toEqual([]);
  });

  it("resolves season sources with lore above region, calendar and real-world hints", () => {
    const selected = selectSeasonCandidate([
      season("real_world_soft_hint", "summer"),
      season("universe_calendar", "calendar-winter"),
      season("region_climate", "dry-season"),
      season("world_lore", "long-night"),
    ]);

    expect(selected.source).toBe("world_lore");
    expect(selected.key).toBe("long-night");
  });

  it("does not let a real-world hint override world lore", () => {
    const suggestion = baseSuggestion();
    suggestion.season = season("real_world_soft_hint", "summer");
    const state = createEnvironmentGenesisState({
      seed: "seed-priority",
      suggestion,
      seasonCandidates: [season("world_lore", "crystal-night")],
    });

    expect(state.binding?.season.source).toBe("world_lore");
    expect(state.binding?.season.key).toBe("crystal-night");
    expect(
      validateEnvironmentGenesisState(state).some(
        (issue) => issue.code === "GENESIS_ENVIRONMENT_PRIORITY_VIOLATION",
      ),
    ).toBe(false);
  });

  it("keeps habitat, region and home stable when only season changes", () => {
    const initial = createEnvironmentGenesisState({
      seed: "seed-persistence",
      suggestion: baseSuggestion(),
      worldId: "world-1",
      regionId: "region-1",
      homeId: "home-1",
    });
    const next = applyEnvironmentSeasonUpdate(initial, {
      season: season("universe_calendar", "star-fall"),
      weather: {
        condition: "fog",
        intensity: "light",
        rationale: "Season opening fog",
      },
      dayPhase: "evening",
    });

    expect(next.worldId).toBe("world-1");
    expect(next.regionId).toBe("region-1");
    expect(next.homeId).toBe("home-1");
    expect(next.binding?.habitat.key).toBe("north-forest");
    expect(next.binding?.climate.temperatureBand).toBe("cool");
    expect(next.binding?.transient.weather.condition).toBe("fog");
    expect(validateEnvironmentTransition(initial, next)).toEqual([]);
  });

  it("rejects climate/weather impossibilities unless explicit lore grounds them", () => {
    const suggestion = baseSuggestion();
    suggestion.climate = {
      ...suggestion.climate,
      temperatureBand: "hot",
    };
    suggestion.season = {
      ...suggestion.season,
      thermalShift: "much_warmer",
    };
    suggestion.weather = {
      condition: "snow",
      intensity: "strong",
      rationale: "Unexpected snow",
    };

    const invalid = createEnvironmentGenesisState({
      seed: "seed-hot-snow",
      suggestion,
    });
    expect(
      validateEnvironmentGenesisState(invalid).some(
        (issue) =>
          issue.code ===
          "GENESIS_ENVIRONMENT_INCOMPATIBLE_WEATHER_TEMPERATURE",
      ),
    ).toBe(true);

    suggestion.loreExceptions = [
      {
        kind: "weather_temperature",
        reason: "The Frost Moon causes magical snow regardless of heat.",
        sourceRefs: ["lore:frost-moon"],
      },
    ];
    const grounded = createEnvironmentGenesisState({
      seed: "seed-hot-snow-grounded",
      suggestion,
    });
    expect(
      validateEnvironmentGenesisState(grounded).some(
        (issue) =>
          issue.code ===
          "GENESIS_ENVIRONMENT_INCOMPATIBLE_WEATHER_TEMPERATURE",
      ),
    ).toBe(false);
  });

  it("derives region environment vectors deterministically from semantic climate", () => {
    expect(
      environmentClimateToVector({
        temperatureBand: "warm",
        moistureBand: "dry",
        precipitationBand: "seasonal",
      }),
    ).toEqual({
      temperature: 0.5,
      moisture: -0.5,
      precipitation: 0,
    });
  });
});
