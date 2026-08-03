import { z } from "zod";

import { AGE_BANDS, CHARACTER_KINDS } from "./bootstrap-vectors";
import type { CharacterKind, ChildAgeBand } from "./bootstrap-vectors";

export const TONE_VECTORS = [
  "wonder",
  "warmth",
  "mystery",
  "humor",
  "courage",
  "curiosity",
] as const;
export type ToneVector = (typeof TONE_VECTORS)[number];

export interface OriginPackageProposal {
  id: string;
  characterKind: CharacterKind;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: ToneVector[];
  noveltyMarkers: string[];
  universeSeed: string;
  candidateSeed: string;
  score: number;
}

export const originPackageProposalSchema = z.object({
  id: z.string().min(1),
  characterKind: z.enum(CHARACTER_KINDS),
  subtype: z.string().min(1).max(80),
  originConcept: z.string().min(1).max(500),
  startingRegionArchetype: z.string().min(1).max(120),
  startingLocation: z.string().min(1).max(120),
  homeArchetype: z.string().min(1).max(120),
  nearbyNpcSeed: z.string().min(1).max(160),
  firstMysterySeed: z.string().min(1).max(160),
  toneVector: z.array(z.enum(TONE_VECTORS)).min(1),
  noveltyMarkers: z.array(z.string()).min(1).max(3),
  universeSeed: z.string().min(1),
  candidateSeed: z.string().min(1),
  score: z.number().min(0).max(5),
});

export const originBatchProposalSchema = z.object({
  packages: z.array(originPackageProposalSchema).min(1).max(5),
});

export interface OriginBatchProposal {
  packages: OriginPackageProposal[];
}

export interface OriginGenerationInput {
  characterKind: CharacterKind;
  characterType?: string | undefined;
  childAgeBand: ChildAgeBand;
  universeSeed: string;
  originSeed: string;
  candidateCount: number;
  safetyBounds: string[];
  previousBatchConcepts?: string[] | undefined;
}

export const originGenerationInputSchema = z.object({
  characterKind: z.enum(CHARACTER_KINDS),
  characterType: z.string().optional(),
  childAgeBand: z.enum(AGE_BANDS),
  universeSeed: z.string().min(1),
  originSeed: z.string().min(1),
  candidateCount: z.number().int().min(3).max(5),
  safetyBounds: z.array(z.string()),
  previousBatchConcepts: z.array(z.string()).optional(),
});

export interface OriginGenerationResult {
  candidates: OriginPackageProposal[];
  source: "llm" | "template";
  modelId: string | null;
  universeSeed: string;
  originSeed: string;
  candidateSeeds: string[];
}
