import type { OriginPackageProposal } from "../../../src/domain/origin-types";

export function makeOriginCandidate(
  id: string,
  overrides: Partial<OriginPackageProposal> = {},
): OriginPackageProposal {
  return {
    id,
    characterKind: "animal",
    subtype: "cloud fox",
    originConcept: "A cloud fox who collects lost sounds from the meadow.",
    startingRegionArchetype: "misty meadow",
    startingLocation: "the whispering willow",
    homeArchetype: "a hollow log den",
    nearbyNpcSeed: "sage owl",
    firstMysterySeed: "a glowing acorn",
    toneVector: ["wonder", "warmth"],
    noveltyMarkers: ["lost sounds", "glowing acorn"],
    universeSeed: `u:${id}`,
    candidateSeed: `u:${id}:candidate:0`,
    score: 4,
    ...overrides,
  };
}

export const DIVERSE_ORIGIN_BATCH: OriginPackageProposal[] = [
  makeOriginCandidate("diverse-1", {
    subtype: "echo fox",
    originConcept: "An echo fox who keeps the valley's memories alive.",
  }),
  makeOriginCandidate("diverse-2", {
    subtype: "lamp turtle",
    originConcept: "A lamp turtle who carries a tiny lighthouse on its shell.",
  }),
  makeOriginCandidate("diverse-3", {
    subtype: "cloud whale",
    originConcept: "A cloud whale who weaves rainbows over the sleepy hills.",
  }),
  makeOriginCandidate("diverse-4", {
    subtype: "moon badger",
    originConcept: "A moon badger who collects stardust for winter gardens.",
  }),
  makeOriginCandidate("diverse-5", {
    subtype: "acorn knight",
    originConcept: "An acorn knight who guards the mushroom town at dusk.",
  }),
];

export const GENERIC_ORIGIN_BATCH: OriginPackageProposal[] = [
  makeOriginCandidate("generic-1", {
    subtype: "brave little fox",
    originConcept:
      "A brave little fox who must save the forest from evil shadow.",
  }),
  makeOriginCandidate("generic-2", {
    subtype: "brave little rabbit",
    originConcept: "A brave little rabbit who discovers a magic crystal.",
  }),
  makeOriginCandidate("generic-3", {
    subtype: "brave little mouse",
    originConcept: "A brave little mouse who finds a lost pearl in a cave.",
  }),
  makeOriginCandidate("generic-4", {
    subtype: "chosen one",
    originConcept: "The chosen one who holds the magic crystal of the kingdom.",
  }),
  makeOriginCandidate("generic-5", {
    subtype: "generic princess",
    originConcept: "A generic princess waiting for a magic crystal.",
  }),
];
