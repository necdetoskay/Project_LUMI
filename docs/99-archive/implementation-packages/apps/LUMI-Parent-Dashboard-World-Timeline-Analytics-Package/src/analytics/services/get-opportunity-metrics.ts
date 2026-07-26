import { and, count, eq, gte, lte } from "drizzle-orm";
import {
  opportunityAnalyticsEvents,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type { DateRange } from "../types";
import { calculateOpportunityMetrics } from "../metrics/calculate-opportunity-metrics";

export async function getOpportunityMetrics(
  tx: QueryExecutor,
  input: {
    householdId: string;
    childProfileId?: string;
    range: DateRange;
  },
) {
  const rows = await tx
    .select({
      eventType:
        opportunityAnalyticsEvents.eventType,
      total:
        count(opportunityAnalyticsEvents.id),
    })
    .from(opportunityAnalyticsEvents)
    .where(
      and(
        eq(
          opportunityAnalyticsEvents.householdId,
          input.householdId,
        ),
        gte(
          opportunityAnalyticsEvents.occurredAt,
          input.range.from,
        ),
        lte(
          opportunityAnalyticsEvents.occurredAt,
          input.range.to,
        ),
      ),
    )
    .groupBy(
      opportunityAnalyticsEvents.eventType,
    );

  const totals = Object.fromEntries(
    rows.map((row) => [
      row.eventType,
      Number(row.total),
    ]),
  );

  return calculateOpportunityMetrics({
    received:
      Number(totals.received ?? 0),
    viewed:
      Number(totals.viewed ?? 0),
    accepted:
      Number(totals.accepted ?? 0),
    declined:
      Number(totals.declined ?? 0),
    snoozed:
      Number(totals.snoozed ?? 0),
    expired:
      Number(totals.expired ?? 0),
    storyStarted:
      Number(totals.story_started ?? 0),
  });
}
