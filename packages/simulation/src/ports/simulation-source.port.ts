import type { EntityRelevance, RelevanceBubble } from "../domain";
import type { WorldClockState } from "../domain";
import type { SimulationEffect, SimulationScheduledEvent, SimulationRunState } from "../domain";

export interface WorldClockSnapshot {
  worldId: string;
  householdId: string;
  currentDay: number;
  currentHour: number;
  currentMinute: number;
  season: string;
  lastAdvancedAt: Date | null;
  clockHash: string;
  version: number;
  checkpointId: string | null;
}

export interface NpcSnapshot {
  npcId: string;
  householdId: string;
  characterId: string;
  locationId: string | null;
  needTypes: string[];
  relationshipToCharacter: number;
  lastInteractionAt: Date;
}

export interface WorldSourcePort {
  fetchClock(worldId: string, householdId: string): Promise<WorldClockSnapshot | null>;
  fetchNpcsForWorld(worldId: string, householdId: string): Promise<NpcSnapshot[]>;
  fetchChildLastSeen(worldId: string, childProfileId: string): Promise<Date | null>;
  fetchScheduledEvents(
    worldId: string,
    householdId: string,
    unresolvedOnly: boolean,
  ): Promise<SimulationScheduledEvent[]>;
  updateClock(state: WorldClockState): Promise<void>;
  recordWorldEvent(
    worldId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
  freezeWorld(worldId: string): Promise<void>;
}

export interface SimulationStorePort {
  saveRun(run: SimulationRunState): Promise<void>;
  findRun(runId: string): Promise<SimulationRunState | null>;
  saveEffect(effect: SimulationEffect): Promise<boolean>;
  findCommittedEffects(
    worldId: string,
    householdId: string,
    after?: Date,
  ): Promise<SimulationEffect[]>;
  findPendingEffects(
    worldId: string,
    householdId: string,
  ): Promise<SimulationEffect[]>;
  updateEffectStatus(
    effectId: string,
    status: "pending" | "committed",
  ): Promise<void>;
  saveScheduledEvent(event: SimulationScheduledEvent): Promise<void>;
  updateScheduledEventResolved(
    eventId: string,
    resolvedAt: Date,
  ): Promise<void>;
  findIdempotencyRecord(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ): Promise<string | undefined>;
  recordIdempotency(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
    referenceId: string,
  ): Promise<void>;
}

export interface RelevanceSourcePort {
  fetchRelevanceBubble(
    worldId: string,
    householdId: string,
    centerEntityId: string,
  ): Promise<RelevanceBubble>;
  fetchEntityRelevance(
    entityId: string,
    worldId: string,
    householdId: string,
  ): Promise<EntityRelevance | null>;
}

export interface NpcSourcePort {
  fetchSnapshots(
    worldId: string,
    householdId: string,
  ): Promise<NpcSnapshot[]>;
}
