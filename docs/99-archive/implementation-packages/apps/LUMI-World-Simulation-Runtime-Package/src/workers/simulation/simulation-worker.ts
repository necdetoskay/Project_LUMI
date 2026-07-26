import { and, eq, lte } from "drizzle-orm";
import {
  jobs,
  simulationPolicies,
} from "../../db/schema";
import { withTransaction } from "../../db/transaction";
import type { WorldSimulationOrchestrator } from "../../simulation/orchestrator/world-simulation.orchestrator";

export class SimulationWorker {
  constructor(
    private readonly orchestrator:
      WorldSimulationOrchestrator,
    private readonly batchSize = 10,
  ) {}

  async runOnce(
    now = new Date(),
  ): Promise<number> {
    const dueJobs =
      await withTransaction(
        async (tx) =>
          tx
            .select()
            .from(jobs)
            .where(
              and(
                eq(
                  jobs.jobType,
                  "world_simulation",
                ),
                eq(
                  jobs.status,
                  "pending",
                ),
                lte(
                  jobs.runAt,
                  now,
                ),
              ),
            )
            .limit(this.batchSize)
            .for("update", {
              skipLocked: true,
            }),
      );

    for (const job of dueJobs) {
      const worldId = String(
        job.payload.worldId,
      );

      try {
        await this.orchestrator.execute(
          worldId,
          now,
        );

        await withTransaction(
          async (tx) => {
            await tx
              .update(jobs)
              .set({
                status:
                  "completed",
                completedAt:
                  new Date(),
              })
              .where(
                eq(
                  jobs.id,
                  job.id,
                ),
              );
          },
        );
      } catch (error) {
        await withTransaction(
          async (tx) => {
            await tx
              .update(jobs)
              .set({
                status: "failed",
                lastError: {
                  message:
                    error instanceof
                    Error
                      ? error.message
                      : "Unknown simulation error",
                },
              })
              .where(
                eq(
                  jobs.id,
                  job.id,
                ),
              );
          },
        );
      }
    }

    return dueJobs.length;
  }
}
