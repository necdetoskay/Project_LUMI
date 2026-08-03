import { describe, it, expect } from "vitest";
import { Home } from "../../src/domain/home";
import { ValidationError } from "../../src/domain/errors";

describe("Home", () => {
  it("creates a permanent home", () => {
    const home = Home.create({
      worldId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      homeType: "permanent",
      displayName: "Coral Cottage",
    });

    const state = home.getState();
    expect(state.homeType).toBe("permanent");
    expect(state.residenceType).toBe("primary");
    expect(state.version).toBe(1);
  });

  it("creates a temporary home with residence type", () => {
    const home = Home.create({
      worldId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      homeType: "temporary",
      displayName: "Mountain Camp",
      residenceType: "secondary",
    });

    expect(home.getState().homeType).toBe("temporary");
    expect(home.getState().residenceType).toBe("secondary");
  });

  it("creates a safe haven", () => {
    const home = Home.create({
      worldId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      homeType: "safe_haven",
      displayName: "Hidden Den",
    });

    expect(home.getState().homeType).toBe("safe_haven");
  });

  it("rejects empty display name", () => {
    expect(() =>
      Home.create({
        worldId: crypto.randomUUID(),
        locationId: crypto.randomUUID(),
        homeType: "permanent",
        displayName: "",
      }),
    ).toThrow(ValidationError);
  });

  it("reconstitutes from saved state", () => {
    const original = Home.create({
      worldId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      homeType: "permanent",
      displayName: "Saved Home",
    });

    const saved = original.getState();
    const reconstituted = Home.fromState(saved);
    expect(reconstituted.getState()).toEqual(saved);
  });

  it("links to the correct location", () => {
    const locationId = crypto.randomUUID();
    const home = Home.create({
      worldId: crypto.randomUUID(),
      locationId,
      homeType: "permanent",
      displayName: "Linked Home",
    });

    expect(home.locationId).toBe(locationId);
  });
});
