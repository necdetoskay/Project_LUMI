import { eq } from "drizzle-orm";
import type { QueryExecutor } from "../../transaction";
import { simulationEvents, simulationRuns, type NewSimulationRunRecord } from "../../schema/simulation";
import type { SimulationRepository } from "./simulation.repository";

export class DrizzleSimulationRepository implements SimulationRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async createRun(input: NewSimulationRunRecord) {
    const [record] = await this.executor.insert(simulationRuns).values(input).returning();
    if (!record) throw new Error("Simulation run creation returned no record");
    return record;
  }

  async markRunning(id: string, effectiveFrom: Date, effectiveTo: Date): Promise<void> {
    await this.executor.update(simulationRuns).set({
      status: "running",
      startedAt: new Date(),
      effectiveFrom,
      effectiveTo,
      updatedAt: new Date(),
    }).where(eq(simulationRuns.id, id));
  }

  async markCompleted(id: string): Promise<void> {
    await this.executor.update(simulationRuns).set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(simulationRuns.id, id));
  }

  async addEvent(input: {
    simulationRunId: string;
    worldId: string;
    eventType: string;
    occurredAt: Date;
    intensity?: number;
    importance?: number;
    payload?: Record<string, unknown>;
  }) {
    const [record] = await this.executor.insert(simulationEvents).values({
      ...input,
      intensity: input.intensity ?? 0.5,
      importance: input.importance ?? 0.5,
      payload: input.payload ?? {},
    }).returning({ id: simulationEvents.id });
    if (!record) throw new Error("Simulation event creation returned no record");
    return record;
  }
}
