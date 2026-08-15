import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../../src/db/client";
import { DrizzleWorldEventReader } from "../../src/db/repositories/drizzle";
import { worldEventStore } from "../../src/db/schema/world";

const databaseUrl = process.env.DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;

describeIntegration("DrizzleWorldEventReader", () => {
  const db = createDatabase(databaseUrl!);
  const reader = new DrizzleWorldEventReader(db);
  const worldId = randomUUID();
  const otherWorldId = randomUUID();
  const householdId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID()];

  beforeAll(async () => {
    await db.insert(worldEventStore).values([
      {
        id: ids[0],
        worldId,
        eventType: "older-event",
        aggregateVersion: 1,
        actorHouseholdId: householdId,
        payload: { order: 1 },
        createdAt: new Date("2026-08-15T08:00:00.000Z"),
      },
      {
        id: ids[1],
        worldId,
        eventType: "newer-event",
        aggregateVersion: 2,
        actorHouseholdId: householdId,
        payload: { order: 2 },
        createdAt: new Date("2026-08-15T09:00:00.000Z"),
      },
      {
        id: ids[2],
        worldId: otherWorldId,
        eventType: "other-world-event",
        aggregateVersion: 1,
        payload: {},
        createdAt: new Date("2026-08-15T10:00:00.000Z"),
      },
    ]);
  });

  afterAll(async () => {
    // Integration databases are disposable; rows use random world IDs to avoid collisions.
  });

  it("returns only requested world events newest-first and bounded by limit", async () => {
    const events = await reader.listRecent(worldId, 1);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: ids[1],
      worldId,
      eventType: "newer-event",
      aggregateVersion: 2,
      actorHouseholdId: householdId,
      payload: { order: 2 },
    });
  });

  it("returns an empty result for a non-positive limit", async () => {
    await expect(reader.listRecent(worldId, 0)).resolves.toEqual([]);
  });
});
