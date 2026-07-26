export type SimulationMetricsSnapshot = {
  pendingJobs: number;
  runningJobs: number;
  failedJobs: number;
  completedRunsLast24h: number;
  averageDurationMs: number;
  averageSimulatedDays: number;
  frozenRunsLast24h: number;
  outboxBacklog: number;
};

export interface SimulationMetricsSink {
  gauge(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void;

  increment(
    name: string,
    value?: number,
    tags?: Record<string, string>,
  ): void;

  timing(
    name: string,
    durationMs: number,
    tags?: Record<string, string>,
  ): void;
}

export class NoopSimulationMetricsSink
  implements SimulationMetricsSink
{
  gauge(): void {}
  increment(): void {}
  timing(): void {}
}
