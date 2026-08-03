import type { RawWorldFact } from "../domain/perception";

export interface NpcPerceptionInput {
  npcId: string;
  householdId: string;
  atLocationId: string | null;
  facts: RawWorldFact[];
  nearbyCharacterIds: string[];
  spatialProximity: Record<string, number>;
  timeSensitivity: number;
}

export interface NpcWorldSourcePort {
  fetchPerception(
    npcId: string,
    householdId: string,
  ): Promise<NpcPerceptionInput>;
}
