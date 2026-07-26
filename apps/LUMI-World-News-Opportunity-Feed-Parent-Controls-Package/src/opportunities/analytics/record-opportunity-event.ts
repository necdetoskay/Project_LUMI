import type { QueryExecutor } from "../../db/transaction";
import {
  opportunityAnalyticsEvents,
} from "../../db/schema";

export async function recordOpportunityEvent(
  tx: QueryExecutor,
  input: {
    opportunityId: string;
    householdId: string;
    childProfileId?: string;
    eventType:
      | "viewed"
      | "accepted"
      | "declined"
      | "snoozed"
      | "expired"
      | "story_started";
    metadata?: Record<string, unknown>;
  },
) {
  await tx
    .insert(opportunityAnalyticsEvents)
    .values({
      interactionOpportunityId:
        input.opportunityId,
      householdId: input.householdId,
      childProfileId:
        input.childProfileId,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
      occurredAt: new Date(),
    });
}
