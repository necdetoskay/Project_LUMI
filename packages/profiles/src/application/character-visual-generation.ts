import type { CharacterVisualBrief } from "./character-visual-brief";

export type CharacterVisualGenerationRequest = {
  jobId: string;
  brief: CharacterVisualBrief;
  prompt: string;
  model: string;
  candidateCount: number;
  aspectRatio: "1:1" | "4:3" | "3:2" | "16:9" | "4:5" | "2:3" | "9:16";
  resolution: "1K";
};

export const CHARACTER_VISUAL_VARIANTS = [
  "body-front",
  "body-three-quarter",
  "body-side",
  "body-back",
  "head-front",
  "head-three-quarter",
  "head-side",
] as const;

export type CharacterVisualVariant = (typeof CHARACTER_VISUAL_VARIANTS)[number];

export type GeneratedImageCandidate = {
  index: number;
  bytesBase64: string;
  mimeType: string;
  width?: number;
  height?: number;
  providerMetadata?: Record<string, unknown>;
};

export type CharacterVisualGenerationResult = {
  provider: string;
  model: string;
  providerRequestId?: string;
  candidates: GeneratedImageCandidate[];
  usageMetadata?: Record<string, unknown>;
  costMetadata?: Record<string, unknown>;
};

export interface CharacterVisualGenerationPort {
  generate(
    request: CharacterVisualGenerationRequest,
  ): Promise<CharacterVisualGenerationResult>;
}

export type CharacterVisualStorageInput = {
  householdId: string;
  characterId: string;
  jobId: string;
  candidateIndex: number;
  bytesBase64: string;
  mimeType: string;
  variantKey?: CharacterVisualVariant;
};

export interface CharacterVisualStoragePort {
  store(input: CharacterVisualStorageInput): Promise<{ storageRef: string }>;
}

export type CharacterVisualDerivative = {
  variant: CharacterVisualVariant;
  bytesBase64: string;
  mimeType: string;
  width: number;
  height: number;
  crop: { left: number; top: number; width: number; height: number };
};

export interface CharacterVisualDerivativePort {
  splitReferenceSheet(input: {
    bytesBase64: string;
    mimeType: string;
  }): Promise<CharacterVisualDerivative[]>;
}

export function renderCharacterVisualPrompt(
  brief: CharacterVisualBrief,
  mode: "portrait" | "reference-sheet" = "portrait",
): string {
  const preferences = Object.keys(brief.preferenceHints).length
    ? ` Visual preference hints: ${JSON.stringify(brief.preferenceHints)}.`
    : "";

  const composition =
    mode === "reference-sheet"
      ? `Create one clean two-row character reference sheet with seven isolated borderless views. Top row has exactly four equal-width full-body views, left to right: front, three-quarter, side profile, and back. Bottom row has exactly three equal-width half-body portraits, left to right: front, three-quarter, and side profile. Keep exactly the same character, face, hair, colors, clothing, accessories and proportions in every view. Keep every full body completely visible from hair to feet. Center one view inside each reserved region with generous blank safe margins; no character or clothing may cross into a neighboring region. Use a flat, uniform, pale background across the entire sheet. Do not add panel borders, labels, text, props or scenery.`
      : `Show one clearly readable full character, neutral-to-friendly pose, simple uncluttered background, consistent proportions, child-safe storybook presentation.`;

  return [
    `Create a canonical full-character reference illustration for a children's living-story universe.`,
    `Character name: ${brief.subject.name}.`,
    `Kind: ${brief.subject.broadKind}; role archetype: ${brief.subject.characterType}; subtype: ${brief.subject.subtype}.`,
    `Origin and identity anchors: ${brief.appearanceAnchors.originConcept}. Home archetype: ${brief.appearanceAnchors.homeArchetype}.`,
    `World context: ${brief.context.regionArchetype}, starting around ${brief.context.startingLocation}.`,
    composition,
    `Prioritize stable identity features that can be reused in later scenes. Avoid text, logos, watermarks, horror, violence, sexualized styling, or age-inappropriate presentation.`,
    `Safety constraints: ${JSON.stringify(brief.safetyConstraints)}.${preferences}`,
  ].join(" ");
}
