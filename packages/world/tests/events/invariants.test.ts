import { describe, it, expect } from "vitest";
import { World } from "../../src/domain/world";
import { Region } from "../../src/domain/region";
import { Location } from "../../src/domain/location";
import { Home } from "../../src/domain/home";

describe("World invariants", () => {
  it("a world in 'active' status must have at least one region", () => {
    const world = World.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "seed-1",
      originSeed: "origin-1",
      acceptedCandidateSeed: "candidate-1",
      generatorVersion: "v1",
      vectorVersion: "v1",
      originConcept: "Test world",
    });

    const worldState = world.getState();
    expect(worldState.lifecycleStatus).toBe("active");
    expect(worldState.childProfileId).toBeTruthy();
  });

  it("world version starts at 1", () => {
    const world = World.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "seed-2",
      originSeed: "origin-2",
      acceptedCandidateSeed: "candidate-2",
      generatorVersion: "v1",
      vectorVersion: "v1",
      originConcept: "Version test",
    });

    expect(world.getState().version).toBe(1);
  });

  it("archived world cannot be revived", () => {
    const world = World.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "seed-3",
      originSeed: "origin-3",
      acceptedCandidateSeed: "candidate-3",
      generatorVersion: "v1",
      vectorVersion: "v1",
      originConcept: "Archive test",
    });

    world.archive();
    expect(world.getState().lifecycleStatus).toBe("archived");

    expect(() => world.archive()).toThrow(/already archived/i);
  });

  it("region key collision detection at domain level", () => {
    const regions = new Map<string, string>();
    const worldId = crypto.randomUUID();
    const region1 = Region.create({
      worldId,
      regionKey: "forest",
      displayName: "Enchanted Forest",
      regionType: "forest",
      accessibilityStatus: "open",
      discoveryStatus: "discovered",
      sortOrder: 0,
    });
    regions.set(region1.getState().regionKey, region1.id);

    const region2 = Region.create({
      worldId,
      regionKey: "forest",
      displayName: "Another Forest",
      regionType: "forest",
      accessibilityStatus: "open",
      discoveryStatus: "unknown",
      sortOrder: 1,
    });

    expect(regions.has(region2.getState().regionKey)).toBe(true);
    expect(region2.id).not.toBe(region1.id);
  });

  it("location key collision detection at domain level", () => {
    const keys = new Set<string>();
    const worldId = crypto.randomUUID();
    const regionId = crypto.randomUUID();

    const loc1 = Location.create({
      worldId,
      regionId,
      locationKey: "clearing",
      displayName: "Sunny Clearing",
      accessibilityStatus: "open",
      locationType: "path",
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });
    keys.add(loc1.getState().locationKey);

    const loc2 = Location.create({
      worldId,
      regionId,
      locationKey: "clearing",
      displayName: "Moonlit Clearing",
      accessibilityStatus: "open",
      locationType: "path",
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });

    expect(keys.has(loc2.getState().locationKey)).toBe(true);
    expect(loc2.id).not.toBe(loc1.id);
  });

  it("marking location as home updates state correctly", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "home-base",
      displayName: "Home Base",
      accessibilityStatus: "open",
      locationType: "settlement",
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });

    const beforeVersion = location.version;
    location.markAsHome();

    expect(location.isHome).toBe(true);
    expect(location.version).toBe(beforeVersion + 1);
  });

  it("setAccessibility updates status and increments version", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "blocked-spot",
      displayName: "Blocked Spot",
      accessibilityStatus: "open",
      locationType: "path",
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });

    const beforeVersion = location.version;
    location.setAccessibility("blocked");

    expect(location.getState().accessibilityStatus).toBe("blocked");
    expect(location.version).toBe(beforeVersion + 1);
  });

  it("isAccessible returns false for non-open locations", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "danger-zone",
      displayName: "Danger Zone",
      accessibilityStatus: "open",
      locationType: "cave",
      occupancyLevel: "empty",
      safetyLevel: "dangerous",
      isHome: false,
    });

    expect(location.isAccessible()).toBe(true);
    location.setAccessibility("blocked");
    expect(location.isAccessible()).toBe(false);
  });

  it("home must reference a valid location within the same world", () => {
    const worldId = crypto.randomUUID();
    const locationId = crypto.randomUUID();

    const home = Home.create({
      worldId,
      locationId,
      homeType: "permanent",
      displayName: "Cozy Cottage",
      residenceType: "primary",
    });

    expect(home.worldId).toBe(worldId);
    expect(home.locationId).toBe(locationId);
    expect(home.getState().residenceType).toBe("primary");
  });

  it("character location version increments on update", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "same-spot",
      displayName: "Same Spot",
      accessibilityStatus: "open",
      locationType: "path",
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });

    expect(location.version).toBe(1);
    location.markAsHome();
    expect(location.version).toBe(2);
  });

  it("starting region must be discoverable", () => {
    const region = Region.create({
      worldId: crypto.randomUUID(),
      regionKey: "starting-area",
      displayName: "Starting Area",
      regionType: "settlement",
      accessibilityStatus: "open",
      discoveryStatus: "discovered",
      sortOrder: 0,
    });

    expect(region.getState().discoveryStatus).toBe("discovered");
    expect(region.getState().accessibilityStatus).toBe("open");
  });

  it("character location and home location can be the same", () => {
    const location = Location.create({
      worldId: crypto.randomUUID(),
      regionId: crypto.randomUUID(),
      locationKey: "home-sweet-home",
      displayName: "Home Sweet Home",
      accessibilityStatus: "open",
      locationType: "settlement",
      occupancyLevel: "sparse",
      safetyLevel: "safe",
      isHome: false,
    });

    location.markAsHome();
    expect(location.isHome).toBe(true);
    expect(location.getState().occupancyLevel).toBe("sparse");
  });
});
