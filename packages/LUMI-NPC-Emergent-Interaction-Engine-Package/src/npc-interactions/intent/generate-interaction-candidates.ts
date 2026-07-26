import type { NpcInteractionCandidate } from "../types";

export type NpcInteractionContext = {
  worldId: string;
  sourceCharacterId: string;
  childProfileId?: string;
  nearbyCharacterIds: string[];
  activeGoals: Array<{
    goalType: string;
    urgency: number;
  }>;
  knownRumors: Array<{
    rumorId: string;
    summary: string;
    reliability: number;
  }>;
  availableGiftItems: Array<{
    itemInstanceId: string;
    itemName: string;
    shareability: number;
  }>;
  unresolvedWorldEvents: Array<{
    eventId: string;
    eventType: string;
    summary: string;
    urgency: number;
  }>;
  relationshipScores: Record<string, number>;
  noveltyByType: Partial<Record<string, number>>;
};

export function generateInteractionCandidates(
  context: NpcInteractionContext,
): NpcInteractionCandidate[] {
  const candidates: NpcInteractionCandidate[] = [];

  for (const rumor of context.knownRumors.slice(0, 3)) {
    candidates.push({
      sourceCharacterId: context.sourceCharacterId,
      childProfileId: context.childProfileId,
      worldId: context.worldId,
      interactionType: "rumor",
      title: "Yeni bir söylenti var",
      summary: rumor.summary,
      payload: {
        rumorId: rumor.rumorId,
        reliability: rumor.reliability,
      },
      utility: 0.45 + rumor.reliability * 0.35,
      urgency: 0.35,
      relationshipScore: 0.5,
      noveltyScore:
        context.noveltyByType.rumor ?? 0.6,
      safetyScore: 1,
    });
  }

  for (const item of context.availableGiftItems.slice(0, 2)) {
    candidates.push({
      sourceCharacterId: context.sourceCharacterId,
      childProfileId: context.childProfileId,
      worldId: context.worldId,
      interactionType: "gift",
      title: `${item.itemName} senin olabilir`,
      summary:
        "Bir NPC, bu eşyanın yaklaşan bir macerada işe yarayabileceğini düşünüyor.",
      payload: {
        itemInstanceId: item.itemInstanceId,
        itemName: item.itemName,
      },
      utility: 0.4 + item.shareability * 0.4,
      urgency: 0.2,
      relationshipScore: 0.65,
      noveltyScore:
        context.noveltyByType.gift ?? 0.7,
      safetyScore: 1,
    });
  }

  for (const event of context.unresolvedWorldEvents.slice(0, 3)) {
    const type =
      event.urgency >= 0.7
        ? "warning"
        : "invitation";

    candidates.push({
      sourceCharacterId: context.sourceCharacterId,
      childProfileId: context.childProfileId,
      worldId: context.worldId,
      interactionType: type,
      title:
        type === "warning"
          ? "Dikkat edilmesi gereken bir şey var"
          : "Bir yere davet ediliyorsun",
      summary: event.summary,
      payload: {
        eventId: event.eventId,
        eventType: event.eventType,
      },
      utility: 0.5 + event.urgency * 0.4,
      urgency: event.urgency,
      relationshipScore: 0.55,
      noveltyScore:
        context.noveltyByType[type] ?? 0.75,
      safetyScore: 1,
      expiresAt: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000,
      ),
    });
  }

  for (const goal of context.activeGoals.slice(0, 2)) {
    candidates.push({
      sourceCharacterId: context.sourceCharacterId,
      childProfileId: context.childProfileId,
      worldId: context.worldId,
      interactionType: "quest_seed",
      title: "Bir konuda yardıma ihtiyaç var",
      summary:
        "Bu NPC kendi hedefini ilerletmek için güvenilir bir dosta ihtiyaç duyuyor.",
      payload: {
        goalType: goal.goalType,
      },
      utility: 0.55 + goal.urgency * 0.35,
      urgency: goal.urgency,
      relationshipScore: 0.7,
      noveltyScore:
        context.noveltyByType.quest_seed ?? 0.8,
      safetyScore: 1,
      expiresAt: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000,
      ),
    });
  }

  return candidates;
}
