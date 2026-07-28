import { describe, it, expect } from "vitest";
import { LumiCharacter, validateSafetyBounds, matchesOriginPackageContract } from "../../src/domain";
import { ValidationError } from "../../src/domain/errors";

describe("LumiCharacter", () => {
  const SAFE_BASE = {
    id: "20c2d118-2b14-4ef1-9082-2ec6d2d99401",
    childProfileId: "9a3c1f5c-8b15-4f03-9d07-7f0e2f6d5c7a",
    householdId: "aa3c1f5c-8b15-4f03-9d07-7f0e2f6d5c7a",
    broadKind: "human" as const,
    characterType: "explorer" as const,
    originMode: "auto" as const,
    firstOriginPackageId: "66c5b5bb-4b65-4d9f-b7d5-bc0a2c6d77be",
    safetyBounds: {
      ageBand: "6-8" as const,
      contentBoundary: "moderate" as const,
      requireParentApprovalForAi: false,
    },
  } as const;

  it("creates character with minimum valid fields", () => {
    const c = LumiCharacter.create({
      ...SAFE_BASE,
      name: "Lumi Star",
      subtype: "yıldız kaşifi çocuk",
      originConcept: "Ormanda yeni bir macera aramak.",
      startingRegionArchetype: "orman kenarı",
      startingLocation: "güvenli orman girişi",
      homeArchetype: "ağaç ev",
      nearbyNpcSeed: "anahtarı unutan bekçi",
      firstMysterySeed: "şarkı söyleyen fırtına",
      universeSeed: "lumi-seed-12345",
    });

    const state = c.getState();
    expect(state.name).toBe("Lumi Star");
    expect(state.characterType).toBe("explorer");
    expect(state.broadKind).toBe("human");
    expect(state.safetyBounds.ageBand).toBe("6-8");
    expect(state.deletedAt).toBeNull();
    expect(c.isArchived()).toBe(false);
  });

  it("rejects empty character name", () => {
    expect(() =>
      LumiCharacter.create({
        ...SAFE_BASE,
        name: "   ",
        subtype: "yıldız kaşifi çocuk",
        originConcept: "Ormanda yeni bir macera aramak.",
        startingRegionArchetype: "orman kenarı",
        startingLocation: "güvenli orman girişi",
        homeArchetype: "ağaç ev",
        nearbyNpcSeed: "anahtarı unutan bekçi",
        firstMysterySeed: "şarkı söyleyen fırtına",
        universeSeed: "lumi-seed-12345",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects name longer than 120 chars", () => {
    expect(() =>
      LumiCharacter.create({
        ...SAFE_BASE,
        name: "x".repeat(121),
        subtype: "yıldız kaşifi çocuk",
        originConcept: "Ormanda yeni bir macera aramak.",
        startingRegionArchetype: "orman kenarı",
        startingLocation: "güvenli orman girişi",
        homeArchetype: "ağaç ev",
        nearbyNpcSeed: "anahtarı unutan bekçi",
        firstMysterySeed: "şarkı söyleyen fırtına",
        universeSeed: "lumi-seed-12345",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid origin mode in handoff validation", () => {
    expect(() =>
      LumiCharacter.create({
        ...SAFE_BASE,
        originMode: "weird-mode" as never,
        name: "Lumi",
        subtype: "yıldız kaşifi çocuk",
        originConcept: "Ormanda yeni bir macera aramak.",
        startingRegionArchetype: "orman kenarı",
        startingLocation: "güvenli orman girişi",
        homeArchetype: "ağaç ev",
        nearbyNpcSeed: "anahtarı unutan bekçi",
        firstMysterySeed: "şarkı söyleyen fırtına",
        universeSeed: "lumi-seed-12345",
      }),
    ).toThrow(ValidationError);
  });

  it("archives a character", () => {
    const c = LumiCharacter.create({
      ...SAFE_BASE,
      name: "Lumi",
      subtype: "yıldız kaşifi çocuk",
      originConcept: "Ormanda yeni bir macera aramak.",
      startingRegionArchetype: "orman kenarı",
      startingLocation: "güvenli orman girişi",
      homeArchetype: "ağaç ev",
      nearbyNpcSeed: "anahtarı unutan bekçi",
      firstMysterySeed: "şarkı söyleyen fırtına",
      universeSeed: "lumi-seed-12345",
    });
    c.archive();
    expect(c.isArchived()).toBe(true);
    expect(c.getState().deletedAt).not.toBeNull();
  });

  it("renames with trim and length limits", () => {
    const c = LumiCharacter.create({
      ...SAFE_BASE,
      name: "  Lumi   ",
      subtype: "yıldız kaşifi çocuk",
      originConcept: "Ormanda yeni bir macera aramak.",
      startingRegionArchetype: "orman kenarı",
      startingLocation: "güvenli orman girişi",
      homeArchetype: "ağaç ev",
      nearbyNpcSeed: "anahtarı unutan bekçi",
      firstMysterySeed: "şarkı söyleyen fırtına",
      universeSeed: "lumi-seed-12345",
    });
    expect(c.getState().name).toBe("Lumi");
    c.rename("  Yeni Isim  ");
    expect(c.getState().name).toBe("Yeni Isim");
    expect(() => c.rename("")).toThrow(ValidationError);
    expect(() => c.rename("x".repeat(121))).toThrow(ValidationError);
  });

  it("fromState preserves identity", () => {
    const c = LumiCharacter.create({
      ...SAFE_BASE,
      name: "Lumi",
      subtype: "yıldız kaşifi çocuk",
      originConcept: "Ormanda yeni bir macera aramak.",
      startingRegionArchetype: "orman kenarı",
      startingLocation: "güvenli orman girişi",
      homeArchetype: "ağaç ev",
      nearbyNpcSeed: "anahtarı unutan bekçi",
      firstMysterySeed: "şarkı söyleyen fırtına",
      universeSeed: "lumi-seed-12345",
    });
    const from = LumiCharacter.fromState(c.getState());
    expect(from.getState().id).toBe(c.getState().id);
  });
});

describe("validateSafetyBounds", () => {
  it("throws when age band does not match profile ageBand", () => {
    expect(() =>
      validateSafetyBounds(
        {
          ageBand: "3-5",
          contentBoundary: "strict",
          requireParentApprovalForAi: false,
        },
        "6-8",
      ),
    ).toThrow(ValidationError);
  });

  it("accepts matching age bands", () => {
    expect(() =>
      validateSafetyBounds(
        {
          ageBand: "6-8",
          contentBoundary: "moderate",
          requireParentApprovalForAi: true,
        },
        "6-8",
      ),
    ).not.toThrow();
  });
});

describe("matchesOriginPackageContract", () => {
  it("throws on missing childProfileId", () => {
    expect(() =>
      matchesOriginPackageContract({
        id: "pkg-1",
        childProfileId: "",
        broadKind: "human",
        characterType: "explorer",
        subtype: "yıldız kaşifi çocuk",
        originConcept: "Macera.",
        startingRegionArchetype: "orman",
        startingLocation: "giris",
        homeArchetype: "ev",
        nearbyNpcSeed: "npc",
        firstMysterySeed: "mystery",
        toneVector: ["wonder"],
        safetyBounds: {
          ageBand: "3-5",
          contentBoundary: "strict",
          requireParentApprovalForAi: false,
        },
        noveltyMarkers: ["ucurtma"],
        originMode: "auto",
        universeSeed: "seed123",
        createdBy: "system",
      }),
    ).toThrow(ValidationError);
  });

  it("accepts valid origin package", () => {
    expect(() =>
      matchesOriginPackageContract({
        id: "pkg-1",
        childProfileId: "child-1",
        broadKind: "human",
        characterType: "explorer",
        subtype: "yıldız kaşifi çocuk",
        originConcept: "Ormanda yeni bir macera aramak. ".repeat(5).trim(),
        startingRegionArchetype: "orman",
        startingLocation: "giris",
        homeArchetype: "ev",
        nearbyNpcSeed: "npc",
        firstMysterySeed: "mystery",
        toneVector: ["wonder"],
        safetyBounds: {
          ageBand: "3-5",
          contentBoundary: "strict",
          requireParentApprovalForAi: false,
        },
        noveltyMarkers: ["ucurtma"],
        originMode: "auto",
        universeSeed: "seed-123",
        createdBy: "system",
      }),
    ).not.toThrow();
  });
});
