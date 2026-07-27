import { describe, it, expect } from "vitest";
import { ChildProfile } from "../../src/domain/child-profile";
import { ValidationError } from "../../src/domain/errors";

describe("ChildProfile", () => {
  const householdId = crypto.randomUUID();

  const validInput = {
    id: crypto.randomUUID(),
    householdId,
    displayName: "Alice",
    ageBand: "6-8",
  };

  it("creates a child profile with valid input", () => {
    const profile = ChildProfile.create(validInput);
    const state = profile.getState();
    expect(state.displayName).toBe("Alice");
    expect(state.ageBand).toBe("6-8");
    expect(state.locale).toBe("tr-TR");
    expect(state.deletedAt).toBeNull();
  });

  it("rejects empty display name", () => {
    expect(() =>
      ChildProfile.create({ ...validInput, displayName: "" }),
    ).toThrow(ValidationError);
  });

  it("rejects display name over 120 characters", () => {
    expect(() =>
      ChildProfile.create({ ...validInput, displayName: "x".repeat(121) }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid age band", () => {
    expect(() =>
      ChildProfile.create({ ...validInput, ageBand: "invalid" }),
    ).toThrow(ValidationError);
  });

  it("accepts all valid age bands", () => {
    for (const band of ["3-5", "6-8", "9-12", "13+"] as const) {
      const profile = ChildProfile.create({ ...validInput, ageBand: band });
      expect(profile.getState().ageBand).toBe(band);
    }
  });

  it("supports archive", () => {
    const profile = ChildProfile.create(validInput);
    expect(profile.isArchived()).toBe(false);
    profile.archive();
    expect(profile.isArchived()).toBe(true);
    expect(profile.getState().deletedAt).toBeInstanceOf(Date);
  });

  it("updates display name", () => {
    const profile = ChildProfile.create(validInput);
    profile.updateDisplayName("Bob");
    expect(profile.getState().displayName).toBe("Bob");
  });

  it("updates age band", () => {
    const profile = ChildProfile.create(validInput);
    profile.updateAgeBand("9-12");
    expect(profile.getState().ageBand).toBe("9-12");
  });

  it("updates metadata", () => {
    const profile = ChildProfile.create(validInput);
    profile.updateMetadata({ preferredName: "Ali" });
    expect(profile.getState().metadata.preferredName).toBe("Ali");
  });

  it("sets character origin handoff", () => {
    const profile = ChildProfile.create(validInput);
    profile.setCharacterOriginHandoff({
      childProfileId: validInput.id,
      characterType: "explorer",
      originMode: "manual",
    });
    const handoff = profile.getCharacterOriginHandoff();
    expect(handoff).not.toBeNull();
    expect(handoff!.characterType).toBe("explorer");
    expect(handoff!.originMode).toBe("manual");
  });

  it("prevents character handoff on archived profile", () => {
    const profile = ChildProfile.create(validInput);
    profile.archive();
    expect(() =>
      profile.setCharacterOriginHandoff({
        childProfileId: validInput.id,
        characterType: "explorer",
        originMode: "manual",
      }),
    ).toThrow(ValidationError);
  });

  it("checks household ownership", () => {
    const profile = ChildProfile.create(validInput);
    expect(profile.ownsHousehold(householdId)).toBe(true);
    expect(profile.ownsHousehold(crypto.randomUUID())).toBe(false);
  });

  it("manages preferences", () => {
    const profile = ChildProfile.create(validInput);
    const prefs = profile.getPreferences();
    expect(prefs.storyLength).toBe("medium");
    expect(prefs.interactionLevel).toBe(2);
    expect(prefs.imageEnabled).toBe(true);

    profile.updatePreferences({ storyLength: "long", interactionLevel: 4 });
    const updated = profile.getPreferences();
    expect(updated.storyLength).toBe("long");
    expect(updated.interactionLevel).toBe(4);
  });

  it("rejects invalid preference values", () => {
    const profile = ChildProfile.create(validInput);
    expect(() =>
      profile.updatePreferences({ storyLength: "extra-long" as any }),
    ).toThrow(ValidationError);
  });

  it("reconstructs from saved state", () => {
    const original = ChildProfile.create(validInput);
    const state = original.getState();
    const prefs = original.getPreferences();

    const restored = ChildProfile.fromState(state, prefs);
    expect(restored.getState().displayName).toBe("Alice");
    expect(restored.getPreferences().storyLength).toBe("medium");
  });
});
