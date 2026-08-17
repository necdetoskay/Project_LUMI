import { describe, expect, it } from "vitest";

import { buildGenesisOpportunityWindow } from "@/lib/character-onboarding/living-world-bootstrap.service";
import { InteractionOpportunityGenerator } from "@lumi/npc-intelligence";

const reachedAt = new Date("2026-08-17T10:00:00.000Z");

function generate(relationshipTrust: number) {
  const generator = new InteractionOpportunityGenerator();
  const window = buildGenesisOpportunityWindow({
    foundation: {
      householdId: "household-1",
      characterId: "character-1",
    },
    npcId: "npc-1",
    locationId: "location-1",
    locationName: "Mercan Bahçesi",
    reachedAt,
  });

  return generator.generate({
    npcId: "npc-1",
    householdId: "household-1",
    childProfileId: "child-1",
    window,
    beliefs: [],
    relationshipTrust: { "character-1": relationshipTrust },
    ownedItems: {},
    pendingConditions: {},
    forbiddenOpportunityTypes: [],
    firedCooldownKeys: new Set<string>(),
    expiresAt: new Date("2026-08-24T10:00:00.000Z"),
    seed: "genesis-initial-opportunity",
    maxOpportunities: 1,
  });
}

describe("Genesis initial adventure opportunities", () => {
  it("creates a canonical NPC invitation from a real positive relationship and location", () => {
    const result = generate(0.55);

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]?.opportunityType).toBe("invitation");
    expect(result.opportunities[0]?.sourceNpcId).toBe("npc-1");
    expect(result.opportunities[0]?.reason).toContain("character-1");
    expect(result.opportunities[0]?.evidence).toMatchObject({
      targetNpcId: "character-1",
      trust: 0.55,
      placeFactId: "genesis-location:location-1",
    });
  });

  // Regression: Genesis must never invent a rumor merely to fill a source-family slot.
  it("does not fabricate a rumor when Genesis has not established a belief-backed source", () => {
    const result = generate(0.55);

    expect(
      result.opportunities.some(
        (opportunity) => opportunity.opportunityType === "rumor",
      ),
    ).toBe(false);
    expect(result.reasons).toContain(
      "rumor skipped: no belief-backed rumor source",
    );
  });

  it("does not create an NPC call for a non-positive relationship", () => {
    const result = generate(0);

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]?.opportunityType).toBe("quest_seed");
    expect(
      result.opportunities.some((opportunity) =>
        ["invitation", "social_visit", "gift"].includes(
          opportunity.opportunityType,
        ),
      ),
    ).toBe(false);
  });
});
