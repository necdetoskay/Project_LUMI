import { describe, expect, it, vi } from "vitest";
import type { Logger } from "@lumi/logger";
import type { NpcSourcePort, RelevanceSourcePort, SimulationStorePort, WorldSourcePort } from "@lumi/simulation/ports";
import { BackgroundWorker } from "../src/worker";
import { EnvWorldDiscoveryAdapter } from "../src/adapters";
import { SimulationJobRunner, type WorldCandidate, type WorldDiscoveryPort } from "../src/job-runner";

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

function makeCandidate(overrides: Partial<WorldCandidate> = {}): WorldCandidate {
  return {
    worldId: crypto.randomUUID(),
    householdId: crypto.randomUUID(),
    childProfileId: crypto.randomUUID(),
    childLastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    now: new Date(),
    ...overrides,
  };
}

function createWorldSource(overrides: Partial<WorldSourcePort> = {}): WorldSourcePort {
  return {
    fetchClock: vi.fn(async () => null),
    fetchNpcsForWorld: vi.fn(async () => []),
    fetchChildLastSeen: vi.fn(async () => null),
    fetchScheduledEvents: vi.fn(async () => []),
    updateClock: vi.fn(async () => undefined),
    recordWorldEvent: vi.fn(async () => undefined),
    freezeWorld: vi.fn(async () => undefined),
    ...overrides,
  } as WorldSourcePort;
}

function createStore(): SimulationStorePort {
  return {
    saveRun: vi.fn(async () => undefined),
    findRun: vi.fn(async () => null),
    saveEffect: vi.fn(async () => true),
    findCommittedEffects: vi.fn(async () => []),
    findPendingEffects: vi.fn(async () => []),
    updateEffectStatus: vi.fn(async () => undefined),
    saveScheduledEvent: vi.fn(async () => undefined),
    updateScheduledEventResolved: vi.fn(async () => undefined),
    findIdempotencyRecord: vi.fn(async () => undefined),
    recordIdempotency: vi.fn(async () => undefined),
  };
}

const npcSource = {
  fetchSnapshots: vi.fn(async () => []),
} satisfies NpcSourcePort;
const relevanceSource = {} as RelevanceSourcePort;

describe("EnvWorldDiscoveryAdapter", () => {
  it("parses valid configured candidates up to the requested limit", async () => {
    const logger = createLogger();
    const raw = JSON.stringify([
      {
        worldId: "00000000-0000-0000-0000-000000000001",
        householdId: "00000000-0000-0000-0000-000000000002",
        childProfileId: "00000000-0000-0000-0000-000000000003",
        childLastSeenAt: "2026-08-01T00:00:00.000Z",
      },
      {
        worldId: "00000000-0000-0000-0000-000000000004",
        householdId: "00000000-0000-0000-0000-000000000005",
        childProfileId: "00000000-0000-0000-0000-000000000006",
        childLastSeenAt: "2026-08-02T00:00:00.000Z",
      },
    ]);

    const adapter = new EnvWorldDiscoveryAdapter(raw, logger);
    const result = await adapter.discoverAbsentWorlds(1, new Date("2026-08-04T00:00:00.000Z"));

    expect(result).toHaveLength(1);
    expect(result[0]?.worldId).toBe("00000000-0000-0000-0000-000000000001");
    expect(result[0]?.childLastSeenAt).toEqual(new Date("2026-08-01T00:00:00.000Z"));
  });

  it("logs and returns no candidates for invalid JSON", async () => {
    const logger = createLogger();
    const adapter = new EnvWorldDiscoveryAdapter("not-json", logger);

    await expect(adapter.discoverAbsentWorlds(10, new Date())).resolves.toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      "worker.discovery.invalid_json",
      "invalid worker world candidate JSON",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});

describe("SimulationJobRunner", () => {
  it("completes cleanly when no absent worlds are discovered", async () => {
    const logger = createLogger();
    const discoverySource = {
      discoverAbsentWorlds: vi.fn(async () => []),
    } satisfies WorldDiscoveryPort;
    const runner = new SimulationJobRunner(
      { intervalMs: 1000, batchSize: 10, maxConcurrent: 2 },
      createStore(),
      createWorldSource(),
      npcSource,
      relevanceSource,
      discoverySource,
      logger,
      "test-seed",
    );

    await expect(runner.run()).resolves.toEqual({
      processed: 0,
      skipped: 0,
      frozen: 0,
      errors: 0,
      details: [],
    });
    expect(discoverySource.discoverAbsentWorlds).toHaveBeenCalledWith(10, expect.any(Date));
    expect(logger.info).toHaveBeenCalledWith(
      "worker.run.complete",
      "simulation run complete",
      expect.objectContaining({ processed: 0, errors: 0 }),
    );
  });

  it("freezes worlds that crossed the 10-day absence threshold", async () => {
    const logger = createLogger();
    const worldSource = createWorldSource();
    const candidate = makeCandidate({
      worldId: "00000000-0000-0000-0000-000000000010",
      childLastSeenAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    });
    const discoverySource = {
      discoverAbsentWorlds: vi.fn(async () => [candidate]),
    } satisfies WorldDiscoveryPort;
    const runner = new SimulationJobRunner(
      { intervalMs: 1000, batchSize: 10, maxConcurrent: 2 },
      createStore(),
      worldSource,
      npcSource,
      relevanceSource,
      discoverySource,
      logger,
      "test-seed",
    );

    const result = await runner.run();

    expect(result).toMatchObject({ processed: 0, skipped: 0, frozen: 1, errors: 0 });
    expect(result.details[0]).toMatchObject({ worldId: candidate.worldId, status: "frozen" });
    expect(worldSource.freezeWorld).toHaveBeenCalledWith(candidate.worldId);
  });

  it("processes discovered worlds with the configured concurrency limit", async () => {
    const logger = createLogger();
    const candidates = [makeCandidate(), makeCandidate(), makeCandidate()];
    const discoverySource = {
      discoverAbsentWorlds: vi.fn(async () => candidates),
    } satisfies WorldDiscoveryPort;
    let active = 0;
    let maxActive = 0;
    const store = createStore();
    store.saveRun = vi.fn(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    });
    const runner = new SimulationJobRunner(
      { intervalMs: 1000, batchSize: 10, maxConcurrent: 2 },
      store,
      createWorldSource(),
      npcSource,
      relevanceSource,
      discoverySource,
      logger,
      "test-seed",
    );

    const result = await runner.run();

    expect(result.processed).toBe(3);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(store.saveRun).toHaveBeenCalledTimes(3);
  });
});

describe("BackgroundWorker", () => {
  it("skips overlapping ticks while a run is active", async () => {
    const logger = createLogger();
    const discoverySource = {
      discoverAbsentWorlds: vi.fn(async () => []),
    } satisfies WorldDiscoveryPort;
    const worker = new BackgroundWorker(
      { intervalMs: 1000, batchSize: 10, maxConcurrent: 2 },
      createStore(),
      createWorldSource(),
      npcSource,
      relevanceSource,
      discoverySource,
      logger,
      "test-seed",
    );

    const firstTick = worker.tick();
    const secondTick = await worker.tick();
    const firstResult = await firstTick;

    expect(secondTick).toBeNull();
    expect(firstResult).toMatchObject({ processed: 0, errors: 0 });
    expect(logger.warn).toHaveBeenCalledWith(
      "worker.tick.skip",
      "already running",
      { reason: "already_running" },
    );
  });
});