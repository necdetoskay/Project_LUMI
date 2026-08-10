import type {
  CandidateAction,
  DecisionContextVector,
  UtilityWeightPolicy,
} from "../domain";
import type { CanonicalMemoryPort } from "../ports/canonical-memory.port";
import {
  DecisionSelector,
  type SelectionResult,
} from "./decision-selector.service";
import {
  MemoryAwareUtilityService,
  type MemoryAdjustedUtilityScore,
} from "./memory-aware-utility.service";
import { NpcDecisionMemoryContextService } from "./npc-decision-memory-context.service";
import { UtilityEvaluator } from "./utility-evaluator.service";

export interface MemoryAwareDecisionInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  candidates: readonly CandidateAction[];
  context: DecisionContextVector;
  policy: UtilityWeightPolicy;
  seed: string;
  now: Date;
}

export interface MemoryAwareDecisionResult {
  scores: MemoryAdjustedUtilityScore[];
  selection: SelectionResult;
  usedMemoryIds: string[];
}

/**
 * Canonical NPC decision seam for memory-aware autonomous behavior.
 *
 * Safety boundaries remain unchanged: candidates are produced before memory is
 * read, memory only adjusts their utility score, and DecisionSelector still
 * owns safety/personality elimination and deterministic seeded tie-breaking.
 */
export class MemoryAwareDecisionService {
  private readonly memoryContext: NpcDecisionMemoryContextService;

  constructor(
    memories: CanonicalMemoryPort,
    private readonly baseUtility = new UtilityEvaluator(),
    private readonly memoryUtility = new MemoryAwareUtilityService(),
    private readonly selector = new DecisionSelector(),
  ) {
    this.memoryContext = new NpcDecisionMemoryContextService(memories);
  }

  async decide(
    input: MemoryAwareDecisionInput,
  ): Promise<MemoryAwareDecisionResult> {
    const baseScores = this.baseUtility.evaluate(
      input.candidates,
      input.context,
      input.policy,
    );
    const evidence = await this.memoryContext.resolve({
      householdId: input.householdId,
      worldId: input.worldId,
      childProfileId: input.childProfileId,
      npcId: input.npcId,
      candidates: input.candidates,
      now: input.now,
    });
    const scores = this.memoryUtility.apply(baseScores, evidence);
    const selection = this.selector.select(
      input.candidates,
      scores,
      input.context,
      input.seed,
    );

    const selectedScore = selection.selectedCandidateId
      ? scores.find(
          (score) => score.candidateId === selection.selectedCandidateId,
        )
      : undefined;

    return {
      scores,
      selection,
      usedMemoryIds: selectedScore
        ? [...selectedScore.memoryEvidenceIds].sort()
        : [],
    };
  }
}
