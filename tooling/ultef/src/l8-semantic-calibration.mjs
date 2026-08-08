export const SEMANTIC_CALIBRATION_THRESHOLDS = Object.freeze({
  maxMae: 0.75,
  minWithinOneRate: 0.85,
  maxRubricMae: 1.0,
});

export function evaluateSemanticCalibration(referenceExamples, predictions) {
  const rows = referenceExamples.map((example) => {
    const predicted = Number(predictions?.[example.id]);
    if (!Number.isFinite(predicted) || predicted < 0 || predicted > 5) {
      throw new Error(
        `Missing or invalid calibration prediction for ${example.id}.`,
      );
    }
    const error = Math.abs(predicted - example.humanScore);
    return {
      id: example.id,
      rubric: example.rubric,
      humanScore: example.humanScore,
      predictedScore: predicted,
      absoluteError: error,
      withinOne: error <= 1,
    };
  });

  const mae = mean(rows.map((row) => row.absoluteError)) ?? Infinity;
  const withinOneRate =
    rows.length === 0
      ? 0
      : rows.filter((row) => row.withinOne).length / rows.length;
  const rubrics = {};
  for (const rubric of new Set(rows.map((row) => row.rubric))) {
    const rubricRows = rows.filter((row) => row.rubric === rubric);
    rubrics[rubric] = {
      count: rubricRows.length,
      mae: round(mean(rubricRows.map((row) => row.absoluteError)) ?? Infinity),
      withinOneRate: round(
        rubricRows.filter((row) => row.withinOne).length / rubricRows.length,
      ),
    };
  }

  const rubricGate = Object.values(rubrics).every(
    (result) => result.mae <= SEMANTIC_CALIBRATION_THRESHOLDS.maxRubricMae,
  );
  const eligible =
    mae <= SEMANTIC_CALIBRATION_THRESHOLDS.maxMae &&
    withinOneRate >= SEMANTIC_CALIBRATION_THRESHOLDS.minWithinOneRate &&
    rubricGate;

  return {
    eligible,
    advisoryOnly: true,
    count: rows.length,
    mae: round(mae),
    withinOneRate: round(withinOneRate),
    rubrics,
    thresholds: SEMANTIC_CALIBRATION_THRESHOLDS,
    rows,
  };
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
