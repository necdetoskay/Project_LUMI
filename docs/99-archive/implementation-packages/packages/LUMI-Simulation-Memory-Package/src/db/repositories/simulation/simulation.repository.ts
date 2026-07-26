import type { NewSimulationRunRecord, SimulationRunRecord } from "../../schema/simulation";

export interface SimulationRepository {
  createRun(input: NewSimulationRunRecord): Promise<SimulationRunRecord>;
  markRunning(id: string, effectiveFrom: Date, effectiveTo: Date): Promise<void>;
  markCompleted(id: string): Promise<void>;
  addEvent(input: {
    simulationRunId: string;
    worldId: string;
    eventType: string;
    occurredAt: Date;
    intensity?: number;
    importance?: number;
    payload?: Record<string, unknown>;
  }): Promise<{ id: string }>;
}
