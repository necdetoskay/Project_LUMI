import type { QueryExecutor } from "../../db/transaction";
import {
  interactionInboxItems,
  interactionOpportunities,
} from "../../db/schema";
import { eq } from "drizzle-orm";

export async function deliverInteractionToInbox(
  tx: QueryExecutor,
  input: {
    opportunityId: string;
    householdId: string;
    childProfileId?: string;
  },
) {
  const [item] = await tx
    .insert(interactionInboxItems)
    .values({
      interactionOpportunityId:
        input.opportunityId,
      householdId: input.householdId,
      childProfileId:
        input.childProfileId,
      status: "unread",
      deliveredAt: new Date(),
    })
    .returning();

  await tx
    .update(interactionOpportunities)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
    })
    .where(
      eq(
        interactionOpportunities.id,
        input.opportunityId,
      ),
    );

  return item;
}
