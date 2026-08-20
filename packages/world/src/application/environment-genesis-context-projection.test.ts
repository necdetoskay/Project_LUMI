import { describe, expect, it } from "vitest";

import { createEnvironmentGenesisState } from "../domain";
import {
  projectEnvironmentGenesisContext,
  projectEnvironmentRegionClimate,
} from "./environment-genesis-context-projection";

describe("Environment Genesis context projection", () => {
  it("separates persistent climate/location from transient current conditions", () => {
    const environment = createEnvironmentGenesisState({
      seed: "context-seed",
      worldId: "world-1",
      regionId: "region-1",
      homeId: "home-1",
      suggestion: {
        key: "forest",
        title: "Forest",
        habitat: {
          key: "north-forest",
          displayName: "North Forest",
          regionType: "forest",
          tags: ["pine"],
          source: "character_concept",
          sourceRefs: [],
          rationale: "Character fit",
        },
        climate: {
          temperatureBand: "cool",
          moistureBand: "humid",
          precipitationBand: "regular",
          source: "region_climate",
          sourceRefs: ["region:north-forest"],
          rationale: "Region climate",
        },
        season: {
          key: "moon-bloom",
          displayName: "Moon Bloom",
          thermalShift: "warmer",
          moistureShift: "neutral",
          daylightShift: "longer",
          source: "universe_calendar",
          sourceRefs: ["calendar:moon-bloom"],
          rationale: "Calendar",
        },
        weather: {
          condition: "fog",
          intensity: "light",
          rationale: "Opening weather",
        },
        dayPhase: "morning",
        loreExceptions: [],
      },
    });

    const context = projectEnvironmentGenesisContext(environment);
    expect(context?.persistent.regionId).toBe("region-1");
    expect(context?.persistent.climate.environmentVector).toEqual({
      temperature: -0.3,
      moisture: 0.55,
      precipitation: 0.55,
    });
    expect(context?.current.season.key).toBe("moon-bloom");
    expect(context?.current.weather.condition).toBe("fog");
    expect(context?.current.dayPhase).toBe("morning");

    const region = projectEnvironmentRegionClimate(environment);
    expect(region).toEqual({
      regionId: "region-1",
      environmentVector: {
        temperature: -0.3,
        moisture: 0.55,
        precipitation: 0.55,
      },
      climateSource: "region_climate",
    });
  });
});
