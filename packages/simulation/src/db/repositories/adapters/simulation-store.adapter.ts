import type { SimulationStorePort } from "../../../ports/simulation-source.port";
import type {
  SimulationEffect,
  SimulationScheduledEvent,
  SimulationRunState,
} from "../../../domain";
import type { SimulationRepository } from "../interfaces/simulation.repository";
import type {
  SimulationEffectRecord,
  SimulationRunRecord,
  ScheduledEventRecord,
} from "../../schema/simulation";

function toSimulationEffect(record: SimulationEffectRecord): SimulationEffect {
  return record as unknown as SimulationEffect;
}

function toSimulationRunState(record: SimulationRunRecord): SimulationRunState {
  return record as unknown as SimulationRunState;
}

function toScheduledEvent(
  record: ScheduledEventRecord,
): SimulationScheduledEvent {
  return record as unknown as SimulationScheduledEvent;
}

export class SimulationStoreAdapter implements SimulationStorePort {
  constructor(private readonly repo: SimulationRepository) {}

  async saveRun(run: SimulationRunState): Promise<void> {
    await this.repo.saveRun(run as unknown as SimulationRunRecord);
  }

  async findRun(runId: string): Promise<SimulationRunState | null> {
    const record = await this.repo.findRun(runId);
    return record ? toSimulationRunState(record) : null;
  }

  async saveEffect(effect: SimulationEffect): Promise<boolean> {
    return this.repo.saveEffect(effect as unknown as SimulationEffectRecord);
  }

  async findCommittedEffects(
    worldId: string,
    householdId: string,
    after?: Date,
  ): Promise<SimulationEffect[]> {
    const records = await this.repo.findCommittedEffects(
      worldId,
      householdId,
      after,
    );
    return records.map(toSimulationEffect);
  }

  async findPendingEffects(
    worldId: string,
    householdId: string,
  ): Promise<SimulationEffect[]> {
    const records = await this.repo.findPendingEffects(worldId, householdId);
    return records.map(toSimulationEffect);
  }

  async updateEffectStatus(
    effectId: string,
    status: "pending" | "committed",
  ): Promise<void> {
    await this.repo.updateEffectStatus(effectId, status);
  }

  async saveScheduledEvent(event: SimulationScheduledEvent): Promise<void> {
    await this.repo.saveScheduledEvent(toScheduledEvent(event));
  }

  async updateScheduledEventResolved(
    eventId: string,
    resolvedAt: Date,
  ): Promise<void> {
    await this.repo.updateScheduledEventResolved(eventId, resolvedAt);
  }

  async findIdempotencyRecord(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ): Promise<string | undefined> {
    const record = await this.repo.findIdempotencyRecord(
      householdId,
      operationType,
      idempotencyKey,
    );
    return record?.idempotencyKey;
  }

  async recordIdempotency(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
    _referenceId: string,
  ): Promise<void> {
    await this.repo.recordIdempotency({
      id: crypto.randomUUID(),
      householdId,
      worldId: "",
      operationType,
      idempotencyKey,
      createdAt: new Date(),
    });
  }
}
