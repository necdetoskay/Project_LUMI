import { createHash } from "node:crypto";

export const CHARACTER_VISUAL_BRIEF_VERSION = "lumi-character-visual-v1";

export type CharacterVisualBriefSource = {
  characterId: string;
  householdId: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  lifecycleStage: string;
  safetyBounds: Record<string, unknown>;
  preferenceHints?: Record<string, unknown> | null;
};

export type CharacterVisualBrief = {
  version: typeof CHARACTER_VISUAL_BRIEF_VERSION;
  subject: {
    characterId: string;
    householdId: string;
    name: string;
    broadKind: string;
    characterType: string;
    subtype: string;
    lifecycleStage: string;
  };
  appearanceAnchors: {
    originConcept: string;
    homeArchetype: string;
  };
  context: {
    regionArchetype: string;
    startingLocation: string;
  };
  artDirection: {
    intent: "children_story_character_canon";
    consistencyPriority: "identity_over_scene_variation";
    composition: "clear_full_character_reference";
  };
  safetyConstraints: Record<string, unknown>;
  preferenceHints: Record<string, unknown>;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }

  return value;
}

export function buildCharacterVisualBrief(
  source: CharacterVisualBriefSource,
): CharacterVisualBrief {
  return {
    version: CHARACTER_VISUAL_BRIEF_VERSION,
    subject: {
      characterId: source.characterId,
      householdId: source.householdId,
      name: source.name,
      broadKind: source.broadKind,
      characterType: source.characterType,
      subtype: source.subtype,
      lifecycleStage: source.lifecycleStage,
    },
    appearanceAnchors: {
      originConcept: source.originConcept,
      homeArchetype: source.homeArchetype,
    },
    context: {
      regionArchetype: source.startingRegionArchetype,
      startingLocation: source.startingLocation,
    },
    artDirection: {
      intent: "children_story_character_canon",
      consistencyPriority: "identity_over_scene_variation",
      composition: "clear_full_character_reference",
    },
    safetyConstraints: stableValue(source.safetyBounds) as Record<string, unknown>,
    preferenceHints: stableValue(source.preferenceHints ?? {}) as Record<
      string,
      unknown
    >,
  };
}

export function fingerprintCharacterVisualBrief(
  brief: CharacterVisualBrief,
): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(brief)))
    .digest("hex");
}
