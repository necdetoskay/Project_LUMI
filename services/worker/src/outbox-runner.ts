import type { Logger } from "@lumi/logger";
import {
  IndirectEffectPropagator,
  listRetryableOutboxHouseholdIds,
} from "@lumi/story/application";

import { WorkerOutboxDispatcher } from "./outbox-dispatcher";

export interface OutboxRunSummary {
  households: number;
  processed: number;
  applied: number;
  failed: number;
  skipped: number;
}

export class OutboxJobRunner {
  private readonly dispatcher = new WorkerOutboxDispatcher();

  constructor(
    private readonly logger: Logger,
    private readonly batchSize = 25,
    private readonly householdLimit = 100,
  ) {}

  async run(): Promise<OutboxRunSummary> {
    const householdIds = await listRetryableOutboxHouseholdIds(
      this.householdLimit,
    );
    const summary: OutboxRunSummary = {
      households: householdIds.length,
      processed: 0,
      applied: 0,
      failed: 0,
      skipped: 0,
    };

    const propagator = new IndirectEffectPropagator(this.dispatcher);
    for (const householdId of householdIds) {
      const result = await propagator.propagate({
        householdId,
        limit: this.batchSize,
      });
      summary.processed += result.processed;
      summary.applied += result.applied;
      summary.failed += result.failed;
      summary.skipped += result.skipped;
    }

    this.logger.info(
      "worker.outbox.run",
      "story outbox batch completed",
      summary,
    );
    return summary;
  }
}
