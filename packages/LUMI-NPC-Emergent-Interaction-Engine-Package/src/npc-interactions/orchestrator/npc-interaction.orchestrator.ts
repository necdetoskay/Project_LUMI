import { desc, eq } from "drizzle-orm";
import {
  characterGoals,
  characterRelationships,
  characters,
  interactionOpportunities,
  itemDefinitions,
  itemInstances,
  rumors,
  simulationEvents,
} from "../../db/schema";
import {
  withTransaction,
} from "../../db/transaction";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { generateInteractionCandidates } from "../intent/generate-interaction-candidates";
import { rankInteractionCandidates } from "../scoring/interaction-score";
import { calculateNoveltyScore } from "../novelty/novelty-control";
import { reviewInteractionSafety } from "../safety/interaction-safety";
import { createInteractionOpportunity } from "../persistence/create-interaction-opportunity.service";
import { publishInteractionAsWorldNews } from "../world-news/publish-world-news.service";

export class NpcInteractionOrchestrator {
  async execute(input: {
    worldId: string;
    sourceCharacterId: string;
    childProfileId?: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();

    return withTransaction(async (tx) => {
      const [sourceCharacter] = await tx
        .select()
        .from(characters)
        .where(
          eq(
            characters.id,
            input.sourceCharacterId,
          ),
        )
        .limit(1);

      if (!sourceCharacter) {
        throw new Error(
          "Source NPC not found",
        );
      }

      const goals = await tx
        .select()
        .from(characterGoals)
        .where(
          eq(
            characterGoals.characterId,
            input.sourceCharacterId,
          ),
        );

      const knownRumors = await tx
        .select()
        .from(rumors)
        .where(
          eq(
            rumors.knownByCharacterId,
            input.sourceCharacterId,
          ),
        )
        .orderBy(desc(rumors.createdAt))
        .limit(10);

      const giftItems = await tx
        .select({
          itemInstanceId:
            itemInstances.id,
          itemName:
            itemDefinitions.name,
          shareability:
            itemDefinitions.shareability,
        })
        .from(itemInstances)
        .innerJoin(
          itemDefinitions,
          eq(
            itemInstances.itemDefinitionId,
            itemDefinitions.id,
          ),
        )
        .where(
          eq(
            itemInstances.ownerCharacterId,
            input.sourceCharacterId,
          ),
        )
        .limit(10);

      const worldEvents = await tx
        .select()
        .from(simulationEvents)
        .where(
          eq(
            simulationEvents.worldId,
            input.worldId,
          ),
        )
        .orderBy(
          desc(simulationEvents.occurredAt),
        )
        .limit(10);

      const relationships = await tx
        .select()
        .from(characterRelationships)
        .where(
          eq(
            characterRelationships.sourceCharacterId,
            input.sourceCharacterId,
          ),
        );

      const recentInteractions = await tx
        .select()
        .from(interactionOpportunities)
        .where(
          eq(
            interactionOpportunities.sourceCharacterId,
            input.sourceCharacterId,
          ),
        )
        .orderBy(
          desc(
            interactionOpportunities.createdAt,
          ),
        )
        .limit(30);

      const noveltyByType = Object.fromEntries(
        [
          "rumor",
          "gift",
          "warning",
          "invitation",
          "quest_seed",
        ].map((type) => [
          type,
          calculateNoveltyScore({
            sameTypeCountLast7Days:
              recentInteractions.filter(
                (item) =>
                  item.interactionType === type,
              ).length,
            sameSourceCountLast7Days:
              recentInteractions.length,
            similarSummaryCountLast30Days: 0,
          }),
        ]),
      );

      const candidates =
        generateInteractionCandidates({
          worldId: input.worldId,
          sourceCharacterId:
            input.sourceCharacterId,
          childProfileId:
            input.childProfileId,
          nearbyCharacterIds:
            relationships.map(
              (relationship) =>
                relationship.targetCharacterId,
            ),
          activeGoals: goals
            .filter(
              (goal) =>
                goal.status === "active",
            )
            .map((goal) => ({
              goalType: goal.goalType,
              urgency: Number(goal.urgency),
            })),
          knownRumors: knownRumors.map(
            (rumor) => ({
              rumorId: rumor.id,
              summary: rumor.summary,
              reliability: Number(
                rumor.reliability,
              ),
            }),
          ),
          availableGiftItems:
            giftItems.map((item) => ({
              itemInstanceId:
                item.itemInstanceId,
              itemName: item.itemName,
              shareability: Number(
                item.shareability,
              ),
            })),
          unresolvedWorldEvents:
            worldEvents.map((event) => ({
              eventId: event.id,
              eventType:
                event.eventType,
              summary: event.summary,
              urgency: Number(
                event.payload?.urgency ?? 0.5,
              ),
            })),
          relationshipScores:
            Object.fromEntries(
              relationships.map(
                (relationship) => [
                  relationship.targetCharacterId,
                  Number(
                    relationship.strength,
                  ),
                ],
              ),
            ),
          noveltyByType,
        });

      const ranked =
        rankInteractionCandidates(
          candidates,
        );

      const selected = ranked.find(
        (candidate) => {
          const safety =
            reviewInteractionSafety(
              candidate,
            );

          return (
            safety.allowed &&
            candidate.noveltyScore >= 0.25 &&
            candidate.safetyScore >= 0.8
          );
        },
      );

      if (!selected) {
        return {
          created: false,
          reason:
            "No eligible interaction candidate",
        };
      }

      const target =
        relationships
          .sort(
            (a, b) =>
              Number(b.strength) -
              Number(a.strength),
          )[0];

      const opportunity =
        await createInteractionOpportunity(
          tx,
          {
            ...selected,
            targetCharacterId:
              target?.targetCharacterId,
          },
        );

      await publishInteractionAsWorldNews(
        tx,
        opportunity,
      );

      const auditRepository =
        new DrizzleAuditRepository(tx);
      const outboxRepository =
        new DrizzleOutboxRepository(tx);

      await auditRepository.append({
        actorType: "system",
        action:
          "npc.interaction.created",
        entityType:
          "interaction_opportunity",
        entityId:
          opportunity.id,
        afterState: {
          sourceCharacterId:
            input.sourceCharacterId,
          interactionType:
            opportunity.interactionType,
          targetCharacterId:
            opportunity.targetCharacterId,
          createdAt:
            now.toISOString(),
        },
      });

      await outboxRepository.enqueue({
        aggregateType:
          "interaction_opportunity",
        aggregateId:
          opportunity.id,
        eventType:
          "npc.interaction.created",
        payload: {
          opportunityId:
            opportunity.id,
          worldId: input.worldId,
          childProfileId:
            input.childProfileId,
        },
      });

      return {
        created: true,
        opportunity,
      };
    });
  }
}
