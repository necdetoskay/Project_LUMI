export const SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS = Object.freeze({
  minPassRate: 2 / 3,
  maxMeanMae: 0.75,
  maxMaeStdDev: 0.15,
  maxBiasStdDev: 0.15,
  maxMeanRubricMae: 1.0,
});

export function evaluateSemanticCalibrationStability(calibrations) {
  if (!Array.isArray(calibrations) || calibrations.length === 0) {
    throw new Error("At least one semantic calibration run is required.");
  }

  const passes = calibrations.filter((item) => item?.eligible === true).length;
  const passRate = passes / calibrations.length;
  const maeValues = calibrations.map((item) => finite(item?.mae, "mae"));
  const biasValues = calibrations.map((item) =>
    finite(item?.meanBias, "meanBias"),
  );
  const rubricNames = [
    ...new Set(
      calibrations.flatMap((item) => Object.keys(item?.rubrics ?? {})),
    ),
  ];

  const rubrics = Object.fromEntries(
    rubricNames.map((rubric) => {
      const values = calibrations.map((item) =>
        finite(item?.rubrics?.[rubric]?.mae, `${rubric}.mae`),
      );
      return [
        rubric,
        {
          meanMae: round(mean(values)),
          maeStdDev: round(stddev(values)),
          values,
        },
      ];
    }),
  );

  const meanMae = mean(maeValues);
  const maeStdDev = stddev(maeValues);
  const meanBias = mean(biasValues);
  const biasStdDev = stddev(biasValues);
  const rubricGate = Object.values(rubrics).every(
    (item) =>
      item.meanMae <=
      SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS.maxMeanRubricMae,
  );
  const stable =
    passRate >= SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS.minPassRate &&
    meanMae <= SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS.maxMeanMae &&
    maeStdDev <= SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS.maxMaeStdDev &&
    biasStdDev <= SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS.maxBiasStdDev &&
    rubricGate;

  return {
    stable,
    advisoryOnly: true,
    repeats: calibrations.length,
    passes,
    passRate: round(passRate),
    meanMae: round(meanMae),
    maeStdDev: round(maeStdDev),
    meanBias: round(meanBias),
    biasStdDev: round(biasStdDev),
    rubrics,
    thresholds: SEMANTIC_CALIBRATION_STABILITY_THRESHOLDS,
    runs: calibrations.map((item, index) => ({
      repeat: index + 1,
      eligible: item.eligible,
      mae: item.mae,
      meanBias: item.meanBias,
      withinOneRate: item.withinOneRate,
      directionCounts: item.directionCounts,
      rubrics: item.rubrics,
    })),
  };
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid semantic calibration stability value: ${label}.`);
  }
  return number;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values) {
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
