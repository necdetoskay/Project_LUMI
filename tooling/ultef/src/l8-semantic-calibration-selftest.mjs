import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { evaluateSemanticCalibration } from "./l8-semantic-calibration.mjs";

const seedDataset = JSON.parse(
  await readFile(
    new URL("../calibration/l8-semantic-calibration.json", import.meta.url),
    "utf8",
  ),
);
const boundaryDataset = JSON.parse(
  await readFile(
    new URL(
      "../calibration/l8-semantic-calibration-hard-boundary.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

validateDataset(seedDataset, { expectedCount: 18 });
validateDataset(boundaryDataset, {
  expectedCount: 18,
  allowedScores: new Set([2, 3, 4]),
  expectedPerRubricScore: 2,
});

const perfectPredictions = Object.fromEntries(
  seedDataset.examples.map((example) => [example.id, example.humanScore]),
);
const perfect = evaluateSemanticCalibration(
  seedDataset.examples,
  perfectPredictions,
);
assert.equal(perfect.eligible, true);
assert.equal(perfect.mae, 0);
assert.equal(perfect.withinOneRate, 1);

const noisyPredictions = Object.fromEntries(
  seedDataset.examples.map((example, index) => [
    example.id,
    index % 2 === 0 ? Math.min(5, example.humanScore + 1) : example.humanScore,
  ]),
);
const noisy = evaluateSemanticCalibration(
  seedDataset.examples,
  noisyPredictions,
);
assert.equal(noisy.eligible, true);
assert.ok(noisy.mae <= 0.75);
assert.ok(noisy.withinOneRate >= 0.85);

const badPredictions = Object.fromEntries(
  seedDataset.examples.map((example) => [example.id, 5 - example.humanScore]),
);
const bad = evaluateSemanticCalibration(seedDataset.examples, badPredictions);
assert.equal(bad.eligible, false);
assert.ok(bad.mae > 0.75);

const boundaryPerfect = Object.fromEntries(
  boundaryDataset.examples.map((example) => [example.id, example.humanScore]),
);
const boundaryResult = evaluateSemanticCalibration(
  boundaryDataset.examples,
  boundaryPerfect,
);
assert.equal(boundaryResult.eligible, true);
assert.equal(boundaryResult.mae, 0);
assert.equal(boundaryResult.withinOneRate, 1);

assert.throws(
  () =>
    evaluateSemanticCalibration(seedDataset.examples, {
      ...perfectPredictions,
      [seedDataset.examples[0].id]: 8,
    }),
  /invalid calibration prediction/i,
);

console.log("L8 semantic calibration selftest: PASS");

function validateDataset(
  dataset,
  { expectedCount, allowedScores = null, expectedPerRubricScore = null },
) {
  assert.equal(dataset.examples.length, expectedCount);
  const ids = new Set();
  const rubrics = new Set([
    "choice_influence",
    "personality_emotion",
    "age_appropriateness",
  ]);

  for (const example of dataset.examples) {
    assert.ok(!ids.has(example.id), `Duplicate calibration id: ${example.id}`);
    ids.add(example.id);
    assert.ok(rubrics.has(example.rubric), `Unknown rubric: ${example.rubric}`);
    assert.ok(Number.isInteger(example.humanScore));
    assert.ok(example.humanScore >= 0 && example.humanScore <= 5);
    assert.ok(example.text.length > 20);
    if (allowedScores) {
      assert.ok(
        allowedScores.has(example.humanScore),
        `Unexpected boundary score ${example.humanScore}`,
      );
    }
  }

  if (expectedPerRubricScore !== null) {
    for (const rubric of rubrics) {
      for (const score of allowedScores) {
        assert.equal(
          dataset.examples.filter(
            (example) =>
              example.rubric === rubric && example.humanScore === score,
          ).length,
          expectedPerRubricScore,
          `${rubric} score ${score} coverage mismatch`,
        );
      }
    }
  }
}
