import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { evaluateSemanticCalibration } from "./l8-semantic-calibration.mjs";

const dataset = JSON.parse(
  await readFile(
    new URL("../calibration/l8-semantic-calibration.json", import.meta.url),
    "utf8",
  ),
);

const perfectPredictions = Object.fromEntries(
  dataset.examples.map((example) => [example.id, example.humanScore]),
);
const perfect = evaluateSemanticCalibration(dataset.examples, perfectPredictions);
assert.equal(perfect.eligible, true);
assert.equal(perfect.mae, 0);
assert.equal(perfect.withinOneRate, 1);

const noisyPredictions = Object.fromEntries(
  dataset.examples.map((example, index) => [
    example.id,
    index % 2 === 0 ? Math.min(5, example.humanScore + 1) : example.humanScore,
  ]),
);
const noisy = evaluateSemanticCalibration(dataset.examples, noisyPredictions);
assert.equal(noisy.eligible, true);
assert.ok(noisy.mae <= 0.75);
assert.ok(noisy.withinOneRate >= 0.85);

const badPredictions = Object.fromEntries(
  dataset.examples.map((example) => [example.id, 5 - example.humanScore]),
);
const bad = evaluateSemanticCalibration(dataset.examples, badPredictions);
assert.equal(bad.eligible, false);
assert.ok(bad.mae > 0.75);

assert.throws(
  () =>
    evaluateSemanticCalibration(dataset.examples, {
      ...perfectPredictions,
      [dataset.examples[0].id]: 8,
    }),
  /invalid calibration prediction/i,
);

console.log("L8 semantic calibration selftest: PASS");
