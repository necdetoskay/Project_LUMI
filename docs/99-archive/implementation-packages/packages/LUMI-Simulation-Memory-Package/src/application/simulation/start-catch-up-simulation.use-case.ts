import { DrizzleSimulationRepository } from "../../db/repositories/simulation/drizzle-simulation.repository";
import { simulationPolicies } from "../../db/schema/simulation";
import { eq } from "drizzle-orm";
import { withTransaction } from "../../db/transaction";
import { calculateCatchUpWindow } from "./calculate-catch-up-window";

export async function startCatchUpSimulation(input: {
  worldId: string;
  lastActiveAt: Date;
  now: Date;
}) {
  return withTransaction(async (tx) => {
    const [policy] = await tx.select().from(simulationPolicies)
      .where(eq(simulationPolicies.worldId, input.worldId)).limit(1);

    const window = calculateCatchUpWindow({
      lastActiveAt: input.lastActiveAt,
      now: input.now,
      maxCatchUpDays: policy?.maxCatchUpDays ?? 10,
      freezeAfterLimit: policy?.freezeAfterLimit ?? true,
    });

    const repository = new DrizzleSimulationRepository(tx);
    const run = await repository.createRun({
      worldId: input.worldId,
      runType: "catch_up",
      status: window.frozen ? "skipped" : "pending",
      requestedFrom: window.requestedFrom,
      requestedTo: window.requestedTo,
      effectiveFrom: window.effectiveFrom,
      effectiveTo: window.effectiveTo,
      metadata: {
        skippedDays: window.skippedDays,
        frozen: window.frozen,
      },
    });

    return { run, window };
  });
}
