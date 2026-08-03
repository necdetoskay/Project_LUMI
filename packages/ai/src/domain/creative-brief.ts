import { z } from "zod";

import type { BootstrapVectorSet } from "./bootstrap-vectors";

export const DEFAULT_AVOID: string[] = [
  "generic chosen one",
  "flat cute animal in obvious habitat",
  "dark or hopeless premise",
  "random contradiction without explanation",
];

export interface OriginCreativeBrief {
  characterKind: string;
  characterType?: string | undefined;
  subtype?: string | undefined;
  universeSeed: string;
  candidateSeed: string;
  dominantVectors: {
    habitat: string[];
    tone: string[];
    novelty: string[];
    mystery: string[];
    social: string[];
    magicTech: string[];
  };
  avoid: string[];
  safetyBounds: string[];
}

export const originCreativeBriefSchema = z.object({
  characterKind: z.string().min(1),
  characterType: z.string().optional(),
  subtype: z.string().optional(),
  universeSeed: z.string().min(1),
  candidateSeed: z.string().min(1),
  dominantVectors: z.object({
    habitat: z.array(z.string()),
    tone: z.array(z.string()),
    novelty: z.array(z.string()),
    mystery: z.array(z.string()),
    social: z.array(z.string()),
    magicTech: z.array(z.string()),
  }),
  avoid: z.array(z.string()),
  safetyBounds: z.array(z.string()),
});

export interface BuildCreativeBriefInput {
  characterKind: string;
  characterType?: string | undefined;
  universeSeed: string;
  candidateSeed: string;
  vectors: BootstrapVectorSet;
  safetyBounds: string[];
  subtype?: string | undefined;
}

export function buildOriginCreativeBrief(
  input: BuildCreativeBriefInput,
): OriginCreativeBrief {
  const { habitat, tone, novelty, mystery, social, magicTech } = input.vectors;

  return {
    characterKind: input.characterKind,
    ...(input.characterType !== undefined
      ? { characterType: input.characterType }
      : {}),
    ...(input.subtype !== undefined ? { subtype: input.subtype } : {}),
    universeSeed: input.universeSeed,
    candidateSeed: input.candidateSeed,
    dominantVectors: {
      habitat: topKeys(habitat, 3),
      tone: topKeys(tone, 3),
      novelty: topKeys(novelty, 3),
      mystery: topKeys(mystery, 2),
      social: topKeys(social, 2),
      magicTech: topKeys(magicTech, 2),
    },
    avoid: [...DEFAULT_AVOID],
    safetyBounds: input.safetyBounds,
  };
}

function topKeys(vector: Record<string, number>, count: number): string[] {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}
