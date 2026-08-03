import { describe, it, expect } from "vitest";
import { Location } from "../../src/domain/location";
import { ValidationError } from "../../src/domain/errors";

describe("Location", () => {
  it("creates a location with default safe accessibility", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "coral-house-1",
      displayName: "Coral House",
      locationType: "coral_house",
    });

    const state = location.getState();
    expect(state.accessibilityStatus).toBe("open");
    expect(state.safetyLevel).toBe("safe");
    expect(state.occupancyLevel).toBe("empty");
    expect(state.isHome).toBe(false);
    expect(state.version).toBe(1);
  });

  it("rejects invalid location key", () => {
    expect(() =>
      Location.create({
        worldId: crypto.randomUUID(),
        regionId: crypto.randomUUID(),
        locationKey: "UPPERCASE KEY",
        displayName: "Bad Key",
        locationType: "room",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects empty display name", () => {
    expect(() =>
      Location.create({
        worldId: crypto.randomUUID(),
        regionId: crypto.randomUUID(),
        locationKey: "empty-name",
        displayName: "",
        locationType: "room",
      }),
    ).toThrow(ValidationError);
  });

  it("marks a location as home", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "my-home",
      displayName: "Cozy Home",
      locationType: "building",
    });

    expect(location.isHome).toBe(false);
    location.markAsHome();
    expect(location.getState().isHome).toBe(true);
    expect(location.getState().version).toBe(2);
    expect(location.isHome).toBe(true);
  });

  it("sets accessibility status", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "blocked-path",
      displayName: "Blocked Path",
      locationType: "path",
    });

    location.setAccessibility("blocked");
    expect(location.getState().accessibilityStatus).toBe("blocked");
    expect(location.isAccessible()).toBe(false);
  });

  it("reconstitutes from saved state", () => {
    const original = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "saved-location",
      displayName: "Saved Location",
      locationType: "town_square",
    });

    const saved = original.getState();
    const reconstituted = Location.fromState(saved);
    expect(reconstituted.getState()).toEqual(saved);
  });

  it("creates a reef location", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "bright-reef",
      displayName: "Bright Reef",
      locationType: "reef",
      safetyLevel: "safe",
      occupancyLevel: "moderate",
    });

    expect(location.getState().locationType).toBe("reef");
    expect(location.getState().safetyLevel).toBe("safe");
    expect(location.getState().occupancyLevel).toBe("moderate");
  });

  it("creates a cave location", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "glow-cave",
      displayName: "Glowing Cave",
      locationType: "cave",
      safetyLevel: "caution",
      accessibilityStatus: "restricted",
    });

    expect(location.getState().locationType).toBe("cave");
    expect(location.getState().safetyLevel).toBe("caution");
    expect(location.getState().accessibilityStatus).toBe("restricted");
  });
});
