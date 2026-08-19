import { describe, expect, it } from "vitest";

import {
  validateSocialGenesisSuggestion,
  type SocialGenesisSuggestion,
} from "./social-genesis.service";

function baseSuggestion(): SocialGenesisSuggestion {
  return {
    key: "social-1",
    title: "Warm village circle",
    characterIdentityKey: "mira",
    npcs: [
      {
        identityKey: "toma-usta",
        displayName: "Toma Usta",
        role: "mentor",
        source: "origin",
        originFactIds: ["fact-bakery"],
        personality: {
          traits: ["patient", "warm"],
          interactionStyle: "calm guidance",
          futureInteractionPotential: "high",
        },
      },
    ],
    relationships: [
      {
        fromIdentityKey: "mira",
        toIdentityKey: "toma-usta",
        dimension: "trust",
        direction: "high",
        strength: "strong",
        sourceFactIds: ["fact-bakery"],
        rationale: "Mira has known Toma for years.",
      },
      {
        fromIdentityKey: "toma-usta",
        toIdentityKey: "mira",
        dimension: "trust",
        direction: "neutral",
        strength: "moderate",
        sourceFactIds: ["fact-bakery"],
        rationale: "Toma trusts Mira but still supervises her.",
      },
    ],
  };
}

describe("Social Genesis semantic validation", () => {
  it("accepts directional relationship evidence without numeric vectors", () => {
    const suggestion = baseSuggestion();
    const validation = validateSocialGenesisSuggestion(suggestion);

    expect(validation.valid).toBe(true);
    expect(suggestion.relationships[0]).not.toHaveProperty("trust");
    expect(suggestion.relationships[0]?.direction).toBe("high");
  });

  it("rejects duplicate identity keys", () => {
    const suggestion = baseSuggestion();
    suggestion.npcs.push({
      ...suggestion.npcs[0]!,
      displayName: "Usta Toma",
    });

    const validation = validateSocialGenesisSuggestion(suggestion);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "SOCIAL_GENESIS_DUPLICATE_IDENTITY_KEY",
    );
  });

  it("requires provenance for origin-backed NPCs", () => {
    const suggestion = baseSuggestion();
    suggestion.npcs[0]!.originFactIds = [];

    const validation = validateSocialGenesisSuggestion(suggestion);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "SOCIAL_GENESIS_ORIGIN_SOURCE_REQUIRED",
    );
  });

  it("allows an isolated-character suggestion", () => {
    const suggestion: SocialGenesisSuggestion = {
      key: "isolated",
      title: "Quiet beginning",
      characterIdentityKey: "alone",
      npcs: [],
      relationships: [],
    };

    expect(validateSocialGenesisSuggestion(suggestion).valid).toBe(true);
  });
});
