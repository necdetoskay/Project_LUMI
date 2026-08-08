export type UltefResult = 'PASS' | 'WARN' | 'FAIL' | 'BLOCKED';

export interface UltefReport {
  schemaVersion: number;
  id: string;
  title: string;
  level: string;
  projectGate: string | null;
  seed: string | null;
  startedAt: string;
  finishedAt: string;
  result: UltefResult;
  reason: string | null;
  blockedBy: string | null;
  setup: Array<{ label: string; value: unknown; metadata: Record<string, unknown> }>;
  timeline: Array<{ sequence: number; at: string; type: string; summary: string; data: Record<string, unknown> }>;
  assertions: Array<{ description: string; passed: boolean; expected: unknown; actual: unknown }>;
  stateDeltas: Array<{ path: string; before: unknown; after: unknown; reason: string | null }>;
}

export interface UltefScenarioRecorder {
  setup(label: string, value: unknown, metadata?: Record<string, unknown>): void;
  event(type: string, summary: string, data?: Record<string, unknown>): void;
  assert(description: string, passed: boolean, expected?: unknown, actual?: unknown): void;
  delta(path: string, before: unknown, after: unknown, reason?: string | null): void;
  finish(input: { result: UltefResult; reason?: string | null; blockedBy?: string | null }): UltefReport;
}

export declare const ULTEF_RESULTS: readonly UltefResult[];
export declare function createScenario(input: {
  id: string;
  title: string;
  level: string;
  projectGate?: string | null;
  seed?: string | null;
}): UltefScenarioRecorder;
export declare function renderNarrative(report: UltefReport): string;
