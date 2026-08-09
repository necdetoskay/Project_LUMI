import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { createScenario, renderNarrative } from "./evidence.mjs";
import { writeScenarioArtifacts } from "./artifacts.mjs";

const scenario = createScenario({
  id: "L6-GOLDEN-001-DEMO",
  title: "Narrative evidence recorder self-test",
  level: "L6",
  projectGate: "PX-LUMI-09",
  seed: "ultef-selftest-001",
});

scenario.setup("Profile", "Deniz");
scenario.setup("Character", "Arin");
scenario.setup("World", "Gunes Vadisi");
scenario.event("story.started", "Arin icin test hikayesi baslatildi.");
scenario.event("npc.encountered", "Arin, Mira ile karsilasti.", {
  npc: "Mira",
});
scenario.event("rumor.heard", "Mira bir soylenti aktardi.", {
  rumorId: "R-GOLDEN-001",
});
scenario.delta(
  "relationship.Arin.Mira.trust",
  0.4,
  0.46,
  "conversation outcome",
);
scenario.assert("Rumor was recorded", true, "R-GOLDEN-001", "R-GOLDEN-001");
scenario.assert("Trust changed", true, 0.46, 0.46);

const report = scenario.finish({
  result: "PASS",
  reason: "All self-test assertions passed.",
});
const narrative = renderNarrative(report);

assert.equal(report.result, "PASS");
assert.equal(report.timeline.length, 3);
assert.equal(report.stateDeltas.length, 1);
assert.match(narrative, /Arin, Mira ile karsilasti/);
assert.match(narrative, /0.4 -> 0.46/);

let rejectedFalsePass = false;
try {
  const invalid = createScenario({
    id: "SELF-FAIL",
    title: "False pass guard",
    level: "L1",
  });
  invalid.assert("This assertion intentionally fails", false, true, false);
  invalid.finish({ result: "PASS" });
} catch {
  rejectedFalsePass = true;
}
assert.equal(
  rejectedFalsePass,
  true,
  "Recorder must reject PASS when an assertion failed",
);

const artifacts = await writeScenarioArtifacts(report, {
  environment: "selftest",
});
await access(path.join(artifacts.latestDir, "summary.json"));
await access(path.join(artifacts.latestDir, "summary.md"));
await access(path.join(artifacts.latestDir, "failures.json"));
const saved = JSON.parse(
  await readFile(path.join(artifacts.latestDir, "summary.json"), "utf8"),
);
assert.equal(saved.id, report.id);
assert.equal(saved.result, "PASS");
assert.equal(saved.run.environment, "selftest");

console.log(narrative);
console.log(`ULTEF artifacts written to ${artifacts.latestDir}`);
console.log("ULTEF evidence recorder self-test: PASS");
