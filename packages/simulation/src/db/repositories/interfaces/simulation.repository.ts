import type {
  SimulationEffectRecord,
  SimulationRunRecord,
  ScheduledEventRecord,
  SimulationIdempotencyLedgerRecord,
  NewSimulationIdempotencyLedgerRecord,
  WorldClockRecord,
} from "../../schema/simulation";

export interface SimulationRepository {
  upsertClock(state: WorldClockRecord): Promise<void>;
  findClock(worldId: string): Promise<WorldClockRecord | undefined>;

  saveRun(run: SimulationRunRecord): Promise<void>;
  findRun(runId: string): Promise<SimulationRunRecord | undefined>;
  findLatestRun(
    worldId: string,
    householdId: string,
  ): Promise<SimulationRunRecord | undefined>;

  saveEffect(effect: SimulationEffectRecord): Promise<boolean>;
  findEffectsByRun(runId: string): Promise<SimulationEffectRecord[]>;
  findCommittedEffects(
    worldId: string,
    householdId: string,
    after?: Date,
  ): Promise<SimulationEffectRecord[]>;
  findPendingEffects(
    worldId: string,
    householdId: string,
  ): Promise<SimulationEffectRecord[]>;
  updateEffectStatus(
    effectId: string,
    status: string,
    committedAt?: Date,
  ): Promise<void>;

  saveScheduledEvent(event: ScheduledEventRecord): Promise<void>;
  findScheduledEvents(
    worldId: string,
    householdId: string,
    unresolvedOnly?: boolean,
  ): Promise<ScheduledEventRecord[]>;
  updateScheduledEventResolved(
    eventId: string,
    resolvedAt: Date,
  ): Promise<void>;

  recordIdempotency(data: NewSimulationIdempotencyLedgerRecord): Promise<void>;
  findIdempotencyRecord(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ): Promise<SimulationIdempotencyLedgerRecord | undefined>;
}
