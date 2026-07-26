import { and, count, eq, gte, lte, sum } from "drizzle-orm";
import {
  costRecords,
  interactionInboxItems,
  interactionOpportunities,
  memories,
  safetyReviews,
  simulationRuns,
  stories,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type { DashboardSummary, DateRange } from "../types";

export async function getParentDashboardSummary(
  tx: QueryExecutor,
  input: {
    childProfileId: string;
    householdId: string;
    range: DateRange;
  },
): Promise<DashboardSummary> {
  const [storyStats] = await tx
    .select({
      total: count(stories.id),
    })
    .from(stories)
    .where(
      and(
        eq(
          stories.childProfileId,
          input.childProfileId,
        ),
        gte(stories.createdAt, input.range.from),
        lte(stories.createdAt, input.range.to),
      ),
    );

  const [opportunityStats] = await tx
    .select({
      total: count(interactionOpportunities.id),
    })
    .from(interactionOpportunities)
    .where(
      and(
        eq(
          interactionOpportunities.childProfileId,
          input.childProfileId,
        ),
        gte(
          interactionOpportunities.createdAt,
          input.range.from,
        ),
        lte(
          interactionOpportunities.createdAt,
          input.range.to,
        ),
      ),
    );

  const [acceptedStats] = await tx
    .select({
      total: count(interactionOpportunities.id),
    })
    .from(interactionOpportunities)
    .where(
      and(
        eq(
          interactionOpportunities.childProfileId,
          input.childProfileId,
        ),
        eq(
          interactionOpportunities.status,
          "accepted",
        ),
      ),
    );

  const [unreadStats] = await tx
    .select({
      total: count(interactionInboxItems.id),
    })
    .from(interactionInboxItems)
    .where(
      and(
        eq(
          interactionInboxItems.householdId,
          input.householdId,
        ),
        eq(
          interactionInboxItems.status,
          "unread",
        ),
      ),
    );

  const [simulationStats] = await tx
    .select({
      total: count(simulationRuns.id),
    })
    .from(simulationRuns)
    .where(
      and(
        gte(
          simulationRuns.startedAt,
          input.range.from,
        ),
        lte(
          simulationRuns.startedAt,
          input.range.to,
        ),
      ),
    );

  const [memoryStats] = await tx
    .select({
      total: count(memories.id),
    })
    .from(memories)
    .where(
      and(
        gte(memories.occurredAt, input.range.from),
        lte(memories.occurredAt, input.range.to),
      ),
    );

  const [costStats] = await tx
    .select({
      total: sum(costRecords.actualCostTry),
    })
    .from(costRecords)
    .where(
      and(
        gte(costRecords.createdAt, input.range.from),
        lte(costRecords.createdAt, input.range.to),
      ),
    );

  const [blockedStats] = await tx
    .select({
      total: count(safetyReviews.id),
    })
    .from(safetyReviews)
    .where(
      and(
        eq(safetyReviews.decision, "block"),
        gte(safetyReviews.createdAt, input.range.from),
        lte(safetyReviews.createdAt, input.range.to),
      ),
    );

  return {
    childProfileId: input.childProfileId,
    storiesCompleted: Number(storyStats?.total ?? 0),
    activeStories: 0,
    opportunitiesReceived: Number(
      opportunityStats?.total ?? 0,
    ),
    opportunitiesAccepted: Number(
      acceptedStats?.total ?? 0,
    ),
    unreadFeedItems: Number(unreadStats?.total ?? 0),
    simulationRuns: Number(
      simulationStats?.total ?? 0,
    ),
    memoriesCreated: Number(memoryStats?.total ?? 0),
    totalCostTry: Number(costStats?.total ?? 0),
    blockedSafetyReviews: Number(
      blockedStats?.total ?? 0,
    ),
  };
}
