import type {
  CandidateAction,
  DecisionContextVector,
  Elimination,
  UtilityScore,
} from "../domain";
import { SelectionFailedError } from "../domain/errors";
import { createSeededRng } from "../domain/seeded-rng";

/** Below this personality fit a candidate is eliminated unless a strong need pulls it. */
export const PERSONALITY_BOUNDARY = 0.25;
/** Need pressure at or above this provides strong evidence to keep an off-fit candidate. */
export const STRONG_NEED_EVIDENCE = 0.6;

export interface SelectionResult {
  selectedCandidateId: string | null;
  selectionReason: string;
  eliminations: Elimination[];
}

/**
 * Deterministically selects a candidate from scored actions.
 *
 * Rules:
 * - blocked candidates are eliminated first (safety before personality);
 * - candidates whose personality fit falls below the boundary are eliminated
 *   unless a strong matching need pressure justifies them;
 * - the winner is the highest-scoring remaining candidate;
 * - ties are broken by the seeded RNG, so the same inputs produce the same
 *   selection while different seeds explore different equally-ranked actions.
 */
export class DecisionSelector {
  select(
    candidates: readonly CandidateAction[],
    scores: readonly UtilityScore[],
    context: DecisionContextVector,
    seed: string,
  ): SelectionResult {
    const eliminations: Elimination[] = [];
    const scoreByCandidate = new Map(scores.map((s) => [s.candidateId, s]));

    const needPressure = new Map(
      context.needs.map((n) => [n.needType, n.urgency]),
    );

    const remaining: Array<{
      candidate: CandidateAction;
      score: UtilityScore;
    }> = [];

    for (const candidate of candidates) {
      const score = scoreByCandidate.get(candidate.id);
      if (!score) continue;

      if (candidate.safety === "blocked") {
        eliminations.push({
          candidateId: candidate.id,
          reason: "blocked by safety policy",
        });
        continue;
      }

      const maxNeedEvidence = candidate.needTypes.reduce(
        (max, n) => Math.max(max, needPressure.get(n) ?? 0),
        0,
      );
      if (
        candidate.personalityFit < PERSONALITY_BOUNDARY &&
        maxNeedEvidence < STRONG_NEED_EVIDENCE
      ) {
        eliminations.push({
          candidateId: candidate.id,
          reason: `personality fit ${candidate.personalityFit} below boundary`,
        });
        continue;
      }

      remaining.push({ candidate, score });
    }

    if (remaining.length === 0) {
      return {
        selectedCandidateId: null,
        selectionReason: "no admissible candidate",
        eliminations,
      };
    }

    const sorted = [...remaining].sort((a, b) => b.score.total - a.score.total);
    const topScore = sorted[0]?.score.total ?? 0;
    const winners = sorted.filter((s) => s.score.total === topScore);

    const rng = createSeededRng(seed);
    const winner = winners[rng.nextInt(0, winners.length - 1)];

    if (!winner) {
      throw new SelectionFailedError("Failed to resolve a winning candidate.");
    }

    return {
      selectedCandidateId: winner.candidate.id,
      selectionReason: this.buildSelectionReason(
        winner,
        topScore,
        winners.length,
      ),
      eliminations,
    };
  }

  private buildSelectionReason(
    winner: { candidate: CandidateAction; score: UtilityScore },
    topScore: number,
    tiedCount: number,
  ): string {
    const kind = winner.candidate.kind;
    if (tiedCount > 1) {
      return `selected ${kind} after seeded tie-break (score ${topScore})`;
    }
    return `selected ${kind} with top utility ${topScore}`;
  }
}
