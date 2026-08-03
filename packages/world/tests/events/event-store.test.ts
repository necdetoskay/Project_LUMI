import { describe, it, expect, beforeEach } from "vitest";
import {
  recordDomainEvent,
  getWorldEvents,
  getEventCountByType,
  __setTestEventDb,
} from "../../src/application/event-store.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockDb(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: any[] = [];
  return {
    insert: () => ({
      values: (data: Record<string, unknown>) => ({
        returning: () => {
          store.push(data);
          return [{ ...data }];
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([...store]),
        }),
      }),
    }),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(createMockDb()),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => [],
        }),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
  };
}

describe("Event store", () => {
  beforeEach(() => {
    const mockDb = createMockDb();
    __setTestEventDb(mockDb);
  });

  it("records a domain event", async () => {
    const event = await recordDomainEvent({
      worldId: "world-1",
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      actorHouseholdId: "household-1",
      payload: { originSeed: "seed-1" },
    });

    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe("WORLD_CREATED");
    expect(event.payload).toEqual({ originSeed: "seed-1" });
  });

  it("records events with different types", async () => {
    await recordDomainEvent({
      worldId: "world-1",
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      payload: {},
    });
    await recordDomainEvent({
      worldId: "world-1",
      eventType: "CHARACTER_ARRIVED",
      aggregateVersion: 1,
      payload: { characterId: "char-1" },
    });

    const worldEvents = await getWorldEvents("world-1");
    expect(worldEvents.length).toBe(2);
  });

  it("returns all recorded events for a given world", async () => {
    await recordDomainEvent({
      worldId: "world-a",
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      payload: {},
    });
    await recordDomainEvent({
      worldId: "world-a",
      eventType: "CHARACTER_ARRIVED",
      aggregateVersion: 1,
      payload: {},
    });

    const eventsA = await getWorldEvents("world-a");
    expect(eventsA.length).toBe(2);
  });

  it("counts events by type", async () => {
    await recordDomainEvent({
      worldId: "world-1",
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      payload: {},
    });
    await recordDomainEvent({
      worldId: "world-1",
      eventType: "CHARACTER_ARRIVED",
      aggregateVersion: 2,
      payload: {},
    });
    await recordDomainEvent({
      worldId: "world-1",
      eventType: "CHECKPOINT_CREATED",
      aggregateVersion: 2,
      payload: {},
    });

    const count = await getEventCountByType("world-1", "WORLD_CREATED");
    expect(count).toBe(1);
  });

  it("records event version and aggregate version", async () => {
    const event = await recordDomainEvent({
      worldId: "world-1",
      eventType: "CHARACTER_MOVED",
      aggregateVersion: 3,
      payload: { from: "loc-1", to: "loc-2" },
    });

    expect(event.aggregateVersion).toBe(3);
    expect(event.eventVersion).toBe(1);
  });

  it("returns events in chronological order", async () => {
    await recordDomainEvent({
      worldId: "world-order",
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      payload: { step: 1 },
    });
    await recordDomainEvent({
      worldId: "world-order",
      eventType: "CHARACTER_ARRIVED",
      aggregateVersion: 1,
      payload: { step: 2 },
    });
    await recordDomainEvent({
      worldId: "world-order",
      eventType: "CHARACTER_MOVED",
      aggregateVersion: 2,
      payload: { step: 3 },
    });

    const events = await getWorldEvents("world-order");
    expect(events.length).toBe(3);
    expect(events[0]!.eventType).toBe("WORLD_CREATED");
    expect(events[1]!.eventType).toBe("CHARACTER_ARRIVED");
    expect(events[2]!.eventType).toBe("CHARACTER_MOVED");
  });
});
