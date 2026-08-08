import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const runsDir = path.join(root, "artifacts", "ultef", "runs");
const scorecardsDir = path.join(root, "artifacts", "ultef", "scorecards");
const calibrationId = "L8-SEMANTIC-CALIBRATION-001";

const scorecardPath = await findLatestFile(
  scorecardsDir,
  (name) => name.endsWith("-L8-MODEL-SCORECARD-001.json"),
);
if (!scorecardPath) {
  throw new Error("L8 model scorecard JSON was not found for calibration annotation.");
}

const calibrationPath = await findLatestScenarioFile(runsDir, calibrationId);
const scorecard = JSON.parse(await readFile(scorecardPath, "utf8"));
const calibrationTrust = calibrationPath
  ? await readCalibrationTrust(calibrationPath)
  : {
      status: "not-calibrated",
      eligible: false,
      humanReferenceReviewed: false,
      note: "No live semantic calibration evidence was produced in this job.",
    };

scorecard.semanticJudgeCalibration = calibrationTrust;
await writeFile(scorecardPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");

const mdPath = scorecardPath.replace(/\.json$/, ".md");
let markdown = "";
try {
  markdown = await readFile(mdPath, "utf8");
} catch {
  markdown = "# L8-MODEL-SCORECARD-001\n";
}

const section = [
  "",
  "## Semantic judge calibration",
  "",
  `- Trust status: **${calibrationTrust.status}**`,
  `- Calibration eligible: ${calibrationTrust.eligible ? "yes" : "no"}`,
  `- Human-reference labels reviewed: ${calibrationTrust.humanReferenceReviewed ? "yes" : "no"}`,
  `- MAE: ${calibrationTrust.mae ?? "n/a"}`,
  `- Within ±1: ${
    calibrationTrust.withinOneRate === undefined
      ? "n/a"
      : `${Math.round(calibrationTrust.withinOneRate * 100)}%`
  }`,
  `- Judge model: ${calibrationTrust.judgeModel ?? "n/a"}`,
  `- Note: ${calibrationTrust.note}`,
  "",
].join("\n");

await writeFile(mdPath, `${markdown.trimEnd()}${section}`, "utf8");
console.log(
  `Semantic judge calibration status: ${calibrationTrust.status} (eligible=${calibrationTrust.eligible}).`,
);

async function readCalibrationTrust(file) {
  const report = JSON.parse(await readFile(file, "utf8"));
  const event = report.timeline?.find(
    (item) => item.type === "semantic.calibration.completed",
  );
  const calibration = event?.data?.calibration ?? null;
  const judgeModel = event?.data?.judgeModel ?? null;
  const eligible = calibration?.eligible === true;

  // The current seed file explicitly says its human labels still require review.
  // Until a later reviewed dataset is introduced, calibration can demonstrate
  // numerical agreement but cannot grant judge authority over model ranking.
  const humanReferenceReviewed = false;
  const status = eligible
    ? "eligible-seed-unreviewed"
    : "untrusted-calibration-failed";

  return {
    status,
    eligible,
    humanReferenceReviewed,
    mae: calibration?.mae ?? null,
    withinOneRate: calibration?.withinOneRate ?? null,
    rubrics: calibration?.rubrics ?? null,
    thresholds: calibration?.thresholds ?? null,
    judgeModel,
    evidenceFile: file,
    note: eligible
      ? "The judge met numerical seed thresholds, but the seed human-reference labels still require explicit human review. Semantic scores remain advisory-only."
      : "The judge did not meet the seed calibration thresholds and remains untrusted/advisory-only.",
  };
}

async function findLatestScenarioFile(base, id) {
  let entries = [];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(base, entry.name, `${id}.json`);
    try {
      await readFile(candidate, "utf8");
      files.push(candidate);
    } catch {
      // Ignore unrelated run directories.
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
