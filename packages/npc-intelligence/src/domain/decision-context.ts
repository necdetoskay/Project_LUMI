import type {
  EmotionDimension,
  InfluenceVector,
  TraitDimension,
} from "@lumi/profiles";

import type { GoalEvaluation } from "./goals";
import type { NeedPressure } from "./needs";

export interface RelationshipContext {
  targetCharacterId: string;
  trust: number;
  affinity: number;
  familiarity: number;
  relationshipType: string;
}

export interface DecisionContextVector {
  npcId: string;
  householdId: string;
  traits: Partial<Record<TraitDimension, number>>;
  emotions: Partial<Record<EmotionDimension, number>>;
  influence: InfluenceVector;
  relationships: RelationshipContext[];
  needs: NeedPressure[];
  goals: GoalEvaluation[];
  timeSensitivity: number;
  urgency: number;
  contentHash: string;
}

export interface DecisionContextBuildInput {
  npcId: string;
  householdId: string;
  traits: Partial<Record<TraitDimension, number>>;
  emotions: Partial<Record<EmotionDimension, number>>;
  influence: InfluenceVector;
  relationships: RelationshipContext[];
  needs: NeedPressure[];
  goals: GoalEvaluation[];
  timeSensitivity: number;
  urgency: number;
}
