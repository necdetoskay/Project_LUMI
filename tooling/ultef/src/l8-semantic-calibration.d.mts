export const SEMANTIC_CALIBRATION_THRESHOLDS: Readonly<{
  maxMae: number;
  minWithinOneRate: number;
  maxRubricMae: number;
}>;

export type SemanticCalibrationReference = {
  id: string;
  rubric: string;
  humanScore: number;
  text: string;
};

export type SemanticCalibrationEvaluation = {
  eligible: boolean;
  advisoryOnly: true;
  count: number;
  mae: number;
  withinOneRate: number;
  rubrics: Record<
    string,
    {
      count: number;
      mae: number;
      withinOneRate: number;
    }
  >;
  thresholds: typeof SEMANTIC_CALIBRATION_THRESHOLDS;
  rows: Array<{
    id: string;
    rubric: string;
    humanScore: number;
    predictedScore: number;
    absoluteError: number;
    withinOne: boolean;
  }>;
};

export function buildSemanticCalibrationJudgePrompt(
  referenceExamples: SemanticCalibrationReference[],
): string;

export function parseSemanticCalibrationJudgeResponse(
  raw: string,
  referenceExamples: SemanticCalibrationReference[],
): Record<string, number>;

export function evaluateSemanticCalibration(
  referenceExamples: SemanticCalibrationReference[],
  predictions: Record<string, number>,
): SemanticCalibrationEvaluation;
