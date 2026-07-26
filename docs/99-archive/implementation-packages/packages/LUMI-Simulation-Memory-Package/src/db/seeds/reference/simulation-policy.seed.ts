import { db } from "../../client";
import { simulationPolicies } from "../../schema/simulation";

export async function seedDefaultSimulationPolicy(worldId: string): Promise<void> {
  await db.insert(simulationPolicies).values({
    worldId,
    policyCode: "default",
    maxCatchUpDays: 10,
    fullIntensityDays: 1,
    minimumIntensity: 0.1,
    freezeAfterLimit: true,
    config: {
      decayMode: "linear",
      prioritizeCriticalEntities: true,
      ignoreIrrelevantEntities: true,
    },
  }).onConflictDoNothing({
    target: simulationPolicies.worldId,
  });
}
