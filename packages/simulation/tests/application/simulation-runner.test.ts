import { describe, expect, it } from "vitest";
import { SimulationRunner } from "../../src/application/simulation-runner.service";
import { BudgetPlanner } from "../../src/application/budget-planner.service";
import type {
  WorldSourcePort,
  NpcSourcePort,
  SimulationStorePort,
  WorldClockSnapshot,
  NpcSnapshot,
} from "../../src/ports";
import type {
  SimulationEffect,
  SimulationRunState,
  SimulationScheduledEvent,
} from "../../src/domain";
import {
  HOUSEHOLD_ID,
  NPC_A,
  NPC_B,
  WORLD_ID,
  CHILD_LAST_SEEN,
  makeScheduledEvent,
} from "../fixtures/simulation.fixtures";

function makeNpcSnapshot(overrides: Partial<NpcSnapshot> = {}): NpcSnapshot {
  return {
    npcId: NPC_A,
    householdId: HOUSEHOLD_ID,
    characterId: "char-1",
    locationId: "loc-1",
    needTypes: ["hunger"],
    relationshipToCharacter: 0.8,
    lastInteractionAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

function makeClockSnapshot(
  overrides: Partial<WorldClockSnapshot> = {},
): WorldClockSnapshot {
  return {
    worldId: WORLD_ID,
    householdId: HOUSEHOLD_ID,
    currentDay: 1,
    currentHour: 7,
    currentMinute: 0,
    season: "spring",
    lastAdvancedAt: new Date("2026-07-30T08:00:00Z"),
    clockHash: "abc123",
    version: 1,
    checkpointId: null,
    ...overrides,
  };
}

class InMemoryStore implements SimulationStorePort {
  runs: SimulationRunState[] = [];
  effects: SimulationEffect[] = [];
  events: SimulationScheduledEvent[] = [];
  idempotency: Record<string, string> = {};

  async saveRun(run: SimulationRunState): Promise<void> {
    this.runs.push(run);
  }
  async findRun(runId: string): Promise<SimulationRunState | null> {
    return this.runs.find((r) => r.id === runId) ?? null;
  }
  async findLatestRun(
    _worldId: string,
    _householdId: string,
  ): Promise<SimulationRunState | null> {
    return null;
  }
  async saveEffect(effect: SimulationEffect): Promise<boolean> {
    const key = `${effect.householdId}:${effect.idempotencyKey}`;
    if (this.idempotency[key]) return false;
    this.idempotency[key] = effect.id;
    this.effects.push(effect);
    return true;
  }
  async findEffectsByRun(_runId: string): Promise<SimulationEffect[]> {
    return [];
  }
  async findCommittedEffects(
    _worldId: string,
    _householdId: string,
    after?: Date,
  ): Promise<SimulationEffect[]> {
    return this.effects.filter(
      (e) =>
        e.status === "committed" &&
        (!after || (e.committedAt && e.committedAt >= after)),
    );
  }
  async findPendingEffects(
    _worldId: string,
    _householdId: string,
  ): Promise<SimulationEffect[]> {
    return this.effects.filter((e) => e.status === "pending");
  }
  async updateEffectStatus(
    _effectId: string,
    _status: string,
    _committedAt?: Date,
  ): Promise<void> {}
  async saveScheduledEvent(event: SimulationScheduledEvent): Promise<void> {
    this.events.push(event);
  }
  async updateScheduledEventResolved(
    eventId: string,
    resolvedAt: Date,
  ): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.resolved = true;
      event.resolvedAt = resolvedAt;
    }
  }
  async findIdempotencyRecord(
    _householdId: string,
    _operationType: string,
    key: string,
  ): Promise<string | undefined> {
    return this.idempotency[key];
  }
  async recordIdempotency(
    _householdId: string,
    _operationType: string,
    key: string,
    ref: string,
  ): Promise<void> {
    this.idempotency[key] = ref;
  }
}

class InMemoryWorldSource implements WorldSourcePort {
  clock: WorldClockSnapshot;
  npcs: NpcSnapshot[] = [];
  events: SimulationScheduledEvent[] = [];
  recordedEvents: Array<{ type: string; payload: Record<string, unknown> }> =
    [];

  constructor(clock: WorldClockSnapshot) {
    this.clock = clock;
  }

  async fetchClock(
    _worldId: string,
    _householdId: string,
  ): Promise<WorldClockSnapshot | null> {
    return this.clock;
  }
  async fetchNpcsForWorld(): Promise<NpcSnapshot[]> {
    return this.npcs;
  }
  async fetchChildLastSeen(): Promise<Date | null> {
    return CHILD_LAST_SEEN;
  }
  async fetchScheduledEvents(
    _worldId: string,
    _householdId: string,
    unresolvedOnly: boolean,
  ): Promise<SimulationScheduledEvent[]> {
    return unresolvedOnly
      ? this.events.filter((e) => !e.resolved)
      : this.events;
  }
  async updateClock(): Promise<void> {}
  async recordWorldEvent(
    _worldId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.recordedEvents.push({ type, payload });
  }
  async freezeWorld(): Promise<void> {}
}

class InMemoryNpcSource implements NpcSourcePort {
  npcs: NpcSnapshot[] = [];
  async fetchSnapshots(): Promise<NpcSnapshot[]> {
    return this.npcs;
  }
}

function createRunner(
  store: InMemoryStore,
  worldSource: InMemoryWorldSource,
  npcSource: InMemoryNpcSource,
) {
  const budgetPlanner = new BudgetPlanner();
  return new SimulationRunner(store, worldSource, npcSource, budgetPlanner);
}

function effectSemantics(effect: SimulationEffect) {
  return {
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
  };
}

describe("SimulationRunner", () => {
  it("freezes and produces no effects for 14-day absence", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.8 }),
      makeNpcSnapshot({ npcId: NPC_B, relationshipToCharacter: 0.5 }),
    ];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    const result = await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-07-25T08:00:00Z"),
      now: new Date("2026-08-08T12:00:00Z"),
      seed: "seed-1",
    });

    expect(result.frozen).toBe(true);
    expect(result.effects).toHaveLength(0);
    expect(result.committedCount).toBe(0);
    expect(result.runState.timePhase).toBe("frozen");
    expect(result.runState.status).toBe("completed");
  });

  it("runs normal simulation for 1-day absence", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    const result = await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-08-02T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "seed-normal",
    });

    expect(result.frozen).toBe(false);
    expect(result.runState.timePhase).toBe("normal");
    expect(result.runState.childAbsentDays).toBe(1);
    expect(store.runs).toHaveLength(1);
  });

  it("runs reduced simulation for 5-day absence", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.8 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    const result = await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-07-29T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "seed-reduced",
    });

    expect(result.frozen).toBe(false);
    expect(result.runState.timePhase).toBe("reduced");
    expect(result.runState.childAbsentDays).toBe(5);
  });

  it("runs limited simulation for 9-day absence", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.7 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    const result = await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-07-25T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "seed-limited",
    });

    expect(result.frozen).toBe(false);
    expect(result.runState.timePhase).toBe("limited");
    expect(result.runState.childAbsentDays).toBe(9);
  });

  it("commits effects and records world events for committed effects", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.95 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    const result = await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-08-02T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "seed-effects",
    });

    expect(result.runState.status).toBe("completed");

    for (const effect of store.effects) {
      if (effect.status === "committed") {
        expect(effect.committedAt).not.toBeNull();
      }
    }

    const committedCount = store.effects.filter(
      (e) => e.status === "committed",
    ).length;
    if (committedCount > 0) {
      expect(worldSource.recordedEvents.length).toBe(committedCount);
      for (const event of worldSource.recordedEvents) {
        expect(event.type).toBe("SIMULATION_EFFECT_COMMITTED");
      }
    }
  });

  it("does not commit critical or player-preserved scheduled events", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
    ];
    worldSource.events = [
      makeScheduledEvent({
        critical: true,
        playerPreserved: true,
        resolved: false,
      }),
      makeScheduledEvent({
        critical: false,
        playerPreserved: false,
        resolved: false,
      }),
    ];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;

    const runner = createRunner(store, worldSource, npcSource);
    await runner.run({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-08-02T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "seed-events",
    });

    const scheduledEffects = store.effects.filter(
      (e) => e.effectType === "scheduled_event_trigger",
    );

    for (const effect of scheduledEffects) {
      expect(effect.status).toBe("committed");
    }

    expect(store.events[0]!.resolved).toBe(false);
    expect(store.events[1]!.resolved).toBe(true);
  });

  it("retries the same logical run deterministically without duplicate side effects", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;
    const runner = createRunner(store, worldSource, npcSource);
    const input = {
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-08-02T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "retry-seed-1",
    };

    const first = await runner.run(input);
    const persistedAfterFirst = store.effects.length;
    const worldEventsAfterFirst = worldSource.recordedEvents.length;
    const second = await runner.run(input);

    expect(first.effects.length).toBeGreaterThan(0);
    expect(second.effects.map(effectSemantics)).toEqual(
      first.effects.map(effectSemantics),
    );
    expect(second.runState.runHash).toBe(first.runState.runHash);
    expect(store.effects).toHaveLength(persistedAfterFirst);
    expect(worldSource.recordedEvents).toHaveLength(worldEventsAfterFirst);
    expect(second.committedCount).toBe(0);
  });

  it("allows a changed logical world state to persist new effects", async () => {
    const store = new InMemoryStore();
    const worldSource = new InMemoryWorldSource(makeClockSnapshot());
    worldSource.npcs = [
      makeNpcSnapshot({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
    ];
    worldSource.events = [];
    const npcSource = new InMemoryNpcSource();
    npcSource.npcs = worldSource.npcs;
    const runner = createRunner(store, worldSource, npcSource);
    const input = {
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
      childProfileId: "child-1",
      childLastSeenAt: new Date("2026-08-02T08:00:00Z"),
      now: new Date("2026-08-03T12:00:00Z"),
      seed: "retry-seed-1",
    };

    const first = await runner.run(input);
    const persistedAfterFirst = store.effects.length;

    worldSource.clock = makeClockSnapshot({ clockHash: "clock-next", version: 2 });
    worldSource.events = [
      makeScheduledEvent({
        id: "55555555-5555-5555-5555-555555555555",
        resolved: false,
      }),
    ];

    const second = await runner.run(input);

    expect(second.runState.runHash).not.toBe(first.runState.runHash);
    expect(store.effects.length).toBeGreaterThan(persistedAfterFirst);
    expect(second.committedCount).toBeGreaterThan(0);
  });
});
