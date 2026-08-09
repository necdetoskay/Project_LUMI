import type {
  CandidateAction,
  CandidateMemoryInfluence,
  DecisionContextVector,
  DecisionMemoryEvidence,
  UtilityScore,
  UtilityWeightPolicy,
} from "../domain";
import { computeCandidateMemoryInfluence } from "../domain/memory-decision-influence";
import { UtilityEvaluator } from "./utility-evaluator.service";

export interface MemoryAwareUtilityScore extends UtilityScore {
  baseTotal: number;
  memoryInfluence: number;
  memoryEvidenceIds: string[];
}

/**
 * Adds bounded canonical-memory influence to the existing deterministic
 * utility score. Candidates still come exclusively from the caller/domain;
 * memory cannot create or unblock an executable action.
 */
export class MemoryAwareUtilityEvaluator {
  constructor(private readonly baseEvaluator = new UtilityEvaluator()) {}

  evaluate(
    candidates: readonly CandidateAction[],
    context: DecisionContextVector,
    policy: UtilityWeightPolicy,
    memories: readonly DecisionMemoryEvidence[],
  ): MemoryAwareUtilityScore[] {
    const baseScores = this.baseEvaluator.evaluate(candidates, context, policy);
    const influenceByCandidate = new Map<string, CandidateMemoryInfluence>(
      computeCandidateMemoryInfluence(
        candidates.map((candidate) => candidate.id),
        memories,
      ).map((influence) => [influence.candidateId, influence]),
    );

    return baseScores.map((score) => {
      const influence = influenceByCandidate.get(score.candidateId) ?? {
        candidateId: score.candidateId,
        delta: 0,
        evidenceMemoryIds: [],
      };
      const total = Number((score.total + influence.delta).toFixed(6));

      return {
        ...score,
        total,
        baseTotal: score.total,
        memoryInfluence: influence.delta,
        memoryEvidenceIds: [...influence.evidenceMemoryIds],
        reasons:
          influence.delta === 0
            ? [...score.reasons]
            : [
                ...score.reasons,
                `memoryInfluence=${influence.delta}`,
              ],
      };
    });
  }
}
