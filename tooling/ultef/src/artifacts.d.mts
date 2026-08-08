import type { UltefReport } from './evidence.mjs';

export declare function writeScenarioArtifacts(
  report: UltefReport,
  options?: {
    rootDir?: string;
    runId?: string;
    gitSha?: string | null;
    environment?: string;
  },
): Promise<{
  runId: string;
  runDir: string;
  latestDir: string;
  payload: UltefReport & { run: Record<string, unknown> };
}>;
