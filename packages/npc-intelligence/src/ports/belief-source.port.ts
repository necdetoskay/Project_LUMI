import type { Belief } from "../domain/belief";

export interface NpcBeliefSourcePort {
  getBeliefs(npcId: string, householdId: string): Promise<Belief[]>;
  saveBeliefs(
    npcId: string,
    householdId: string,
    beliefs: Belief[],
  ): Promise<void>;
}
