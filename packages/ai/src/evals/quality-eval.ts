import type { OriginPackageProposal } from "../domain/origin-types";

export interface OriginQualityScore {
  originality: number;
  richness: number;
  coherence: number;
  childSafety: number;
  emotionalWarmth: number;
  storyPotential: number;
  genericPenalty: number;
}

export const MINIMUM_QUALITY_GATES = {
  childSafety: 5.0,
  coherence: 4.0,
  originality: 4.0,
  richness: 4.0,
  storyPotential: 4.0,
  genericPenaltyMax: 2.0,
  repeatedMotifRatioMax: 0.15,
} as const;

export function calculateOriginQuality(score: OriginQualityScore): number {
  if (score.childSafety < 5) {
    return 0;
  }

  return (
    score.originality * 0.22 +
    score.richness * 0.18 +
    score.coherence * 0.2 +
    score.childSafety * 0.2 +
    score.emotionalWarmth * 0.1 +
    score.storyPotential * 0.1 -
    score.genericPenalty * 0.12
  );
}

export function passesQualityGates(score: OriginQualityScore): boolean {
  if (score.childSafety < MINIMUM_QUALITY_GATES.childSafety) return false;
  if (score.coherence < MINIMUM_QUALITY_GATES.coherence) return false;
  if (score.originality < MINIMUM_QUALITY_GATES.originality) return false;
  if (score.richness < MINIMUM_QUALITY_GATES.richness) return false;
  if (score.storyPotential < MINIMUM_QUALITY_GATES.storyPotential) return false;
  if (score.genericPenalty > MINIMUM_QUALITY_GATES.genericPenaltyMax)
    return false;
  return true;
}

export interface MotifReport {
  totalCandidates: number;
  motifFrequency: Record<string, number>;
  repeatedMotifs: Array<{ motif: string; count: number; ratio: number }>;
  genericPhraseHits: string[];
}

const GENERIC_PHRASES = [
  "brave little",
  "chosen one",
  "magic crystal",
  "lost pearl",
  "evil shadow",
  "generic princess",
];

export function analyzeMotifs(
  candidates: OriginPackageProposal[],
): MotifReport {
  const motifFrequency: Record<string, number> = {};
  const genericPhraseHits: string[] = [];
  const totalCandidates = candidates.length;

  for (const candidate of candidates) {
    const words = candidate.originConcept
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);
    for (const word of words) {
      motifFrequency[word] = (motifFrequency[word] ?? 0) + 1;
    }

    const text =
      `${candidate.subtype} ${candidate.originConcept}`.toLowerCase();
    for (const phrase of GENERIC_PHRASES) {
      if (text.includes(phrase) && !genericPhraseHits.includes(phrase)) {
        genericPhraseHits.push(phrase);
      }
    }
  }

  const repeatedMotifs = Object.entries(motifFrequency)
    .map(([motif, count]) => ({ motif, count, ratio: count / totalCandidates }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count);

  return { totalCandidates, motifFrequency, repeatedMotifs, genericPhraseHits };
}

export function repeatedMotifRatio(report: MotifReport): number {
  if (report.totalCandidates === 0) return 0;
  return (
    report.repeatedMotifs.reduce((sum, entry) => sum + (entry.count - 1), 0) /
    report.totalCandidates
  );
}
