import { createLogger } from "@lumi/logger";
import { MemoryAwareDecisionService } from "@lumi/npc-intelligence/application";
import {
  createDatabase as createNpcDatabase,
  DrizzleCanonicalMemoryRepository,
  DrizzleNpcSnapshotRepository,
  DrizzleWorkerNpcDecisionRepository,
} from "@lumi/npc-intelligence/db";
import { createDatabase } from "@lumi/simulation/db";
import {
  DrizzleSimulationRepository,
  SimulationStoreAdapter,
} from "@lumi/simulation/db";
import { BackgroundWorker, type WorkerConfig } from "./worker";
import { OutboxJobRunner } from "./outbox-runner";
import { NpcDecisionJobRunner } from "./npc-decision-runner";
import {
  EmptyRelevanceSourceAdapter,
  EnvWorldDiscoveryAdapter,
  RepositoryNpcSourceAdapter,
  SimulationRepositoryWorldSourceAdapter,
} from "./adapters";

const workerConfig: WorkerConfig = {
  intervalMs: Number(process.env.WORKER_INTERVAL_MS ?? "60000"),
  batchSize: Number(process.env.WORKER_BATCH_SIZE ?? "10"),
  maxConcurrent: Number(process.env.WORKER_MAX_CONCURRENT ?? "2"),
};

const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
const db = createDatabase(dbUrl);
const npcDb = createNpcDatabase(dbUrl);
const repo = new DrizzleSimulationRepository(db);
const store = new SimulationStoreAdapter(repo);
const logger = createLogger({ level: "info" });
const seed = process.env.SIMULATION_SEED ?? "lumi-sim-v1";

const worldSource = new SimulationRepositoryWorldSourceAdapter(repo, logger);
const npcSnapshots = new DrizzleNpcSnapshotRepository(npcDb);
const npcSource = new RepositoryNpcSourceAdapter(
  npcSnapshots,
  Number(process.env.WORKER_NPC_SNAPSHOT_LIMIT ?? "64"),
);
const relevanceSource = new EmptyRelevanceSourceAdapter();
const discoverySource = new EnvWorldDiscoveryAdapter(
  process.env.WORKER_WORLD_CANDIDATES_JSON,
  logger,
);
const outboxRunner = new OutboxJobRunner(
  logger,
  Number(process.env.WORKER_OUTBOX_BATCH_SIZE ?? "25"),
  Number(process.env.WORKER_OUTBOX_HOUSEHOLD_LIMIT ?? "100"),
);
const npcDecisionRunner = new NpcDecisionJobRunner(
  npcSnapshots,
  new MemoryAwareDecisionService(new DrizzleCanonicalMemoryRepository(npcDb)),
  new DrizzleWorkerNpcDecisionRepository(npcDb),
  logger,
  Number(process.env.WORKER_NPC_DECISION_LIMIT ?? "64"),
);

const worker = new BackgroundWorker(
  workerConfig,
  store,
  worldSource,
  npcSource,
  relevanceSource,
  discoverySource,
  logger,
  seed,
  outboxRunner,
  npcDecisionRunner,
);

worker.start();

process.on("SIGTERM", () => {
  worker.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  worker.stop();
  process.exit(0);
});
