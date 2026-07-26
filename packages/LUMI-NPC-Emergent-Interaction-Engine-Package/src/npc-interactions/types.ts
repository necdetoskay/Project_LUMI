export type InteractionType =
  | "rumor"
  | "gift"
  | "warning"
  | "invitation"
  | "quest_seed"
  | "social_visit"
  | "information_share";

export type InteractionStatus =
  | "pending"
  | "delivered"
  | "accepted"
  | "declined"
  | "expired"
  | "consumed"
  | "blocked";

export type NpcInteractionCandidate = {
  sourceCharacterId: string;
  targetCharacterId?: string;
  childProfileId?: string;
  worldId: string;
  interactionType: InteractionType;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  utility: number;
  urgency: number;
  relationshipScore: number;
  noveltyScore: number;
  safetyScore: number;
  expiresAt?: Date;
};

export type InteractionOpportunity = {
  id: string;
  sourceCharacterId: string;
  targetCharacterId?: string;
  childProfileId?: string;
  worldId: string;
  interactionType: InteractionType;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  status: InteractionStatus;
  createdAt: Date;
  expiresAt?: Date;
};
