import { describe, expect, it } from "vitest";
import { RecapService } from "../../src/application/recap.service";
import type { SimulationStorePort } from "../../src/ports";
import type { SimulationEffect, SimulationRunState } from "../../src/domain";
import {
  HOUSEHOLD_ID,
  NPC_A,
  WORLD_ID,
  makeCommittedEffect,
} from "../fixtures/simulation.fixtures";

class InMemoryStore implements SimulationStorePort {
  effects: SimulationEffect[] = [];

  async saveRun(): Promise<void> {}
  async findRun(): Promise<SimulationRunState | null> {
    return null;
  }
  async findLatestRun(): Promise<SimulationRunState | null> {
    return null;
  }
  async saveEffect(effect: SimulationEffect): Promise<boolean> {
    this.effects.push(effect);
    return true;
  }
  async findEffectsByRun(): Promise<SimulationEffect[]> {
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
  async findPendingEffects(): Promise<SimulationEffect[]> {
    return [];
  }
  async updateEffectStatus(): Promise<void> {}
  async saveScheduledEvent(): Promise<void> {}
  async updateScheduledEventResolved(): Promise<void> {}
  async findIdempotencyRecord(): Promise<string | undefined> {
    return undefined;
  }
  async recordIdempotency(): Promise<void> {}
}

describe("RecapService", () => {
  it("builds recap from committed effects sorted by time", async () => {
    const store = new InMemoryStore();
    store.effects = [
      makeCommittedEffect({
        id: "eff-2",
        committedAt: new Date("2026-08-03T10:00:00Z"),
        effectType: "environment_change",
        payload: { description: "A rainbow appeared over the hills." },
      }),
      makeCommittedEffect({
        id: "eff-1",
        committedAt: new Date("2026-08-02T12:00:00Z"),
        effectType: "npc_routine",
        npcId: NPC_A,
        payload: { action: "visited the market" },
      }),
      makeCommittedEffect({
        id: "eff-3",
        status: "pending" as never,
      }),
    ];

    const service = new RecapService(store);
    const recap = await service.buildRecap(WORLD_ID, HOUSEHOLD_ID);

    expect(recap.entries).toHaveLength(2);
    expect(recap.entries[0]!.committedAt).toEqual(
      new Date("2026-08-02T12:00:00Z"),
    );
    expect(recap.entries[1]!.committedAt).toEqual(
      new Date("2026-08-03T10:00:00Z"),
    );
  });

  it("excludes pending effects from recap", async () => {
    const store = new InMemoryStore();
    store.effects = [
      makeCommittedEffect({
        status: "committed",
        committedAt: new Date("2026-08-02T12:00:00Z"),
      }),
      makeCommittedEffect({
        status: "pending" as never,
        committedAt: null,
        idempotencyKey: "pending-key",
      }),
    ];

    const service = new RecapService(store);
    const recap = await service.buildRecap(WORLD_ID, HOUSEHOLD_ID);

    expect(recap.totalCommitted).toBe(1);
    expect(recap.entries).toHaveLength(1);
  });

  it("filters by since date", async () => {
    const store = new InMemoryStore();
    store.effects = [
      makeCommittedEffect({
        id: "eff-old",
        committedAt: new Date("2026-08-01T00:00:00Z"),
        idempotencyKey: "old",
      }),
      makeCommittedEffect({
        id: "eff-new",
        committedAt: new Date("2026-08-03T00:00:00Z"),
        idempotencyKey: "new",
      }),
    ];

    const service = new RecapService(store);
    const recap = await service.buildRecap(
      WORLD_ID,
      HOUSEHOLD_ID,
      new Date("2026-08-02T00:00:00Z"),
    );

    expect(recap.entries).toHaveLength(1);
    expect(recap.entries[0]!.id).toBe("eff-new");
  });

  it("generates summaries for different effect types", async () => {
    const store = new InMemoryStore();
    const service = new RecapService(store);

    store.effects = [
      makeCommittedEffect({
        effectType: "npc_routine",
        npcId: NPC_A,
        payload: { action: "rested at home" },
      }),
      makeCommittedEffect({
        effectType: "environment_change",
        payload: { description: "The flowers bloomed overnight." },
      }),
      makeCommittedEffect({
        effectType: "location_condition_change",
      }),
      makeCommittedEffect({
        effectType: "ecology_change",
      }),
      makeCommittedEffect({
        effectType: "item_degradation",
      }),
    ];

    const recap = await service.buildRecap(WORLD_ID, HOUSEHOLD_ID);

    expect(recap.entries).toHaveLength(5);
    expect(recap.entries[0]!.summary).toContain("rested at home");
    expect(recap.entries[1]!.summary).toBe("The flowers bloomed overnight.");
    expect(recap.entries[2]!.summary).toBe("Bir yer durumu değişti.");
  });

  it("recap is consistent with DB events", async () => {
    const store = new InMemoryStore();
    store.effects = [
      makeCommittedEffect({ id: "e1" }),
      makeCommittedEffect({ id: "e2" }),
    ];

    const service = new RecapService(store);
    const recap = await service.buildRecap(WORLD_ID, HOUSEHOLD_ID);

    expect(recap.totalCommitted).toBe(2);
    expect(recap.entries).toHaveLength(2);
  });
});
