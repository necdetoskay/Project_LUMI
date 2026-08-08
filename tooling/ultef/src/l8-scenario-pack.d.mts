export interface L8ScenarioDefinition {
  id: string;
  title: string;
  dimension: string;
  weight: number;
}

export interface L8ScenarioEvaluation {
  passed: boolean;
  gates: Record<string, boolean>;
}

export interface L8ScenarioPackEvaluation {
  passed: boolean;
  score: number;
  scenarios: Record<string, L8ScenarioEvaluation>;
}

export const L8_SCENARIO_PACK: readonly L8ScenarioDefinition[];
export function evaluateContinuityScenario(
  narrative: string,
): L8ScenarioEvaluation;
export function evaluateChoiceInfluenceScenario(
  narrative: string,
): L8ScenarioEvaluation;
export function evaluateWorldConsistencyScenario(
  narrative: string,
): L8ScenarioEvaluation;
export function evaluateScenarioPack(
  outputs: Record<string, string>,
): L8ScenarioPackEvaluation;
