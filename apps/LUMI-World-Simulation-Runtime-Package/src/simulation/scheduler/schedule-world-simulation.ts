import { jobs } from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";

export async function scheduleWorldSimulation(
  tx: QueryExecutor,
  input: {
    worldId: string;
    runAt: Date;
    reason:
      | "user_return"
      | "periodic"
      | "manual"
      | "story_completion";
  },
) {
  const [job] = await tx
    .insert(jobs)
    .values({
      jobType:
        "world_simulation",
      status: "pending",
      runAt: input.runAt,
      payload: {
        worldId:
          input.worldId,
        reason: input.reason,
      },
    })
    .returning();

  return job;
}
