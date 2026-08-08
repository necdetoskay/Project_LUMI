export const SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS: Readonly<{
  minPassRate: number;
  maxMeanMae: number;
  maxMaeStdDev: number;
  maxBiasStdDev: number;
  maxMeanRubricMae: number;
}>;

export interface SemanticCalibrationLike {
  eligible: boolean;
  mae: number;
  meanBias: number;
  withinOneRate: number;
  directionCounts?: Record<string, number>;
  rubrics: Record<string, { mae: number; [key: string]: unknown }>;
}

export interface SemanticCalibrationStabilityResult {
  stable: boolean;
  advisoryOnly: true;
  repeats: number;
  passes: number;
  passRate: number;
  meanMae: number;
  maeStdDev: number;
  meanBias: number;
  biasStdDev: number;
  rubrics: Record<
    string,
    { meanMae: number; maeStdDev: number; values: number[] }
  >;
  thresholds: typeof SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS;
  runs: Array<Record<string, unknown>>;
}

export function evaluateSemanticCalibrationStability(
  calibrations: SemanticCalibrationLike[],
): SemanticCalibrationStabilityResult;
