import { describe, it, expect } from "vitest";
import { World } from "../../src/domain/world";
import { ValidationError } from "../../src/domain/errors";

describe("World", () => {
  const validInput = {
    householdId: crypto.randomUUID(),
    childProfileId: crypto.randomUUID(),
    characterId: crypto.randomUUID(),
    universeSeed: "test-universe-seed-123",
    originSeed: "test-origin-seed-456",
    acceptedCandidateSeed: "test-candidate-seed-789",
    generatorVersion: "v1.0.0",
    vectorVersion: "v1.0.0",
    originConcept: "A brave fox in an enchanted forest",
  };

  it("creates a world with active lifecycle status", () => {
    const world = World.create(validInput);
    const state = world.getState();

    expect(state.lifecycleStatus).toBe("active");
    expect(state.version).toBe(1);
    expect(state.archivedAt).toBeNull();
    expect(state.householdId).toBe(validInput.householdId);
    expect(state.characterId).toBe(validInput.characterId);
  });

  it("generates a unique id for each world", () => {
    const world1 = World.create(validInput);
    const world2 = World.create(validInput);

    expect(world1.getState().id).not.toBe(world2.getState().id);
  });

  it("rejects empty universe seed", () => {
    expect(() =>
      World.create({ ...validInput, universeSeed: "" }),
    ).toThrow(ValidationError);
  });

  it("rejects empty origin seed", () => {
    expect(() =>
      World.create({ ...validInput, originSeed: "" }),
    ).toThrow(ValidationError);
  });

  it("creates world with metadata containing originConcept", () => {
    const world = World.create(validInput);
    expect(world.getState().metadata.originConcept).toBe(validInput.originConcept);
  });

  it("archives an active world", () => {
    const world = World.create(validInput);
    expect(world.isActive()).toBe(true);

    world.archive();
    const state = world.getState();

    expect(state.lifecycleStatus).toBe("archived");
    expect(state.archivedAt).toBeInstanceOf(Date);
    expect(state.version).toBe(2);
    expect(world.isActive()).toBe(false);
  });

  it("rejects archive of already archived world", () => {
    const world = World.create(validInput);
    world.archive();

    expect(() => world.archive()).toThrow(ValidationError);
    expect(() => world.archive()).toThrow("already archived");
  });

  it("reconstitutes from saved state", () => {
    const original = World.create(validInput);
    const savedState = original.getState();

    const reconstituted = World.fromState(savedState);
    expect(reconstituted.getState()).toEqual(savedState);
    expect(reconstituted.id).toBe(original.id);
  });

  it("produces bootstrap manifest", () => {
    const world = World.create(validInput);
    const manifest = world.toBootstrapManifest({ name: "test" });

    expect(manifest.universeSeed).toBe(validInput.universeSeed);
    expect(manifest.originSeed).toBe(validInput.originSeed);
    expect(manifest.originPackagePayload).toEqual({ name: "test" });
  });
});

describe("World - origin-led bootstrap affinities", () => {
  it("creates world for sea creature origin", () => {
    const world = World.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "sea-creature-seed-001",
      originSeed: "origin-sea-001",
      acceptedCandidateSeed: "candidate-sea-001",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originConcept: "A curious young fish exploring a coral reef",
    });

    expect(world.getState().lifecycleStatus).toBe("active");
    expect(world.getState().universeSeed).toBe("sea-creature-seed-001");
  });

  it("archived world cannot start new sessions", () => {
    const world = World.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "dragon-seed-001",
      originSeed: "origin-dragon-001",
      acceptedCandidateSeed: "candidate-dragon-001",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originConcept: "A young dragon in a volcanic mountain",
    });

    world.archive();
    expect(world.isActive()).toBe(false);
  });
});
