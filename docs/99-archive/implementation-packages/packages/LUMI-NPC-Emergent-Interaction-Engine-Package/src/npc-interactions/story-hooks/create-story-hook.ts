import type { InteractionOpportunity } from "../types";

export function createStoryHookFromInteraction(
  opportunity: InteractionOpportunity,
): {
  hookType: string;
  title: string;
  premise: string;
  sourceInteractionId: string;
  constraints: Record<string, unknown>;
} {
  return {
    hookType: opportunity.interactionType,
    title: opportunity.title,
    premise: opportunity.summary,
    sourceInteractionId: opportunity.id,
    constraints: {
      preserveSourceNpc:
        opportunity.sourceCharacterId,
      targetCharacterId:
        opportunity.targetCharacterId,
      worldId: opportunity.worldId,
      childProfileId:
        opportunity.childProfileId,
      payload: opportunity.payload,
    },
  };
}
