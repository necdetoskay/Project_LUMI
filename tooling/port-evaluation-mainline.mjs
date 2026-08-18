import { readFileSync, writeFileSync } from "node:fs";

const routePath = "apps/web/app/api/settings/test-lab/evaluations/route.ts";
let route = readFileSync(routePath, "utf8");
const anchorFrom = `        let anchor: Awaited<ReturnType<typeof loadOwnedCandidateDetails>> =\n          null;`;
const anchorTo = `        let anchor: Awaited<ReturnType<typeof loadOwnedCandidateDetails>> | null =\n          null;`;
if (!route.includes(anchorFrom)) throw new Error("EVAL_ANCHOR_PATCH_TARGET_MISSING");
route = route.replace(anchorFrom, anchorTo);
writeFileSync(routePath, route);

const clientPath = "apps/web/app/app/settings/test-lab/test-lab-client.tsx";
let client = readFileSync(clientPath, "utf8");
const importFrom = `import { PromptWorkspace } from "./prompt-workspace";`;
const importTo = `import { EvaluationPanel } from "./evaluation-panel";\nimport { PromptWorkspace } from "./prompt-workspace";`;
if (!client.includes(importFrom)) throw new Error("EVAL_CLIENT_IMPORT_TARGET_MISSING");
client = client.replace(importFrom, importTo);

const panelAnchor = `          </section>\n        </>\n      ) : null}\n    </main>`;
const panelInsert = `          </section>\n\n          <EvaluationPanel\n            householdId={householdId}\n            childProfileId={childProfileId}\n            sessionId={sessionId}\n            branchId={branchId}\n            candidateIds={result.candidates.map((candidate) => candidate.id)}\n            storyScenario={scenarioKey === "story_generation"}\n          />\n        </>\n      ) : null}\n    </main>`;
if (!client.includes(panelAnchor)) throw new Error("EVAL_CLIENT_PANEL_TARGET_MISSING");
client = client.replace(panelAnchor, panelInsert);
writeFileSync(clientPath, client);
