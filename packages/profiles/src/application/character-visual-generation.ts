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
};

export interface CharacterVisualStoragePort {
  store(input: CharacterVisualStorageInput): Promise<{ storageRef: string }>;
}

export function renderCharacterVisualPrompt(
  brief: CharacterVisualBrief,
): string {
  const preferences = Object.keys(brief.preferenceHints).length
    ? ` Visual preference hints: ${JSON.stringify(brief.preferenceHints)}.`
    : "";

  return [
    `Create a canonical full-character reference illustration for a children's living-story universe.`,
    `Character name: ${brief.subject.name}.`,
    `Kind: ${brief.subject.broadKind}; role archetype: ${brief.subject.characterType}; subtype: ${brief.subject.subtype}.`,
    `Origin and identity anchors: ${brief.appearanceAnchors.originConcept}. Home archetype: ${brief.appearanceAnchors.homeArchetype}.`,
    `World context: ${brief.context.regionArchetype}, starting around ${brief.context.startingLocation}.`,
    `Show one clearly readable full character, neutral-to-friendly pose, simple uncluttered background, consistent proportions, child-safe storybook presentation.`,
    `Prioritize stable identity features that can be reused in later scenes. Avoid text, logos, watermarks, horror, violence, sexualized styling, or age-inappropriate presentation.`,
    `Safety constraints: ${JSON.stringify(brief.safetyConstraints)}.${preferences}`,
  ].join(" ");
}
