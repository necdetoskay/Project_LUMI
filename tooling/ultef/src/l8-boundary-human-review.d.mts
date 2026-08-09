export type BoundaryReviewExample = {
  id: string;
  rubric: string;
  humanScore: number;
  text: string;
};

export type BoundaryReviewDataset = {
  id: string;
  status: string;
  humanReview?: string;
  examples: BoundaryReviewExample[];
};

export type BoundaryReviewCalibrationRow = {
  id: string;
  rubric: string;
  humanScore: number;
  predictedScore: number;
  absoluteError: number;
  signedError?: number;
  withinOne: boolean;
};

export type BoundaryReviewCalibration = {
  mae: number;
  withinOneRate: number;
  meanBias?: number;
  directionCounts?: {
    under: number;
    exact: number;
    over: number;
  };
  rows: BoundaryReviewCalibrationRow[];
};

export function renderBoundaryHumanReview(input: {
  dataset: BoundaryReviewDataset;
  calibration?: BoundaryReviewCalibration;
  judgeModel?: string;
}): string;
