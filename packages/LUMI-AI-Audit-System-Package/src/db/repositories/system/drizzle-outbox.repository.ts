import type { QueryExecutor } from "../../transaction";
import { outboxEvents } from "../../schema/system";
import type { OutboxRepository } from "./outbox.repository";

export class DrizzleOutboxRepository implements OutboxRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async enqueue(input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion?: number;
    payload: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }) {
    const [record] = await this.executor.insert(outboxEvents).values({
      ...input,
      eventVersion: input.eventVersion ?? 1,
      headers: input.headers ?? {},
    }).returning({ id: outboxEvents.id });
    if (!record) throw new Error("Outbox event creation returned no record");
    return record;
  }
}
