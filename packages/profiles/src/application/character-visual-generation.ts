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

export type CharacterVisualBagItem = {
  id: string;
  displayName: string;
};

export const CHARACTER_VISUAL_EMOTIONS = [
  "happy",
  "sad",
  "surprised",
  "scared",
] as const;

export type CharacterVisualEmotion = (typeof CHARACTER_VISUAL_EMOTIONS)[number];

export const CHARACTER_VISUAL_VARIANTS = [
  "body-front",
  "body-three-quarter",
  "body-side",
  "body-back",
  "head-front",
  "head-three-quarter",
  "head-side",
] as const;

export const CHARACTER_VISUAL_EMOTION_VARIANTS = [
  "expression-happy",
  "expression-sad",
  "expression-surprised",
  "expression-scared",
] as const;

export type CharacterVisualVariant = (typeof CHARACTER_VISUAL_VARIANTS)[number];
export type CharacterVisualEmotionVariant =
  (typeof CHARACTER_VISUAL_EMOTION_VARIANTS)[number];
export type CharacterVisualDerivativeVariant =
  | CharacterVisualVariant
  | CharacterVisualEmotionVariant;

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
  variantKey?: CharacterVisualDerivativeVariant;
};

export interface CharacterVisualStoragePort {
  store(input: CharacterVisualStorageInput): Promise<{ storageRef: string }>;
  delete?(storageRef: string): Promise<void>;
}

export type CharacterVisualDerivative = {
  variant: CharacterVisualVariant;
  bytesBase64: string;
  mimeType: string;
  width: number;
  height: number;
  crop: { left: number; top: number; width: number; height: number };
};

export type CharacterVisualBaseDerivative = Omit<
  CharacterVisualDerivative,
  "variant"
> & { variant: CharacterVisualVariant };

export type CharacterVisualExpressionDerivative = Omit<
  CharacterVisualDerivative,
  "variant"
> & { variant: CharacterVisualEmotionVariant };

export interface CharacterVisualDerivativePort {
  splitReferenceSheet(input: {
    bytesBase64: string;
    mimeType: string;
  }): Promise<CharacterVisualBaseDerivative[]>;
  splitExpressionSheet?(input: {
    bytesBase64: string;
    mimeType: string;
  }): Promise<CharacterVisualExpressionDerivative[]>;
}

export function renderCharacterVisualPrompt(
  brief: CharacterVisualBrief,
  mode: "portrait" | "reference-sheet" | "expression-sheet" = "portrait",
  options?: {
    bagItems?: CharacterVisualBagItem[];
    emotions?: CharacterVisualEmotion[];
  },
): string {
  const preferences = Object.keys(brief.preferenceHints).length
    ? ` Visual preference hints: ${JSON.stringify(brief.preferenceHints)}.`
    : "";

  const composition =
    mode === "reference-sheet"
      ? `LAYOUT — Create one precise two-row character reference sheet with seven isolated borderless views. The top row contains exactly four equal-width full-body views, left to right: front, three-quarter, side profile, and back. The bottom row contains exactly three equal-width half-body portraits, left to right: front, three-quarter, and side profile. Keep the same character identity, facial structure, hair design, colors, clothing construction, accessories, materials and body proportions in every view. Show every full body completely from the top of the hair to the soles of the feet. Center one view inside each reserved region with generous safe margins. No body, hair, garment or accessory may touch or cross a neighboring region. Use a warm, softly textured ivory studio background with a subtle grounding shadow beneath each full-body view. Keep the background quiet and consistent. Do not add panel borders, labels, text, logos, props or scenery.`
      : mode === "expression-sheet"
        ? `LAYOUT - Create one clean two-by-two character expression sheet with four equal panels. Show the same character in these expressions: ${options?.emotions?.join(", ") || "happy, sad, surprised, scared"}. Keep the character facing forward or in a consistent three-quarter view, with the same hair, face shape, clothing, colors, accessories and lighting in every panel. Focus on expressive eyes, eyebrows and mouth while keeping the identity stable. Use a quiet warm studio background with no text, labels, props or scenery.`
        : `Show one clearly readable full character, neutral-to-friendly pose, simple uncluttered background, consistent proportions, child-safe storybook presentation.`;

  const artDirection = `ART DIRECTION — Premium cinematic children's fantasy storybook character art with a distinctive handcrafted finish. Use crisp, confident silhouettes and clean, precisely controlled edges; expressive, carefully constructed facial features and eyes; elegant shape language; rich but harmonious colors; nuanced warm studio lighting; soft dimensional shading; and finely rendered hair, fabric, leather, stitching, embroidery and accessory materials. Combine polished painterly 3D depth with delicate gouache-and-watercolor surface texture. Preserve small design details in every view. The result must look like high-end animated-feature concept art and a professionally art-directed character design sheet, not a rough sketch, generic clip art, flat vector art, low-detail cartoon, plastic toy render or unfinished draft.`;

  return [
    `Create a canonical full-character reference illustration for a children's living-story universe.`,
    `Character name: ${brief.subject.name}.`,
    `Kind: ${brief.subject.broadKind}; role archetype: ${brief.subject.characterType}; subtype: ${brief.subject.subtype}.`,
    `Origin and identity anchors: ${brief.appearanceAnchors.originConcept}. Home archetype: ${brief.appearanceAnchors.homeArchetype}.`,
    `World context: ${brief.context.regionArchetype}, starting around ${brief.context.startingLocation}.`,
    artDirection,
    composition,
    `Prioritize stable identity features that can be reused in later scenes. Avoid text, logos, watermarks, horror, violence, sexualized styling, or age-inappropriate presentation.`,
    `Safety constraints: ${JSON.stringify(brief.safetyConstraints)}.${preferences}`,
    ...(options?.bagItems?.length
      ? [
          `Character bag items to include naturally in the reference sheet: ${options.bagItems.map((item) => item.displayName).join(", ")}. Keep these items recognizable and consistent across views without adding extra props.`,
        ]
      : []),
    ...(mode === "expression-sheet"
      ? [
          "Expression direction: make each requested emotion visually unmistakable but child-safe and emotionally readable. Do not alter the character identity or costume.",
        ]
      : []),
  ].join(" ");
}
