import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/web/app/app/settings/test-lab/canonical-dashboard.tsx";
let text = readFileSync(path, "utf8");
const from = '{latestRun?.scenarioLabel ?? "Hazır"}';
const to = '{latestRun ? "Live" : "Hazır"}';

if (!text.includes(from)) {
  throw new Error("UI2_SUITE_BADGE_TARGET_NOT_FOUND");
}

text = text.replace(from, to);
writeFileSync(path, text);
