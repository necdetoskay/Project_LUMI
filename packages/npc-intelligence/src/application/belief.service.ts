import { CrossFamilyAccessError, type Belief } from "../domain";
import { isActiveBelief, validateBelief } from "../domain/belief";
import type { NpcBeliefSourcePort } from "../ports/belief-source.port";

export class BeliefService {
  constructor(private readonly source: NpcBeliefSourcePort) {}

  async getActiveBeliefs(
    npcId: string,
    householdId: string,
    now: Date,
  ): Promise<Belief[]> {
    const beliefs = await this.source.getBeliefs(npcId, householdId);
    const active: Belief[] = [];
    for (const belief of beliefs) {
      validateBelief(belief);
      if (belief.npcId !== npcId) {
        throw new CrossFamilyAccessError(
          `Belief ${belief.id} does not belong to npc ${npcId}.`,
        );
      }
      if (belief.householdId !== householdId) {
        throw new CrossFamilyAccessError(
          `Belief ${belief.id} belongs to another household.`,
        );
      }
      if (isActiveBelief(belief, now)) {
        active.push(belief);
      }
    }
    return active;
  }

  async saveBeliefs(
    npcId: string,
    householdId: string,
    beliefs: Belief[],
  ): Promise<void> {
    for (const belief of beliefs) {
      validateBelief(belief);
      if (belief.npcId !== npcId || belief.householdId !== householdId) {
        throw new CrossFamilyAccessError(
          `Belief ${belief.id} scope does not match npc/household.`,
        );
      }
    }
    await this.source.saveBeliefs(npcId, householdId, beliefs);
  }
}
