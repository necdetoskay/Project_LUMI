import type { Logger } from "@lumi/logger";
import { SimulationJobRunner } from "./job-runner";
import type {
  WorkerConfig,
  WorldDiscoveryPort,
  WorkerResult,
} from "./job-runner";
export type { WorkerConfig, WorkerResult } from "./job-runner";
import type { SimulationStorePort } from "@lumi/simulation/ports";
import type {
  WorldSourcePort,
  NpcSourcePort,
  RelevanceSourcePort,
} from "@lumi/simulation/ports";

export class BackgroundWorker {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly config: WorkerConfig,
    private readonly store: SimulationStorePort,
    private readonly worldSource: WorldSourcePort,
    private readonly npcSource: NpcSourcePort,
    private readonly relevanceSource: RelevanceSourcePort,
    private readonly discoverySource: WorldDiscoveryPort,
    private readonly logger: Logger,
    private readonly seed: string,
  ) {}

  start(): void {
    if (this.timer) return;
    this.logger.info("worker.start", "worker starting", {
      intervalMs: this.config.intervalMs,
    });
    this.timer = setInterval(() => this.tick(), this.config.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.logger.info("worker.stop", "worker stopped", {});
  }

  async tick(): Promise<WorkerResult | null> {
    if (this.running) {
      this.logger.warn("worker.tick.skip", "already running", {
        reason: "already_running",
      });
      return null;
    }

    this.running = true;
    try {
      const job = new SimulationJobRunner(
        this.config,
        this.store,
        this.worldSource,
        this.npcSource,
        this.relevanceSource,
        this.discoverySource,
        this.logger,
        this.seed,
      );
      const result = await job.run();
      this.running = false;
      return result;
    } catch (error) {
      this.running = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("worker.tick.error", "worker tick error", {
        error: message,
      });
      return null;
    }
  }
}
