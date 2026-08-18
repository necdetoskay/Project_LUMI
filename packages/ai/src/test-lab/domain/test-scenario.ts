import type { JsonObject } from "./test-lab-types";

export type TestScenarioDirection =
  | "character_first"
  | "world_first"
  | "story";
export type TestPhaseKind = "input" | "generation" | "selection" | "finalize";

export interface TestPhaseDefinition {
  id: string;
  label: string;
  kind: TestPhaseKind;
  llmBacked: boolean;
  testable: boolean;
  productionOperation: string;
  promptKey: string | null;
  directions: TestScenarioDirection[];
  requiredStateKeys: string[];
  requiredStateKeysByDirection?: Partial<
    Record<TestScenarioDirection, string[]>
  >;
  writesStateKey: string | null;
}

export interface TestScenarioDefinition {
  key: string;
  label: string;
  phases: TestPhaseDefinition[];
}

export function phaseIsRunnable(
  phase: TestPhaseDefinition,
  input: { direction: TestScenarioDirection; state: JsonObject },
): boolean {
  if (!phase.directions.includes(input.direction)) return false;
  const required = [
    ...phase.requiredStateKeys,
    ...(phase.requiredStateKeysByDirection?.[input.direction] ?? []),
  ];
  return required.every((key) => hasPath(input.state, key));
}

function hasPath(value: JsonObject, path: string): boolean {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current) ||
      !(segment in current)
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined && current !== null;
}
