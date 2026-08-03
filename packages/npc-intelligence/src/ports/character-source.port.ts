import type {
  DirectionalRelationship,
  EmotionDimension,
  GoalState,
  InfluenceVector,
  NeedState,
  TraitDimension,
} from "@lumi/profiles";

export interface NpcCharacterSnapshot {
  npcId: string;
  householdId: string;
  traits: Partial<Record<TraitDimension, number>>;
  emotions: Partial<Record<EmotionDimension, number>>;
  influence: InfluenceVector;
  relationships: DirectionalRelationship[];
  needs: NeedState[];
  goals: GoalState[];
}

export interface NpcCharacterSourcePort {
  fetchSnapshot(
    npcId: string,
    householdId: string,
  ): Promise<NpcCharacterSnapshot>;
}
