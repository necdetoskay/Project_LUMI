import { describe, expect, it } from "vitest";
import { calculateDecayIntensity } from "./decay-intensity";

describe("decay intensity", () => {
  it("keeps full intensity during initial period", () => {
    expect(
      calculateDecayIntensity({
        dayOffset: 1,
        fullIntensityDays: 2,
        minimumIntensity: 0.1,
        maxCatchUpDays: 10,
      }),
    ).toBe(1);
  });

  it("never falls below minimum intensity", () => {
    expect(
      calculateDecayIntensity({
        dayOffset: 10,
        fullIntensityDays: 1,
        minimumIntensity: 0.1,
        maxCatchUpDays: 10,
      }),
    ).toBe(0.1);
  });
});
