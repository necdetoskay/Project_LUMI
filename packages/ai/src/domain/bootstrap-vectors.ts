import { createSeededRng, type SeededRng } from "./seeded-rng";

export const CHARACTER_KINDS = [
  "human",
  "animal",
  "fantasy",
  "robot",
  "sea_creature",
  "sky_creature",
] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const AGE_BANDS = ["3-5", "6-8", "9-12", "13+"] as const;
export type ChildAgeBand = (typeof AGE_BANDS)[number];

export interface BootstrapVectorSet {
  habitat: Record<string, number>;
  tone: Record<string, number>;
  novelty: Record<string, number>;
  mystery: Record<string, number>;
  social: Record<string, number>;
  risk: Record<string, number>;
  magicTech: Record<string, number>;
}

export interface VectorInput {
  universeSeed: string;
  characterKind: CharacterKind;
  childAgeBand: ChildAgeBand;
}

const BASE_VECTORS: Record<CharacterKind, BootstrapVectorSet> = {
  human: {
    habitat: {
      village: 0.8,
      forest: 0.6,
      home: 0.9,
      mountain: 0.3,
      water: 0.2,
    },
    tone: { wonder: 0.8, warmth: 0.85, softMystery: 0.55, comedy: 0.3 },
    novelty: { familyHeirloom: 0.7, hiddenGarden: 0.6, oldJournal: 0.5 },
    mystery: { hiddenRoom: 0.6, gentleUrgency: 0.4, secretLetter: 0.6 },
    social: { friendlyNeighbor: 0.85, familyTie: 0.9, loneDiscovery: 0.4 },
    risk: { dangerSoftness: 0.15, fearIntensity: 0.12, recoverability: 0.92 },
    magicTech: { magic: 0.3, technology: 0.25, natureWonder: 0.7 },
  },
  animal: {
    habitat: {
      forest: 0.9,
      meadow: 0.7,
      burrow: 0.75,
      stream: 0.6,
      openSky: 0.3,
    },
    tone: { wonder: 0.8, warmth: 0.85, softMystery: 0.6, comedy: 0.4 },
    novelty: { lostSound: 0.7, hiddenPath: 0.65, tinyVillage: 0.6 },
    mystery: { hiddenMemory: 0.65, gentleUrgency: 0.35, secretHelper: 0.6 },
    social: { friendlyNeighbor: 0.9, familyTie: 0.75, loneDiscovery: 0.45 },
    risk: { dangerSoftness: 0.25, fearIntensity: 0.15, recoverability: 0.9 },
    magicTech: { magic: 0.4, technology: 0.05, natureWonder: 0.9 },
  },
  fantasy: {
    habitat: {
      castle: 0.6,
      enchantedForest: 0.85,
      tower: 0.6,
      hiddenValley: 0.7,
      cave: 0.4,
    },
    tone: { wonder: 0.9, warmth: 0.7, softMystery: 0.75, comedy: 0.25 },
    novelty: { talkingMap: 0.7, starPebble: 0.6, singingLantern: 0.65 },
    mystery: { hiddenMemory: 0.7, gentleUrgency: 0.45, secretHelper: 0.65 },
    social: { friendlyNeighbor: 0.7, familyTie: 0.65, loneDiscovery: 0.6 },
    risk: { dangerSoftness: 0.2, fearIntensity: 0.18, recoverability: 0.85 },
    magicTech: { magic: 0.95, technology: 0.1, natureWonder: 0.85 },
  },
  robot: {
    habitat: {
      workshop: 0.85,
      garden: 0.55,
      skyline: 0.6,
      home: 0.7,
      hiddenLab: 0.6,
    },
    tone: { wonder: 0.85, warmth: 0.8, softMystery: 0.55, comedy: 0.35 },
    novelty: { memoryChip: 0.7, gearsAndSunlight: 0.65, firstLeaf: 0.6 },
    mystery: { lostProgram: 0.65, gentleUrgency: 0.4, hiddenMessage: 0.6 },
    social: { friendlyNeighbor: 0.8, familyTie: 0.7, loneDiscovery: 0.5 },
    risk: { dangerSoftness: 0.12, fearIntensity: 0.1, recoverability: 0.95 },
    magicTech: { magic: 0.1, technology: 0.95, natureWonder: 0.6 },
  },
  sea_creature: {
    habitat: {
      water: 0.96,
      reef: 0.74,
      shallowSafeDepth: 0.68,
      openSky: 0.18,
      dryLand: 0.03,
    },
    tone: { wonder: 0.82, warmth: 0.76, softMystery: 0.69, comedy: 0.24 },
    novelty: { lostSounds: 0.88, moonlightTides: 0.72, ancientMaps: 0.31 },
    mystery: { hiddenMemory: 0.64, gentleUrgency: 0.35, secretHelper: 0.58 },
    social: { friendlyNeighbor: 0.73, loneDiscovery: 0.41, familyTie: 0.52 },
    risk: { dangerSoftness: 0.22, fearIntensity: 0.14, recoverability: 0.91 },
    magicTech: { magic: 0.48, technology: 0.08, natureWonder: 0.84 },
  },
  sky_creature: {
    habitat: {
      openSky: 0.92,
      clouds: 0.8,
      highNest: 0.7,
      mountain: 0.6,
      windRidge: 0.65,
    },
    tone: { wonder: 0.9, warmth: 0.72, softMystery: 0.65, comedy: 0.3 },
    novelty: { windWhistle: 0.75, lostFeather: 0.65, starGlimpse: 0.7 },
    mystery: { hiddenMemory: 0.62, gentleUrgency: 0.38, secretHelper: 0.6 },
    social: { friendlyNeighbor: 0.75, loneDiscovery: 0.55, familyTie: 0.6 },
    risk: { dangerSoftness: 0.18, fearIntensity: 0.12, recoverability: 0.9 },
    magicTech: { magic: 0.55, technology: 0.05, natureWonder: 0.85 },
  },
};

const AGE_TONE_LIMITS: Record<
  ChildAgeBand,
  { tensionCap: number; mysteryCap: number; riskCap: number }
> = {
  "3-5": { tensionCap: 0.4, mysteryCap: 0.5, riskCap: 0.3 },
  "6-8": { tensionCap: 0.55, mysteryCap: 0.65, riskCap: 0.4 },
  "9-12": { tensionCap: 0.7, mysteryCap: 0.8, riskCap: 0.5 },
  "13+": { tensionCap: 0.85, mysteryCap: 0.9, riskCap: 0.65 },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function varyVector(
  vector: Record<string, number>,
  rng: SeededRng,
  variance: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(vector).map(([key, value]) => {
      const delta = (rng.nextFloat() * 2 - 1) * variance;
      return [key, clamp01(value + delta)];
    }),
  );
}

function capValues(
  vector: Record<string, number>,
  cap: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(vector).map(([key, value]) => [key, Math.min(cap, value)]),
  );
}

export function createBootstrapVectors(input: VectorInput): BootstrapVectorSet {
  const rng = createSeededRng(input.universeSeed);
  const base = BASE_VECTORS[input.characterKind];
  const limits = AGE_TONE_LIMITS[input.childAgeBand];

  return {
    habitat: varyVector(base.habitat, rng, 0.12),
    tone: capValues(varyVector(base.tone, rng, 0.18), 1),
    novelty: varyVector(base.novelty, rng, 0.35),
    mystery: capValues(varyVector(base.mystery, rng, 0.22), limits.mysteryCap),
    social: varyVector(base.social, rng, 0.2),
    risk: capValues(varyVector(base.risk, rng, 0.1), limits.riskCap),
    magicTech: varyVector(base.magicTech, rng, 0.28),
  };
}

export function topVectorKeys(
  vector: Record<string, number>,
  count: number,
): string[] {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}

export function dominantVectorKeys(vectors: BootstrapVectorSet): {
  habitat: string[];
  tone: string[];
  novelty: string[];
  mystery: string[];
  social: string[];
  magicTech: string[];
} {
  return {
    habitat: topVectorKeys(vectors.habitat, 3),
    tone: topVectorKeys(vectors.tone, 3),
    novelty: topVectorKeys(vectors.novelty, 3),
    mystery: topVectorKeys(vectors.mystery, 2),
    social: topVectorKeys(vectors.social, 2),
    magicTech: topVectorKeys(vectors.magicTech, 2),
  };
}
