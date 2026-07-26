# Seeded Vector Bootstrap

**Version:** 1.0.0
**Status:** Canonical
**Owner:** Domain Design / Generation Architecture
**Last Updated:** 2026-07-26

## Purpose

This document defines how Project LUMI uses deterministic seeds and vector
generation to create rich, repeatable and non-generic first universe candidates.

The goal is not random variety. The goal is controlled uniqueness: every new
universe should feel specific and surprising, while still being testable,
safe, reproducible and compatible with the selected character type.

## Core Rule

Enum fields preserve consistency. Vectors create originality. The LLM expresses
the creative surface. The domain engine validates and persists the canonical
state.

The LLM must not own permanent world state creation. It may propose origin
packages from a structured brief, but the application code must create,
validate and store the actual World, Character, Home, NPC seed and first event
records.

## Seed Layers

LUMI uses multiple seed layers so refreshes can change suggestions without
destroying the identity of the whole universe.

| Seed | Scope | When created | Mutability |
| --- | --- | --- | --- |
| `universeSeed` | entire first universe identity | first universe bootstrap start | stable |
| `originSeed` | accepted character origin direction | first-run origin session | stable after acceptance |
| `candidateSeed` | one Auto proposal card | each candidate generation | replaceable on refresh |
| `regionSeed` | first region/location variations | world bootstrap | stable after world creation |
| `storySeed` | first story spark and opening scene | first story generation | can vary by story |

Refresh should usually replace `candidateSeed` values only. It should not
replace `universeSeed` after first universe creation has started.

## Bootstrap Vector Set

The seed produces a vector set before any LLM prompt is built.

```ts
export type BootstrapVectorSet = {
  habitat: Record<string, number>;
  tone: Record<string, number>;
  novelty: Record<string, number>;
  mystery: Record<string, number>;
  social: Record<string, number>;
  risk: Record<string, number>;
  magicTech: Record<string, number>;
};
```

Example for a sea creature:

```ts
const vectors: BootstrapVectorSet = {
  habitat: {
    water: 0.96,
    reef: 0.74,
    shallowSafeDepth: 0.68,
    openSky: 0.18,
    dryLand: 0.03,
  },
  tone: {
    wonder: 0.82,
    warmth: 0.76,
    softMystery: 0.69,
    comedy: 0.24,
  },
  novelty: {
    lostSounds: 0.88,
    moonlightTides: 0.72,
    ancientMaps: 0.31,
  },
  mystery: {
    hiddenMemory: 0.64,
    gentleUrgency: 0.35,
    secretHelper: 0.58,
  },
  social: {
    friendlyNeighbor: 0.73,
    loneDiscovery: 0.41,
    familyTie: 0.52,
  },
  risk: {
    dangerSoftness: 0.22,
    fearIntensity: 0.14,
    recoverability: 0.91,
  },
  magicTech: {
    magic: 0.48,
    technology: 0.08,
    natureWonder: 0.84,
  },
};
```

## Seeded RNG

The implementation should use a deterministic RNG instead of `Math.random()`
for bootstrap decisions. This makes failures reproducible and lets the team
replay a generated universe during tests.

```ts
export type SeededRng = {
  nextFloat(): number;
  nextInt(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
};

export function createSeededRng(seed: string): SeededRng {
  let state = hashSeed(seed);

  function nextRaw(): number {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  return {
    nextFloat: nextRaw,
    nextInt(minInclusive, maxInclusive) {
      const span = maxInclusive - minInclusive + 1;
      return minInclusive + Math.floor(nextRaw() * span);
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list.");
      }
      return items[Math.floor(nextRaw() * items.length)];
    },
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
```

The exact RNG algorithm may change during implementation, but it must remain
deterministic for a given seed and versioned when changed.

## Vector Generation

Character type provides hard compatibility boundaries. The seed creates
variation inside those boundaries.

```ts
export function createBootstrapVectors(input: {
  universeSeed: string;
  characterType: CharacterType;
  childAgeBand: ChildAgeBand;
}): BootstrapVectorSet {
  const rng = createSeededRng(input.universeSeed);
  const base = baseVectorsForCharacterType(input.characterType);

  return {
    habitat: varyVector(base.habitat, rng, 0.12),
    tone: clampForAge(varyVector(base.tone, rng, 0.18), input.childAgeBand),
    novelty: varyVector(base.novelty, rng, 0.35),
    mystery: clampForAge(varyVector(base.mystery, rng, 0.22), input.childAgeBand),
    social: varyVector(base.social, rng, 0.20),
    risk: clampRisk(varyVector(base.risk, rng, 0.10), input.childAgeBand),
    magicTech: varyVector(base.magicTech, rng, 0.28),
  };
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
```

## LLM Role

The LLM receives a structured creative brief derived from the seed and vectors.
It does not receive unlimited freedom.

```ts
export type OriginCreativeBrief = {
  characterType: CharacterType;
  subtype?: string;
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
};

export function buildOriginCreativeBrief(input: {
  characterType: CharacterType;
  universeSeed: string;
  candidateSeed: string;
  vectors: BootstrapVectorSet;
  safetyBounds: string[];
}): OriginCreativeBrief {
  return {
    characterType: input.characterType,
    universeSeed: input.universeSeed,
    candidateSeed: input.candidateSeed,
    dominantVectors: {
      habitat: topVectorKeys(input.vectors.habitat, 3),
      tone: topVectorKeys(input.vectors.tone, 3),
      novelty: topVectorKeys(input.vectors.novelty, 3),
      mystery: topVectorKeys(input.vectors.mystery, 2),
      social: topVectorKeys(input.vectors.social, 2),
      magicTech: topVectorKeys(input.vectors.magicTech, 2),
    },
    avoid: [
      "generic chosen one",
      "flat cute animal in obvious habitat",
      "dark or hopeless premise",
      "random contradiction without explanation",
    ],
    safetyBounds: input.safetyBounds,
  };
}
```

## Candidate Generation Flow

```ts
export async function generateAutoOriginCandidates(input: {
  characterType: CharacterType;
  childProfile: ChildProfile;
  parentPolicy: ParentPolicy;
  universeSeed: string;
  originSeed: string;
}): Promise<OriginPackage[]> {
  const vectors = createBootstrapVectors({
    universeSeed: input.universeSeed,
    characterType: input.characterType,
    childAgeBand: input.childProfile.ageBand,
  });

  const candidateSeeds = createCandidateSeeds(input.originSeed, 5);

  const proposals = await Promise.all(
    candidateSeeds.map(async (candidateSeed) => {
      const brief = buildOriginCreativeBrief({
        characterType: input.characterType,
        universeSeed: input.universeSeed,
        candidateSeed,
        vectors,
        safetyBounds: input.parentPolicy.safetyBounds,
      });

      return llmGenerateOriginPackage(brief);
    }),
  );

  return proposals
    .map((proposal) => validateOriginPackage(proposal, input.parentPolicy))
    .map((proposal) => scoreOriginPackage(proposal, vectors))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((scored) => scored.originPackage);
}
```

## Candidate Scoring

The domain engine scores each proposal before showing it to the user.

```ts
export function scoreOriginPackage(
  originPackage: OriginPackage,
  vectors: BootstrapVectorSet,
): { originPackage: OriginPackage; score: number } {
  const score =
    typeCompatibilityScore(originPackage) * 0.25 +
    worldCoherenceScore(originPackage, vectors) * 0.25 +
    noveltyScore(originPackage, vectors) * 0.25 +
    safetyScore(originPackage) * 0.15 +
    emotionalPotentialScore(originPackage, vectors) * 0.10;

  return { originPackage, score };
}
```

The scoring function must penalize proposals that are generic, incoherent,
unsafe, too dark, or unrelated to the selected character type.

## Persistence

The accepted Origin Package must persist with the seed manifest.

```ts
export type WorldBootstrapManifest = {
  universeSeed: string;
  originSeed: string;
  acceptedCandidateSeed: string;
  generatorVersion: string;
  vectorVersion: string;
  acceptedOriginPackage: OriginPackage;
  createdAt: string;
};
```

The manifest lets LUMI explain, replay and test the first universe bootstrap.

## Acceptance Criteria

- New universe bootstrap creates a stable `universeSeed`.
- Auto origin generation uses deterministic `candidateSeed` values.
- Bootstrap vectors are generated before the LLM prompt.
- LLM output is validated, scored and filtered before user display.
- Accepted Origin Package persists with the seed manifest.
- Refresh changes candidate seeds without replacing the whole universe seed.
- Tests can replay candidate generation from stored seed values.
