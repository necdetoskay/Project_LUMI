import type { SimulationStorePort } from "@lumi/simulation/ports";
import type {
  WorldSourcePort,
  NpcSourcePort,
  RelevanceSourcePort,
} from "@lumi/simulation/ports";
import type { SimulationRunInput } from "@lumi/simulation/application";
import { SimulationRunner, BudgetPlanner } from "@lumi/simulation/application";
import type { Logger } from "@lumi/logger";

export interface WorkerConfig {
  intervalMs: number;
  batchSize: number;
  maxConcurrent: number;
}

export interface WorldCandidate {
  worldId: string;
  householdId: string;
  childProfileId: string;
  childLastSeenAt: Date;
  now: Date;
}

export interface WorldDiscoveryPort {
  discoverAbsentWorlds(limit: number, now: Date): Promise<WorldCandidate[]>;
}

export interface JobRunner {
  run(): Promise<WorkerResult>;
}

export interface WorkerResult {
  processed: number;
  skipped: number;
  frozen: number;
  errors: number;
  details: Array<{ worldId: string; status: string; message: string }>;
}

export class SimulationJobRunner implements JobRunner {
  private readonly runId = crypto.randomUUID();

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

  private get now(): Date {
    return new Date();
  }

  async run(): Promise<WorkerResult> {
    const result: WorkerResult = {
      processed: 0,
      skipped: 0,
      frozen: 0,
      errors: 0,
      details: [],
    };

    this.logger.info("worker.run.start", "starting simulation run", {
      runId: this.runId,
      batchSize: this.config.batchSize,
    });

    const candidates = await this.discoverySource.discoverAbsentWorlds(
      this.config.batchSize,
      this.now,
    );
    const concurrency = Math.max(1, this.config.maxConcurrent);

    for (let index = 0; index < candidates.length; index += concurrency) {
      const chunk = candidates.slice(index, index + concurrency);
      const outcomes = await Promise.all(
        chunk.map((candidate) => this.processCandidate(candidate)),
      );
      for (const outcome of outcomes) {
        result.processed += outcome.processed;
        result.skipped += outcome.skipped;
        result.frozen += outcome.frozen;
        result.errors += outcome.errors;
        result.details.push(outcome.detail);
      }
    }

    this.logger.info("worker.run.complete", "simulation run complete", {
      runId: this.runId,
      processed: result.processed,
      skipped: result.skipped,
      frozen: result.frozen,
      errors: result.errors,
    });

    return result;
  }

  private async processCandidate(candidate: WorldCandidate): Promise<{
    processed: number;
    skipped: number;
    frozen: number;
    errors: number;
    detail: { worldId: string; status: string; message: string };
  }> {
    const absentDays = this.computeAbsentDays(
      candidate.childLastSeenAt,
      this.now,
    );

    if (absentDays < 1) {
      return {
        processed: 0,
        skipped: 1,
        frozen: 0,
        errors: 0,
        detail: {
          worldId: candidate.worldId,
          status: "skipped",
          message: `Child absent ${absentDays} days; no background run needed`,
        },
      };
    }

    if (absentDays >= 10) {
      await this.freezeWorld(candidate.worldId);
      return {
        processed: 0,
        skipped: 0,
        frozen: 1,
        errors: 0,
        detail: {
          worldId: candidate.worldId,
          status: "frozen",
          message: `Child absent ${absentDays} days; world frozen`,
        },
      };
    }

    try {
      const runInput: SimulationRunInput = {
        worldId: candidate.worldId,
        householdId: candidate.householdId,
        childProfileId: candidate.childProfileId,
        childLastSeenAt: candidate.childLastSeenAt,
        now: this.now,
        seed: this.seed,
      };

      const runner = new SimulationRunner(
        this.store,
        this.worldSource,
        this.npcSource,
        {
          plan: (w, h, phase, budget, npcs, n) =>
            new BudgetPlanner().plan(w, h, phase, budget, npcs, n),
        },
      );

      const runResult = await runner.run(runInput);

      return {
        processed: 1,
        skipped: 0,
        frozen: runResult.frozen ? 1 : 0,
        errors: 0,
        detail: {
          worldId: candidate.worldId,
          status: runResult.frozen ? "frozen" : "completed",
          message: `Run ${runResult.runState.id}, ${runResult.committedCount} effects committed`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("worker.run.error", "simulation run error", {
        worldId: candidate.worldId,
        error: message,
      });
      return {
        processed: 0,
        skipped: 0,
        frozen: 0,
        errors: 1,
        detail: {
          worldId: candidate.worldId,
          status: "error",
          message,
        },
      };
    }
  }

  private computeAbsentDays(childLastSeenAt: Date, now: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - childLastSeenAt.getTime()) / msPerDay);
  }

  private async freezeWorld(worldId: string): Promise<void> {
    await this.worldSource.freezeWorld(worldId);
  }
}
