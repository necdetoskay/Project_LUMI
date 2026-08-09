import { evaluateSemanticCalibrationStability } from "./l8-semantic-calibration-stability.mjs";

function calibration({
  mae,
  bias,
  eligible = true,
  choice = mae,
  personality = mae,
  age = mae,
}) {
  return {
    eligible,
    mae,
    meanBias: bias,
    withinOneRate: 1,
    directionCounts: { under: 0, exact: 18, over: 0 },
    rubrics: {
      choice_influence: { mae: choice },
      personality_emotion: { mae: personality },
      age_appropriateness: { mae: age },
    },
  };
}

const stable = evaluateSemanticCalibrationStability([
  calibration({
    mae: 0.63,
    bias: 0.63,
    choice: 0.83,
    personality: 0.5,
    age: 0.58,
  }),
  calibration({
    mae: 0.65,
    bias: 0.65,
    choice: 0.84,
    personality: 0.5,
    age: 0.61,
  }),
  calibration({
    mae: 0.64,
    bias: 0.64,
    choice: 0.82,
    personality: 0.51,
    age: 0.59,
  }),
]);
if (!stable.stable) throw new Error("Expected stable calibration set to pass.");

const unstable = evaluateSemanticCalibrationStability([
  calibration({ mae: 0.55, bias: 0.45 }),
  calibration({ mae: 0.74, bias: 0.72 }),
  calibration({ mae: 0.93, bias: 0.93, eligible: false }),
]);
if (unstable.stable)
  throw new Error("Expected high-variance calibration set to fail.");

console.log("L8 semantic calibration stability selftest: PASS");
