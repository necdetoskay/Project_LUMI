import { describe, expect, it, vi } from "vitest";

import {
  PersistedOriginPackageSource,
  type AcceptedOriginPackageReader,
  type AcceptedOriginPackageRecord,
} from "../../src/adapters";
import type { ContextRequest } from "../../src/ports";

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

const request: ContextRequest = {
  householdId: "house-1",
  childProfileId: "child-1",
  worldId: "world-1",
  generationIntent: "story_scene",
};

describe("PersistedOriginPackageSource", () => {
  it("reads the accepted package in household/profile scope and maps the canonical context item", async () => {
    const findAcceptedByChildProfile = vi
      .fn<AcceptedOriginPackageReader["findAcceptedByChildProfile"]>()
      .mockResolvedValue(accepted);

    const result = await new PersistedOriginPackageSource({
      findAcceptedByChildProfile,
    }).fetch(request);

    expect(findAcceptedByChildProfile).toHaveBeenCalledWith(
      "child-1",
      "house-1",
    );
    expect(result.sourceRelevance).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "origin-package:child-1",
      type: "origin-package",
      sourceEngine: "profiles/accepted-origin-package",
      scope: "world_truth",
      content: {
        originType: accepted.originConcept,
        dominantVectors: [...accepted.toneVector, ...accepted.noveltyMarkers],
        startingHome: `${accepted.startingLocation} — ${accepted.homeArchetype}`,
        nearbyNpcSeeds: [accepted.nearbyNpcSeed],
        firstMystery: accepted.firstMysterySeed,
      },
    });
    expect(result.items[0]?.text).toContain(accepted.universeSeed);
  });

  it("returns no context when no accepted origin package exists", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => null,
    };

    await expect(
      new PersistedOriginPackageSource(reader).fetch(request),
    ).resolves.toEqual({ items: [], sourceRelevance: 0 });
  });

  it("fails closed when a reader returns a record outside the requested scope", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => ({
        ...accepted,
        householdId: "other-house",
      }),
    };

    await expect(
      new PersistedOriginPackageSource(reader).fetch(request),
    ).resolves.toEqual({ items: [], sourceRelevance: 0 });
  });

  it("returns defensive copies of canonical array fields", async () => {
    const reader: AcceptedOriginPackageReader = {
      findAcceptedByChildProfile: async () => accepted,
    };
    const result = await new PersistedOriginPackageSource(reader).fetch(
      request,
    );
    const content = result.items[0]?.content;

    expect(content).toBeDefined();
    expect(content?.dominantVectors).not.toBe(accepted.toneVector);
    expect(content?.nearbyNpcSeeds).not.toBeUndefined();
  });
});
