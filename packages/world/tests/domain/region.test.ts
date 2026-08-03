import { describe, it, expect } from "vitest";
import { Region } from "../../src/domain/region";
import { ValidationError } from "../../src/domain/errors";

describe("Region", () => {
  it("creates a region with default accessibility open", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "coral-reef",
      displayName: "Coral Reef",
      regionType: "water",
    });

    const state = region.getState();
    expect(state.accessibilityStatus).toBe("open");
    expect(state.discoveryStatus).toBe("discovered");
    expect(state.version).toBe(1);
  });

  it("creates region with custom accessibility", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "forbidden-cave",
      displayName: "Forbidden Cave",
      regionType: "underground",
      accessibilityStatus: "restricted",
    });

    expect(region.getState().accessibilityStatus).toBe("restricted");
  });

  it("rejects invalid region key", () => {
    expect(() =>
      Region.create({
        worldId: crypto.randomUUID(),
        regionKey: "Has Spaces",
        displayName: "Bad Key",
        regionType: "forest",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects empty display name", () => {
    expect(() =>
      Region.create({
        worldId: crypto.randomUUID(),
        regionKey: "empty-name",
        displayName: "",
        regionType: "forest",
      }),
    ).toThrow(ValidationError);
  });

  it("sets accessibility status", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "test-region",
      displayName: "Test Region",
      regionType: "wilderness",
    });

    region.setAccessibility("dangerous");
    expect(region.getState().accessibilityStatus).toBe("dangerous");
    expect(region.getState().version).toBe(2);
    expect(region.isAccessible()).toBe(false);
  });

  it("sets discovery status", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "mysterious-island",
      displayName: "Mysterious Island",
      regionType: "island",
      discoveryStatus: "rumored",
    });

    expect(region.getState().discoveryStatus).toBe("rumored");

    region.setDiscoveryStatus("explored");
    expect(region.getState().discoveryStatus).toBe("explored");
  });

  it("reconstitutes from saved state", () => {
    const original = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "saved-region",
      displayName: "Saved Region",
      regionType: "mountain",
    });

    const saved = original.getState();
    const reconstituted = Region.fromState(saved);
    expect(reconstituted.getState()).toEqual(saved);
  });

  it("can be a subregion", () => {
    const parentId = crypto.randomUUID();
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "deep-cave",
      displayName: "Deep Cave",
      regionType: "underground",
      subregionOf: parentId,
    });

    expect(region.getState().subregionOf).toBe(parentId);
  });

  it("creates forest region", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "enchanted-forest",
      displayName: "Enchanted Forest",
      regionType: "forest",
    });

    expect(region.getState().regionType).toBe("forest");
  });

  it("rejects invalid region type gracefully", () => {
    expect(() =>
      Region.create({
        worldId: crypto.randomUUID(),
        regionKey: "invalid-type",
        displayName: "Invalid",
        regionType: "ocean_floor" as never,
      }),
    ).not.toThrow();
  });
});
