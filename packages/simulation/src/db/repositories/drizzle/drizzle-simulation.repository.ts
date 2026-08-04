import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../../client";
import type { SimulationRepository } from "../interfaces/simulation.repository";
import {
  worldClocks,
  simulationRuns,
  simulationEffects,
  scheduledEvents,
  simulationIdempotencyLedger,
  type WorldClockRecord,
  type SimulationRunRecord,
  type SimulationEffectRecord,
  type ScheduledEventRecord,
  type SimulationIdempotencyLedgerRecord,
  type NewSimulationIdempotencyLedgerRecord,
} from "../../schema/simulation";
import { sql } from "drizzle-orm";

export class DrizzleSimulationRepository implements SimulationRepository {
  constructor(private readonly db: Database) {}

  async upsertClock(state: WorldClockRecord): Promise<void> {
    await this.db
      .insert(worldClocks)
      .values({
        worldId: state.worldId,
        householdId: state.householdId,
        currentDay: state.currentDay,
        currentHour: state.currentHour,
        currentMinute: state.currentMinute,
        season: state.season,
        lastAdvancedAt: state.lastAdvancedAt,
        clockHash: state.clockHash,
        version: state.version,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      })
      .onConflictDoUpdate({
        target: worldClocks.worldId,
        set: {
          currentDay: sql`${worldClocks.currentDay} + EXCLUDED.currentDay`,
          currentHour: sql`EXCLUDED.current_hour`,
          currentMinute: sql`EXCLUDED.current_minute`,
          season: sql`EXCLUDED.season`,
          lastAdvancedAt: sql`EXCLUDED.last_advanced_at`,
          clockHash: sql`EXCLUDED.clock_hash`,
          version: sql`EXCLUDED.version`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });
  }

  async findClock(worldId: string): Promise<WorldClockRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(worldClocks)
      .where(eq(worldClocks.worldId, worldId))
      .limit(1);
    return row;
  }

  async saveRun(run: SimulationRunRecord): Promise<void> {
    const values = {
      id: run.id,
      worldId: run.worldId,
      householdId: run.householdId,
      childLastSeenAt: run.childLastSeenAt,
      childAbsentDays: run.childAbsentDays,
      timePhase: run.timePhase,
      budgetTokens: run.budgetTokens,
      runHash: run.runHash,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      checkpointId: run.checkpointId,
      createdAt: run.createdAt,
    };
    await this.db.insert(simulationRuns).values(values).onConflictDoNothing();
  }

  async findRun(runId: string): Promise<SimulationRunRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(simulationRuns)
      .where(eq(simulationRuns.id, runId))
      .limit(1);
    return row;
  }

  async findLatestRun(
    worldId: string,
    householdId: string,
  ): Promise<SimulationRunRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(simulationRuns)
      .where(
        and(
          eq(simulationRuns.worldId, worldId),
          eq(simulationRuns.householdId, householdId),
        ),
      )
      .orderBy(desc(simulationRuns.createdAt))
      .limit(1);
    return row;
  }

  async saveEffect(effect: SimulationEffectRecord): Promise<boolean> {
    await this.db
      .insert(simulationEffects)
      .values({
        id: effect.id,
        runId: effect.runId,
        worldId: effect.worldId,
        householdId: effect.householdId,
        npcId: effect.npcId,
        entityId: effect.entityId,
        effectType: effect.effectType,
        severity: effect.severity,
        payload: effect.payload,
        evidence: effect.evidence,
        status: effect.status,
        idempotencyKey: effect.idempotencyKey,
        committedAt: effect.committedAt,
        createdAt: effect.createdAt,
      })
      .onConflictDoNothing();
    return true;
  }

  async findEffectsByRun(runId: string): Promise<SimulationEffectRecord[]> {
    return this.db
      .select()
      .from(simulationEffects)
      .where(eq(simulationEffects.runId, runId));
  }

  async findCommittedEffects(
    worldId: string,
    householdId: string,
    after?: Date,
  ): Promise<SimulationEffectRecord[]> {
    const conditions = [
      eq(simulationEffects.worldId, worldId),
      eq(simulationEffects.householdId, householdId),
      eq(simulationEffects.status, "committed"),
    ];
    if (after) {
      conditions.push(sql`${simulationEffects.committedAt} >= ${after}`);
    }
    return this.db
      .select()
      .from(simulationEffects)
      .where(and(...conditions));
  }

  async findPendingEffects(
    worldId: string,
    householdId: string,
  ): Promise<SimulationEffectRecord[]> {
    return this.db
      .select()
      .from(simulationEffects)
      .where(
        and(
          eq(simulationEffects.worldId, worldId),
          eq(simulationEffects.householdId, householdId),
          eq(simulationEffects.status, "pending"),
        ),
      );
  }

  async updateEffectStatus(
    effectId: string,
    status: string,
    committedAt?: Date,
  ): Promise<void> {
    await this.db
      .update(simulationEffects)
      .set({
        status: status as never,
        committedAt: committedAt ?? null,
      })
      .where(eq(simulationEffects.id, effectId));
  }

  async saveScheduledEvent(event: ScheduledEventRecord): Promise<void> {
    await this.db
      .insert(scheduledEvents)
      .values({
        id: event.id,
        worldId: event.worldId,
        householdId: event.householdId,
        scheduledAt: event.scheduledAt,
        eventType: event.eventType,
        critical: event.critical,
        playerPreserved: event.playerPreserved,
        payload: event.payload,
        resolved: event.resolved,
        resolvedAt: event.resolvedAt,
        createdAt: event.createdAt,
      })
      .onConflictDoNothing();
  }

  async findScheduledEvents(
    worldId: string,
    householdId: string,
    unresolvedOnly = false,
  ): Promise<ScheduledEventRecord[]> {
    if (unresolvedOnly) {
      return this.db
        .select()
        .from(scheduledEvents)
        .where(
          and(
            eq(scheduledEvents.worldId, worldId),
            eq(scheduledEvents.householdId, householdId),
            eq(scheduledEvents.resolved, false),
          ),
        );
    }
    return this.db
      .select()
      .from(scheduledEvents)
      .where(
        and(
          eq(scheduledEvents.worldId, worldId),
          eq(scheduledEvents.householdId, householdId),
        ),
      );
  }

  async updateScheduledEventResolved(
    eventId: string,
    resolvedAt: Date,
  ): Promise<void> {
    await this.db
      .update(scheduledEvents)
      .set({
        resolved: true,
        resolvedAt,
      })
      .where(eq(scheduledEvents.id, eventId));
  }

  async recordIdempotency(
    data: NewSimulationIdempotencyLedgerRecord,
  ): Promise<void> {
    await this.db.insert(simulationIdempotencyLedger).values({
      id: data.id,
      householdId: data.householdId,
      worldId: data.worldId,
      operationType: data.operationType,
      idempotencyKey: data.idempotencyKey,
      createdAt: data.createdAt,
    });
  }

  async findIdempotencyRecord(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ): Promise<SimulationIdempotencyLedgerRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(simulationIdempotencyLedger)
      .where(
        and(
          eq(simulationIdempotencyLedger.householdId, householdId),
          eq(simulationIdempotencyLedger.operationType, operationType),
          eq(simulationIdempotencyLedger.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return row;
  }
}
