import { eq } from "drizzle-orm";
import { storyOutcomes, storySessions } from "../../db/schema/story";
import { withTransaction } from "../../db/transaction";

export async function completeStorySession(input: {
  storySessionId: string;
  outcomeCode: string;
  summary?: string;
  payload?: Record<string, unknown>;
}) {
  return withTransaction(async (tx) => {
    await tx.update(storySessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storySessions.id, input.storySessionId));

    await tx.insert(storyOutcomes).values({
      storySessionId: input.storySessionId,
      outcomeCode: input.outcomeCode,
      summary: input.summary,
      payload: input.payload ?? {},
    });
  });
}
