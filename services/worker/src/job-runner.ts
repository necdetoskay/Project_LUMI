import type { SimulationStorePort } from "@lumi/simulation/ports";
import type { WorldSourcePort, NpcSourcePort, RelevanceSourcePort } from "@lumi/simulation/ports";
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

    this.logger.info("worker.run.start", "starting simulation run", { runId: this.runId, batchSize: this.config.batchSize });

    const candidates = await this.discoverAbsentWorlds();

    for (const candidate of candidates) {
      const absentDays = this.computeAbsentDays(candidate.childLastSeenAt, this.now);

      if (absentDays >= 10) {
        result.frozen++;
        result.details.push({
          worldId: candidate.worldId,
          status: "frozen",
          message: `Child absent ${absentDays} days; world frozen`,
        });
        await this.freezeWorld(candidate.worldId);
        continue;
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
          { plan: (w, h, phase, budget, npcs, n) => new BudgetPlanner().plan(w, h, phase, budget, npcs, n) },
        );

        const runResult = await runner.run(runInput);

        result.processed++;
        result.details.push({
          worldId: candidate.worldId,
          status: runResult.frozen ? "frozen" : "completed",
          message: `Run ${runResult.runState.id}, ${runResult.committedCount} effects committed`,
        });

        if (runResult.frozen) {
          result.frozen++;
        }
      } catch (error) {
        result.errors++;
        const message = error instanceof Error ? error.message : String(error);
        result.details.push({
          worldId: candidate.worldId,
          status: "error",
          message,
        });
        this.logger.error("worker.run.error", "simulation run error", { worldId: candidate.worldId, error: message });
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

  private computeAbsentDays(childLastSeenAt: Date, now: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - childLastSeenAt.getTime()) / msPerDay);
  }

  private async discoverAbsentWorlds(): Promise<WorldCandidate[]> {
    return [];
  }

  private async freezeWorld(worldId: string): Promise<void> {
    await this.worldSource.freezeWorld(worldId);
  }
}
