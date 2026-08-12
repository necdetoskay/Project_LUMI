import {
  getVisualStyleProfile,
  type ItemVisualState,
  type VisualAssetType,
  type VisualStyleId,
} from "../domain";

export type VisualPromptRequest = {
  assetType: VisualAssetType;
  styleId: VisualStyleId;
  styleVersion?: number;
  identity: readonly string[];
  states?: readonly ItemVisualState[];
};

export type CompiledVisualPrompt = {
  prompt: string;
  styleId: VisualStyleId;
  styleVersion: number;
  stateIds: readonly string[];
};

const ITEM_HARD_GUARDRAILS = [
  "SUBJECT TYPE: ITEM / OBJECT.",
  "Generate only the requested physical object.",
  "Do not generate people, children, characters, animals, faces or hands.",
  "Do not invent a mascot or replace the item with a character.",
] as const;

const GRID_RULES = [
  "Render the requested states as a clean evenly divided grid with no gutters containing text.",
  "Every panel must show the exact same object identity, design, materials, proportions and colors; only the requested state changes.",
  "Do not write state names, panel numbers, captions or labels inside the image.",
] as const;

export function compileVisualPrompt(
  request: VisualPromptRequest,
): CompiledVisualPrompt {
  if (request.identity.length === 0) {
    throw new Error("VISUAL_IDENTITY_REQUIRED");
  }
  const style = getVisualStyleProfile(request.styleId, request.styleVersion);
  const states = request.states ?? [];
  if (request.assetType !== "item" && states.length > 0) {
    throw new Error("VISUAL_STATES_ONLY_SUPPORTED_FOR_ITEM");
  }
  if (states.length > 4) {
    throw new Error("VISUAL_STATE_GRID_TOO_LARGE");
  }

  const sections: string[] = [
    `STYLE PROFILE: ${style.id} v${style.version}.`,
    `STYLE: ${style.corePrompt.join(", ")}.`,
    `IDENTITY: ${request.identity.join("; ")}.`,
    `ASSET RULES: ${style.rules[request.assetType].join("; ")}.`,
  ];

  if (request.assetType === "item") {
    sections.push(...ITEM_HARD_GUARDRAILS);
    if (states.length > 0) {
      sections.push(
        `REQUESTED STATES (${states.length}): ${states
          .map((state, index) => `${index + 1}) ${state.prompt}`)
          .join("; ")}.`,
        ...GRID_RULES,
      );
    }
  }

  sections.push(`FORBIDDEN: ${style.negativePrompt.join(", ")}.`);

  return {
    prompt: sections.join(" "),
    styleId: style.id,
    styleVersion: style.version,
    stateIds: states.map((state) => state.id),
  };
}
