import { createLogger } from "@lumi/logger";
import { createDatabase } from "@lumi/simulation/db";
import { DrizzleSimulationRepository, SimulationStoreAdapter } from "@lumi/simulation/db";
import { BackgroundWorker, type WorkerConfig } from "./worker";
import {
  EmptyNpcSourceAdapter,
  EmptyRelevanceSourceAdapter,
  EnvWorldDiscoveryAdapter,
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
const repo = new DrizzleSimulationRepository(db);
const store = new SimulationStoreAdapter(repo);
const logger = createLogger({ level: "info" });
const seed = process.env.SIMULATION_SEED ?? "lumi-sim-v1";

const worldSource = new SimulationRepositoryWorldSourceAdapter(repo, logger);
const npcSource = new EmptyNpcSourceAdapter();
const relevanceSource = new EmptyRelevanceSourceAdapter();
const discoverySource = new EnvWorldDiscoveryAdapter(process.env.WORKER_WORLD_CANDIDATES_JSON, logger);

const worker = new BackgroundWorker(
  workerConfig,
  store,
  worldSource,
  npcSource,
  relevanceSource,
  discoverySource,
  logger,
  seed,
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