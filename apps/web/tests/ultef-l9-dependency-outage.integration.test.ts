import net from "node:net";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import pg from "pg";

import {
  WorldCommitService,
  __setTestCommitDb,
} from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "@lumi/story/domain";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  cleanupStoryFixture,
  seedStoryFixture,
  type StoryFixtureIds,
} from "../../../packages/story/tests/integration/ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L9-DEPENDENCY-OUTAGE-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

class TcpProxy {
  private server: net.Server | null = null;
  private sockets = new Set<net.Socket>();
  private listenPort = 0;

  constructor(
    private readonly targetHost: string,
    private readonly targetPort: number,
  ) {}

  get port() {
    return this.listenPort;
  }

  async start(port = 0) {
    if (this.server) return;
    this.server = net.createServer((client) => {
      const upstream = net.createConnection({
        host: this.targetHost,
        port: this.targetPort,
      });
      this.sockets.add(client);
      this.sockets.add(upstream);
      client.pipe(upstream);
      upstream.pipe(client);
      const cleanup = () => {
        this.sockets.delete(client);
        this.sockets.delete(upstream);
      };
      client.once("close", cleanup);
      upstream.once("close", cleanup);
      client.once("error", () => upstream.destroy());
      upstream.once("error", () => client.destroy());
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, "127.0.0.1", () => {
        const address = this.server!.address();
        if (!address || typeof address === "string") {
          reject(new Error("TCP_PROXY_ADDRESS_REQUIRED"));
          return;
        }
        this.listenPort = address.port;
        resolve();
      });
    });
  }

  async stop() {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  async restart() {
    const port = this.listenPort;
    await this.start(port);
  }
}

class RedisPingServer {
  private server: net.Server | null = null;
  private sockets = new Set<net.Socket>();
  private listenPort = 0;

  get port() {
    return this.listenPort;
  }

  async start(port = 0) {
    if (this.server) return;
    this.server = net.createServer((socket) => {
      this.sockets.add(socket);
      socket.on("data", (data) => {
        if (data.toString().includes("PING")) socket.write("+PONG\r\n");
      });
      socket.once("close", () => this.sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, "127.0.0.1", () => {
        const address = this.server!.address();
        if (!address || typeof address === "string") {
          reject(new Error("REDIS_TEST_ADDRESS_REQUIRED"));
          return;
        }
        this.listenPort = address.port;
        resolve();
      });
    });
  }

  async stop() {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  async restart() {
    const port = this.listenPort;
    await this.start(port);
  }
}

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 dependency outage requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

function fixture(): StoryFixtureIds {
  return {
    householdId: crypto.randomUUID(),
    childProfileId: crypto.randomUUID(),
    characterId: crypto.randomUUID(),
    worldId: crypto.randomUUID(),
    storyDefinitionId: crypto.randomUUID(),
    storyVersionId: crypto.randomUUID(),
    entrySceneId: crypto.randomUUID(),
    storySessionId: crypto.randomUUID(),
  };
}

let pool: pg.Pool;
let postgresProxy: TcpProxy;
let redisServer: RedisPingServer;
let proxyDatabaseUrl: string;

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  const parsed = new URL(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
  postgresProxy = new TcpProxy(parsed.hostname, Number(parsed.port || 5432));
  await postgresProxy.start();
  redisServer = new RedisPingServer();
  await redisServer.start();
  parsed.hostname = "127.0.0.1";
  parsed.port = String(postgresProxy.port);
  proxyDatabaseUrl = parsed.toString();

  process.env.DATABASE_URL = proxyDatabaseUrl;
  process.env.REDIS_URL = `redis://127.0.0.1:${redisServer.port}`;
  vi.resetModules();
});

afterAll(async () => {
  __setTestCommitDb(undefined);
  if (postgresProxy) await postgresProxy.stop();
  if (redisServer) await redisServer.stop();
  if (pool) await pool.end();
});

ultefDescribe("ULTEF L9 — dependency outage and recovery", () => {
  it("L9-DEPENDENCY-OUTAGE-001 degrades safely and recovers without process restart or partial commit", async () => {
    if (!databaseUrl) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const ids = fixture();
    const npcId = crypto.randomUUID();
    await seedStoryFixture(pool, ids);

    try {
      const { getReadiness } = await import("@/lib/readiness");
      const initialReadiness = await getReadiness();

      const storyDb = createStoryDatabase(proxyDatabaseUrl);
      __setTestCommitDb(storyDb);
      const service = new WorldCommitService();
      const extractor = new NarrativeEventExtractor();
      const validator = new EvidenceValidator();
      const ruleEngine = new WorldCommitRuleEngine({
        rules: defaultOutcomeRules(),
      });
      const snapshot = StoryContextSnapshot.create({
        storySessionId: ids.storySessionId,
        householdId: ids.householdId,
        worldId: ids.worldId,
        worldStateHash: "l9-outage-before",
        entities: [
          {
            entityId: npcId,
            entityKind: "npc",
            state: { need: { hunger: 10 } },
            stateHash: "l9-outage-npc-before",
          },
        ],
      });
      const manifest = OutcomeManifest.create({
        storySessionId: ids.storySessionId,
        householdId: ids.householdId,
        worldId: ids.worldId,
        source: "story_session",
        sourceSceneId: "l9-outage-scene",
        changes: [
          {
            key: "l9-outage-npc-state",
            outcomeType: "npc_state_update",
            entityId: npcId,
            operation: "set",
            field: "need.hunger",
            value: 44,
            evidenceRef: "scene://l9/outage#npc-state",
          },
        ],
      });
      const input = { manifest, snapshot, extractor, validator, ruleEngine };

      const scenario = createScenario({
        id: "L9-DEPENDENCY-OUTAGE-001",
        title: "Dependency outage degrades safely and self-recovers",
        level: "L9",
        projectGate: "L9-G10",
        seed: "runtime-uuid",
      });
      scenario.setup("Postgres proxy port", postgresProxy.port);
      scenario.setup("Redis test port", redisServer.port);

      await postgresProxy.stop();
      const postgresOutageReadiness = await getReadiness();
      let failedCommitRejected = false;
      try {
        await service.commitManifest(input);
      } catch {
        failedCommitRejected = true;
      }

      const stateDuringOutage = await pool.query<{
        commits: string;
        versions: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1)::text AS commits,
           (SELECT COUNT(*) FROM story.story_world_versions WHERE household_id = $1)::text AS versions`,
        [ids.householdId],
      );

      await postgresProxy.restart();
      const postgresRecoveredReadiness = await getReadiness();
      const committed = await service.commitManifest(input);

      await redisServer.stop();
      const redisOutageReadiness = await getReadiness();
      await redisServer.restart();
      const redisRecoveredReadiness = await getReadiness();

      const finalState = await pool.query<{
        commits: string;
        versions: string;
        world_version: string | null;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1)::text AS commits,
           (SELECT COUNT(*) FROM story.story_world_versions WHERE household_id = $1)::text AS versions,
           (SELECT current_version::text FROM story.story_world_versions WHERE household_id = $1 AND world_id = $2) AS world_version`,
        [ids.householdId, ids.worldId],
      );

      const noPartialMutation =
        Number(stateDuringOutage.rows[0]?.commits ?? -1) === 0 &&
        Number(stateDuringOutage.rows[0]?.versions ?? -1) === 0;
      const postgresDegraded =
        postgresOutageReadiness.status === "error" &&
        postgresOutageReadiness.services.postgres.status === "error";
      const postgresRecovered = postgresRecoveredReadiness.status === "ok";
      const redisDegraded =
        redisOutageReadiness.status === "error" &&
        redisOutageReadiness.services.redis.status === "error";
      const redisRecovered = redisRecoveredReadiness.status === "ok";
      const finalCommitCorrect =
        Number(finalState.rows[0]?.commits ?? 0) === 1 &&
        Number(finalState.rows[0]?.versions ?? 0) === 1 &&
        Number(finalState.rows[0]?.world_version ?? 0) === 2;

      scenario.event(
        "dependency.outage.recovery.completed",
        `Postgres and Redis outages were detected; commit ${committed.commitId} succeeded after dependency recovery without process restart.`,
      );
      scenario.assert(
        "Baseline readiness is healthy before dependency faults",
        initialReadiness.status === "ok",
        "ok",
        initialReadiness.status,
      );
      scenario.assert(
        "Postgres outage degrades readiness",
        postgresDegraded,
        "error",
        postgresOutageReadiness,
      );
      scenario.assert(
        "Write is rejected during Postgres outage without partial mutation",
        failedCommitRejected && noPartialMutation,
        { rejected: true, commits: 0, versions: 0 },
        {
          rejected: failedCommitRejected,
          commits: Number(stateDuringOutage.rows[0]?.commits ?? -1),
          versions: Number(stateDuringOutage.rows[0]?.versions ?? -1),
        },
      );
      scenario.assert(
        "Postgres recovery restores readiness without process restart",
        postgresRecovered,
        "ok",
        postgresRecoveredReadiness.status,
      );
      scenario.assert(
        "Same service instance commits successfully after Postgres recovery",
        finalCommitCorrect,
        { commits: 1, worldVersions: 1, worldVersion: 2 },
        finalState.rows[0],
      );
      scenario.assert(
        "Redis outage degrades readiness",
        redisDegraded,
        "error",
        redisOutageReadiness,
      );
      scenario.assert(
        "Redis recovery restores readiness without process restart",
        redisRecovered,
        "ok",
        redisRecoveredReadiness.status,
      );

      const passed =
        initialReadiness.status === "ok" &&
        postgresDegraded &&
        failedCommitRejected &&
        noPartialMutation &&
        postgresRecovered &&
        finalCommitCorrect &&
        redisDegraded &&
        redisRecovered;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Dependency outages degraded readiness, rejected unsafe writes without partial state, and recovered in-process when PostgreSQL and Redis returned."
          : "One or more dependency-outage production invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-proxy-and-redis-ping-server",
      });
      expect(report.result).toBe("PASS");
    } finally {
      __setTestCommitDb(undefined);
      await pool.query(
        "DELETE FROM story.story_outbox WHERE household_id = $1",
        [ids.householdId],
      );
      await pool.query(
        "DELETE FROM story.story_commit_records WHERE household_id = $1",
        [ids.householdId],
      );
      await pool.query(
        "DELETE FROM story.story_world_versions WHERE household_id = $1",
        [ids.householdId],
      );
      await cleanupStoryFixture(pool, ids);
    }
  }, 45_000);
});
