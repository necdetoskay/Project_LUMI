export interface OutboxRepository {
  enqueue(input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion?: number;
    payload: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }): Promise<{ id: string }>;
}
