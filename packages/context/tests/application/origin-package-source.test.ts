import { describe, expect, it, vi } from "vitest";

import {
  PersistedOriginPackageSource,
  type AcceptedOriginPackageReader,
  type AcceptedOriginPackageRecord,
} from "../../src/adapters";

const accepted: AcceptedOriginPackageRecord = {
  householdId: "house-1",
  childProfileId: "child-1",
  originConcept: "A guardian born from a singing crystal.",
  startingLocation: "Crystal Cave",
  homeArchetype: "Hidden grotto",
  nearbyNpcSeed: "A patient glow-moth keeper",
  firstMysterySeed: "Why did the cave stop singing?",
  universeSeed: "Floating islands above a luminous ocean",
  toneVector: ["wonder", "gentle mystery"],
  noveltyMarkers: ["singing-crystal", "glow-moth"],
};

describe("PersistedOriginPackageSource", () => {
  it("reads the accepted package in household/profile scope and maps the canonical fields", async () => {
    const findAcceptedByChildProfile = vi
      .fn<AcceptedOriginPackageReader["findAcceptedByChildProfile"]>()
      .mockResolvedValue(accepted);

    const result = await new PersistedOriginPackageSource({
      findAcceptedByChildProfile,
    }).getOriginPackage("house-1", "child-1");

    expect(findAcceptedByChildProfile).toHaveBeenCalledWith(
      "child-1",
      "house-1",
    );
    expect(result).toEqual({
      items: [
        {
          originConcept: accepted.originConcept,
          startingLocation: accepted.startingLocation,
          homeArchetype: accepted.homeArchetype,
          nearbyNpcSeed: accepted.nearbyNpcSeed,
          firstMysterySeed: accepted.firstMysterySeed,
          universeSeed: accepted.universeSeed,
          toneVector: accepted.toneVector,
          noveltyMarkers: accepted.noveltyMarkers,
        },
      ],
    });
  });

  it("returns no context when no accepted origin package exists", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => null,
    };

    await expect(
      new PersistedOriginPackageSource(reader).getOriginPackage(
        "house-1",
        "child-1",
      ),
    ).resolves.toEqual({ items: [] });
  });

  it("fails closed when a reader returns a record outside the requested scope", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => ({
        ...accepted,
        householdId: "other-house",
      }),
    };

    await expect(
      new PersistedOriginPackageSource(reader).getOriginPackage(
        "house-1",
        "child-1",
      ),
    ).resolves.toEqual({ items: [] });
  });

  it("returns defensive copies of array fields", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => accepted,
    };
    const result = await new PersistedOriginPackageSource(
      reader,
    ).getOriginPackage("house-1", "child-1");
    const item = result.items[0];

    expect(item).toBeDefined();
    expect(item?.toneVector).not.toBe(accepted.toneVector);
    expect(item?.noveltyMarkers).not.toBe(accepted.noveltyMarkers);
  });
});
