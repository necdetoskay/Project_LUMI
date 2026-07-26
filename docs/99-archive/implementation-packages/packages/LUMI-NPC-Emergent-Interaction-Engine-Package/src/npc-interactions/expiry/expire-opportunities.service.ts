import { and, eq, lt } from "drizzle-orm";
import {
  interactionOpportunities,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";

export async function expireInteractionOpportunities(
  tx: QueryExecutor,
  now = new Date(),
): Promise<number> {
  const expired = await tx
    .update(interactionOpportunities)
    .set({
      status: "expired",
      expiredAt: now,
    })
    .where(
      and(
        eq(
          interactionOpportunities.status,
          "pending",
        ),
        lt(
          interactionOpportunities.expiresAt,
          now,
        ),
      ),
    )
    .returning({
      id: interactionOpportunities.id,
    });

  return expired.length;
}
