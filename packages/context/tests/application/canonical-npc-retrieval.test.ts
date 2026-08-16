import { describe, expect, it } from "vitest";

import {
  CanonicalNpcRetrievalAdapter,
  type CanonicalNpcIdentityReader,
  type CanonicalNpcRuntimeReader,
} from "../../src";

const HOUSEHOLD = "household-safe";
const CHILD = "child-safe";
const WORLD = "world-safe";
const NPC_ID = "npc-internal-123";
const CHARACTER_ID = "character-internal-456";

function query() {
  return {
    householdId: HOUSEHOLD,
    childProfileId: CHILD,
    worldId: WORLD,
    generationIntent: "story_generation",
    query: "nearby helpful NPCs",
    limit: 8,
    sourceKinds: ["npc" as const],
  };
}

describe("CanonicalNpcRetrievalAdapter", () => {
  it("combines scoped runtime + identity authority without leaking internal ids in provider-facing summary", async () => {
    const runtimeReader: CanonicalNpcRuntimeReader = {
      listDecisionReady: async () => [
        {
          npcId: NPC_ID,
          householdId: HOUSEHOLD,
          worldId: WORLD,
          childProfileId: CHILD,
          characterId: CHARACTER_ID,
          locationId: "location-internal-789",
          needTypes: ["belonging", "curiosity"],
          relationshipToCharacter: 0.7,
          lastInteractionAt: new Date("2026-08-16T09:00:00.000Z"),
          updatedAt: new Date("2026-08-16T10:00:00.000Z"),
        },
      ],
    };
    const identityReader: CanonicalNpcIdentityReader = {
      findNpcIdentities: async () => [
        {
          characterId: CHARACTER_ID,
          householdId: HOUSEHOLD,
          childProfileId: CHILD,
          name: "Arin",
          broadKind: "human",
          characterType: "helper",
          subtype: "forest guide",
          originConcept: "A gentle guide from the crystal woods.",
          lifecycleStage: "adulthood",
        },
      ],
    };

    const result = await new CanonicalNpcRetrievalAdapter(
      runtimeReader,
      identityReader,
    ).retrieve(query());

    expect(result.candidates).toHaveLength(1);
    const candidate = result.candidates[0]!;
    expect(candidate.summary).toContain("Arin");
    expect(candidate.summary).toContain("forest guide");
    expect(candidate.summary).toContain("strongly positive");
    expect(candidate.summary).not.toContain(NPC_ID);
    expect(candidate.summary).not.toContain(CHARACTER_ID);
    expect(candidate.summary).not.toContain("location-internal-789");
    expect(candidate.provenance.sourceKind).toBe("npc");
    expect(candidate.stableId).toBe(`npc:${NPC_ID}`);
  });

  it("drops cross-scope runtime records before identity lookup", async () => {
    let requestedIds: string[] = [];
    const runtimeReader: CanonicalNpcRuntimeReader = {
      listDecisionReady: async () => [
        {
          npcId: "safe",
          householdId: HOUSEHOLD,
          worldId: WORLD,
          childProfileId: CHILD,
          characterId: "safe-character",
          locationId: null,
          needTypes: [],
          relationshipToCharacter: 0,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        },
        {
          npcId: "foreign",
          householdId: "other-household",
          worldId: WORLD,
          childProfileId: CHILD,
          characterId: "foreign-character",
          locationId: null,
          needTypes: [],
          relationshipToCharacter: 1,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const identityReader: CanonicalNpcIdentityReader = {
      findNpcIdentities: async (input) => {
        requestedIds = input.characterIds;
        return [];
      },
    };

    await new CanonicalNpcRetrievalAdapter(runtimeReader, identityReader).retrieve(
      query(),
    );

    expect(requestedIds).toEqual(["safe-character"]);
  });

  it("does not query NPC authorities when the retrieval policy excludes npc", async () => {
    let runtimeCalled = false;
    const runtimeReader: CanonicalNpcRuntimeReader = {
      listDecisionReady: async () => {
        runtimeCalled = true;
        return [];
      },
    };
    const identityReader: CanonicalNpcIdentityReader = {
      findNpcIdentities: async () => [],
    };

    const result = await new CanonicalNpcRetrievalAdapter(
      runtimeReader,
      identityReader,
    ).retrieve({ ...query(), sourceKinds: ["memory"] });

    expect(runtimeCalled).toBe(false);
    expect(result).toEqual({ candidates: [], truncated: false });
  });
});
