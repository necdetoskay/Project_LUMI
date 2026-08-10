import type { DecisionMemoryEvidence, UtilityScore } from "../domain";
import { computeCandidateMemoryInfluence } from "../domain/memory-decision-influence";

export interface MemoryAdjustedUtilityScore extends UtilityScore {
  baseTotal: number;
  memoryDelta: number;
  memoryEvidenceIds: string[];
}

/**
 * Applies bounded canonical-memory influence to already-computed utility scores.
 *
 * Memory is deliberately downstream of normal utility evaluation: it may nudge
 * caller-supplied candidate ranking, but it cannot create a candidate, bypass
 * safety/personality elimination, or directly mutate world state.
 */
export class MemoryAwareUtilityService {
  apply(
    scores: readonly UtilityScore[],
    memories: readonly DecisionMemoryEvidence[],
  ): MemoryAdjustedUtilityScore[] {
    const influences = computeCandidateMemoryInfluence(
      scores.map((score) => score.candidateId),
      memories,
    );
    const influenceByCandidate = new Map(
      influences.map((influence) => [influence.candidateId, influence]),
    );

    return scores.map((score) => {
      const influence = influenceByCandidate.get(score.candidateId);
      const memoryDelta = influence?.delta ?? 0;
      const total = Number((score.total + memoryDelta).toFixed(6));
      const memoryEvidenceIds = influence?.evidenceMemoryIds ?? [];

      return {
        ...score,
        total,
        baseTotal: score.total,
        memoryDelta,
        memoryEvidenceIds,
        reasons:
          memoryDelta === 0
            ? [...score.reasons]
            : [
                ...score.reasons,
                `memoryInfluence=${memoryDelta}`,
                `memoryEvidenceCount=${memoryEvidenceIds.length}`,
              ],
      };
    });
  }
}
