import type { MemoryKind } from "./memory";
import { clamp01 } from "./validation";

export const MAX_DECISION_MEMORY_INFLUENCE = 0.2;

export interface DecisionMemoryEvidence {
  memoryId: string;
  kind: MemoryKind;
  effectiveSalience: number;
  confidence: number;
  candidateAffinity: Readonly<Record<string, number>>;
}

export interface CandidateMemoryInfluence {
  candidateId: string;
  delta: number;
  evidenceMemoryIds: string[];
}

/**
 * Computes a bounded, deterministic memory influence for caller-supplied
 * candidates. Memory may adjust ranking, but it can never create an action.
 */
export function computeCandidateMemoryInfluence(
  candidateIds: readonly string[],
  memories: readonly DecisionMemoryEvidence[],
  maxAbsoluteInfluence = MAX_DECISION_MEMORY_INFLUENCE,
): CandidateMemoryInfluence[] {
  const bound = clamp01(maxAbsoluteInfluence);

  return candidateIds.map((candidateId) => {
    let weighted = 0;
    let weight = 0;
    const evidenceMemoryIds: string[] = [];

    for (const memory of memories) {
      const affinity = memory.candidateAffinity[candidateId];
      if (affinity == null || !Number.isFinite(affinity)) continue;

      const normalizedAffinity = Math.max(-1, Math.min(1, affinity));
      const evidenceWeight =
        clamp01(memory.effectiveSalience) * clamp01(memory.confidence);
      if (evidenceWeight === 0) continue;

      weighted += normalizedAffinity * evidenceWeight;
      weight += evidenceWeight;
      evidenceMemoryIds.push(memory.memoryId);
    }

    const normalized = weight === 0 ? 0 : weighted / weight;
    const delta = Number((normalized * bound).toFixed(6));

    return {
      candidateId,
      delta,
      evidenceMemoryIds: [...new Set(evidenceMemoryIds)].sort(),
    };
  });
}
