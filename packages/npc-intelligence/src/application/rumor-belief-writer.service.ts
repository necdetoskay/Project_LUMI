import type { Belief } from "../domain/belief";
import { BeliefService } from "./belief.service";
import { DrizzleBeliefSourceRepository } from "../db/repositories/drizzle/drizzle-belief-source.repository";

export interface WriteRumorBeliefInput {
  householdId: string;
  sourceNpcId: string;
  targetNpcId: string;
  factId: string;
  claim: string;
  confidence: number;
  provenance: string[];
  hops: number;
}

export class RumorBeliefWriterService {
  constructor(
    private readonly beliefs = new BeliefService(new DrizzleBeliefSourceRepository()),
  ) {}

  async writeHearsay(input: WriteRumorBeliefInput): Promise<{ writes: number; belief: Belief }> {
    const existing = await this.beliefs.getActiveBeliefs(
      input.targetNpcId,
      input.householdId,
      new Date(),
    );
    const duplicate = existing.find((belief) => belief.factId === input.factId);
    if (duplicate) return { writes: 0, belief: duplicate };

    const belief: Belief = {
      id: crypto.randomUUID(),
      npcId: input.targetNpcId,
      householdId: input.householdId,
      factId: input.factId,
      claim: input.claim,
      confidence: input.confidence,
      source: "hearsay",
      provenance: [...input.provenance],
      createdAt: new Date(),
      lastVerifiedAt: null,
      expiresAt: null,
      status: "active",
    };

    await this.beliefs.saveBeliefs(input.targetNpcId, input.householdId, [belief]);
    return { writes: 1, belief };
  }
}
