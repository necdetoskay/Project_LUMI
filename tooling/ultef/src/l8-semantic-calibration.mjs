export const SEMANTIC_CALIBRATION_THRESHOLDS = Object.freeze({
  maxMae: 0.75,
  minWithinOneRate: 0.85,
  maxRubricMae: 1.0,
});

export function buildSemanticCalibrationJudgePrompt(referenceExamples) {
  const lines = [
    "You are calibrating a semantic evaluator for Project LUMI children's stories.",
    "Score each example independently from 0 to 5 according to its named rubric.",
    "Return strict JSON only. Do not include markdown or explanations outside JSON.",
    'Required shape: {"predictions":{"example-id":0}}',
    "Use integers only. Include every example id exactly once.",
    "",
  ];

  for (const example of referenceExamples) {
    lines.push(
      `ID: ${example.id}`,
      `RUBRIC: ${example.rubric}`,
      `TEXT: ${example.text}`,
      "",
    );
  }
  return lines.join("\n");
}

export function parseSemanticCalibrationJudgeResponse(raw, referenceExamples) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw ?? "").trim());
  } catch {
    throw new Error("L8 semantic calibration judge must return strict JSON.");
  }

  const predictions = parsed?.predictions;
  if (
    !predictions ||
    typeof predictions !== "object" ||
    Array.isArray(predictions)
  ) {
    throw new Error("L8 semantic calibration response is missing predictions.");
  }

  const normalized = {};
  for (const example of referenceExamples) {
    const value = Number(predictions[example.id]);
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      throw new Error(`Invalid calibration prediction for ${example.id}.`);
    }
    normalized[example.id] = value;
  }

  return normalized;
}

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
