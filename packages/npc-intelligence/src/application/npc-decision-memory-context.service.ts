import type { CandidateAction, DecisionMemoryEvidence } from "../domain";
import type { CanonicalMemoryPort } from "../ports/canonical-memory.port";
import { MemoryDecisionEvidenceBuilder } from "./memory-decision-evidence-builder.service";

export const DEFAULT_DECISION_MEMORY_LIMIT = 8;

export interface NpcDecisionMemoryContextInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  candidates: readonly CandidateAction[];
  now: Date;
  limit?: number;
}

/**
 * Loads only exact-scope canonical NPC memories and converts explicit decision
 * provenance into bounded utility evidence. Retrieval itself has no mutation
 * capability and cannot create candidates.
 */
export class NpcDecisionMemoryContextService {
  constructor(
    private readonly memories: CanonicalMemoryPort,
    private readonly builder = new MemoryDecisionEvidenceBuilder(),
  ) {}

  async resolve(
    input: NpcDecisionMemoryContextInput,
  ): Promise<DecisionMemoryEvidence[]> {
    const memories = await this.memories.listRelevant({
      householdId: input.householdId,
      worldId: input.worldId,
      childProfileId: input.childProfileId,
      ownerType: "npc",
      ownerId: input.npcId,
      now: input.now,
      limit: input.limit ?? DEFAULT_DECISION_MEMORY_LIMIT,
    });

    return this.builder.build(memories, input.candidates, input.now);
  }
}
