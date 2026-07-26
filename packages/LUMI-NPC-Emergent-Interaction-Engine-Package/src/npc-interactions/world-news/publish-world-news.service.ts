import type { QueryExecutor } from "../../db/transaction";
import {
  worldNews,
} from "../../db/schema";
import type { InteractionOpportunity } from "../types";

export async function publishInteractionAsWorldNews(
  tx: QueryExecutor,
  opportunity: InteractionOpportunity,
) {
  if (
    ![
      "warning",
      "invitation",
      "quest_seed",
      "rumor",
    ].includes(opportunity.interactionType)
  ) {
    return undefined;
  }

  const [news] = await tx
    .insert(worldNews)
    .values({
      worldId: opportunity.worldId,
      newsType:
        opportunity.interactionType,
      title: opportunity.title,
      summary: opportunity.summary,
      sourceEntityType:
        "interaction_opportunity",
      sourceEntityId:
        opportunity.id,
      visibility: "household",
      expiresAt:
        opportunity.expiresAt,
    })
    .returning();

  return news;
}
