import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const runsDir = path.join(root, "artifacts", "ultef", "runs");
const scorecardsDir = path.join(root, "artifacts", "ultef", "scorecards");
const calibrationIds = [
  "L8-SEMANTIC-CALIBRATION-HUMAN-BOUNDARY-001",
  "L8-SEMANTIC-CALIBRATION-BOUNDARY-001",
  "L8-SEMANTIC-CALIBRATION-001",
];

const scorecardPath = await findLatestFile(scorecardsDir, (name) =>
  name.endsWith("-L8-MODEL-SCORECARD-001.json"),
);
if (!scorecardPath) {
  throw new Error(
    "L8 model scorecard JSON was not found for calibration annotation.",
  );
}

const calibrationPath = await findLatestScenarioFile(runsDir, calibrationIds);
const scorecard = JSON.parse(await readFile(scorecardPath, "utf8"));
const calibrationTrust = calibrationPath
  ? await readCalibrationTrust(calibrationPath)
  : {
      status: "not-calibrated",
      eligible: false,
      stable: false,
      humanReferenceReviewed: false,
      semanticRankingEligible: false,
      note: "No live semantic calibration evidence was produced in this job.",
    };

scorecard.semanticJudgeCalibration = calibrationTrust;
await writeFile(
  scorecardPath,
  `${JSON.stringify(scorecard, null, 2)}\n`,
  "utf8",
);

const mdPath = scorecardPath.replace(/\.json$/, ".md");
let markdown = "";
try {
  markdown = await readFile(mdPath, "utf8");
} catch {
  markdown = "# L8-MODEL-SCORECARD-001\n";
}

const section = [
  "",
  "## Semantic judge trust",
  "",
  `- Trust status: **${calibrationTrust.status}**`,
  `- Calibration eligible: ${calibrationTrust.eligible ? "yes" : "no"}`,
  `- Stability proven: ${calibrationTrust.stable ? "yes" : "no"}`,
  `- Human-reference labels reviewed: ${calibrationTrust.humanReferenceReviewed ? "yes" : "no"}`,
  `- Eligible for bounded semantic ranking weight: ${calibrationTrust.semanticRankingEligible ? "yes" : "no"}`,
  `- MAE: ${calibrationTrust.mae ?? "n/a"}`,
  `- MAE std-dev: ${calibrationTrust.maeStdDev ?? "n/a"}`,
  `- Mean bias: ${calibrationTrust.meanBias ?? "n/a"}`,
  `- Bias std-dev: ${calibrationTrust.biasStdDev ?? "n/a"}`,
  `- Within ±1: ${
    calibrationTrust.withinOneRate === undefined ||
    calibrationTrust.withinOneRate === null
      ? "n/a"
      : `${Math.round(calibrationTrust.withinOneRate * 100)}%`
  }`,
  `- Judge model: ${calibrationTrust.judgeModel ?? "n/a"}`,
  `- Dataset: ${calibrationTrust.datasetId ?? "n/a"}`,
  `- Note: ${calibrationTrust.note}`,
  "",
].join("\n");

await writeFile(mdPath, `${markdown.trimEnd()}${section}`, "utf8");
console.log(
  `Semantic judge trust status: ${calibrationTrust.status} (rankingEligible=${calibrationTrust.semanticRankingEligible}).`,
);

async function readCalibrationTrust(file) {
  const report = JSON.parse(await readFile(file, "utf8"));
  const repeatEvents = (report.timeline ?? []).filter(
    (item) => item.type === "semantic.calibration.repeat.completed",
  );
  const legacyEvent = (report.timeline ?? []).find(
    (item) => item.type === "semantic.calibration.completed",
  );
  const stabilityEvent = (report.timeline ?? []).find(
    (item) => item.type === "semantic.calibration.stability.completed",
  );

  const latestRepeat = repeatEvents.at(-1) ?? legacyEvent ?? null;
  const calibration = latestRepeat?.data?.calibration ?? null;
  const stability = stabilityEvent?.data?.stability ?? null;
  const datasetId =
    stabilityEvent?.data?.datasetId ??
    legacyEvent?.data?.datasetId ??
    report.setup?.find?.((item) => item.label === "Calibration dataset")?.value
      ?.id ??
    null;
  const humanReview =
    stabilityEvent?.data?.humanReview ?? legacyEvent?.data?.humanReview ?? null;
  const judgeModel =
    stabilityEvent?.data?.judgeModel ??
    latestRepeat?.data?.judgeModel ??
    legacyEvent?.data?.judgeModel ??
    null;

  const humanReferenceReviewed =
    humanReview === "complete" || humanReview === "approved";
  const eligible =
    stability?.passRate !== undefined
      ? stability.runs?.every?.((run) => run.eligible === true) === true ||
        stability.passRate >= 2 / 3
      : calibration?.eligible === true;
  const stable = stability?.stable === true;
  const semanticRankingEligible =
    humanReferenceReviewed && eligible && stable === true;

  let status;
  let note;
  if (!humanReferenceReviewed) {
    status = eligible
      ? "eligible-reference-unreviewed"
      : "untrusted-calibration-failed";
    note = eligible
      ? "Numerical calibration passed, but the reference labels are not human-reviewed. Semantic scoring remains advisory-only with no ranking weight."
      : "Calibration failed and the reference labels are not human-reviewed. Semantic scoring remains advisory-only.";
  } else if (!eligible) {
    status = "untrusted-calibration-failed";
    note =
      "Human-reviewed calibration exists, but the judge did not meet numerical thresholds. Semantic scoring receives no ranking weight.";
  } else if (!stable) {
    status = "calibrated-human-reviewed-stability-not-proven";
    note =
      "Human-reviewed calibration passed, but repeated stability has not been proven in this job. Semantic scoring remains advisory-only with no ranking weight.";
  } else {
    status = "trusted-for-advisory-stable";
    note =
      "Human-reviewed calibration and repeated stability both passed. The judge is eligible only for a deliberately bounded semantic ranking weight; deterministic hard gates remain authoritative.";
  }

  return {
    status,
    eligible,
    stable,
    humanReferenceReviewed,
    semanticRankingEligible,
    mae: stability?.meanMae ?? calibration?.mae ?? null,
    maeStdDev: stability?.maeStdDev ?? null,
    meanBias: stability?.meanBias ?? calibration?.meanBias ?? null,
    biasStdDev: stability?.biasStdDev ?? null,
    withinOneRate:
      calibration?.withinOneRate ??
      stability?.runs?.at?.(-1)?.withinOneRate ??
      null,
    rubrics: stability?.rubrics ?? calibration?.rubrics ?? null,
    thresholds: stability?.thresholds ?? calibration?.thresholds ?? null,
    judgeModel,
    datasetId,
    evidenceFile: file,
    note,
  };
}

async function findLatestScenarioFile(base, ids) {
  let entries = [];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    for (const id of ids) {
      const candidate = path.join(base, entry.name, `${id}.json`);
      try {
        await readFile(candidate, "utf8");
        files.push(candidate);
      } catch {
        // Ignore unrelated run directories.
      }
    }
  }
  files.sort();
  return files.at(-1) ?? null;
}

async function findLatestFile(base, predicate) {
  let entries = [];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = entries
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => path.join(base, entry.name))
    .sort();
  return files.at(-1) ?? null;
}
