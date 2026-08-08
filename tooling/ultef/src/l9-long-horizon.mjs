import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SCENARIO_ID = "L9-LONG-HORIZON-001";
const root = process.cwd();
const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${SCENARIO_ID}`;
const outDir = path.join(root, "artifacts", "ultef", "runs", runId);

const initialState = {
  universeId: "universe-l9-synthetic-001",
  childId: "child-l9-synthetic-001",
  turn: 0,
  choices: [],
  inventory: ["origin-compass"],
  npc: {
    bora: {
      relationship: 10,
      memories: ["arin-helped-at-origin"],
    },
  },
  world: {
    bridgeLightsKnown: false,
    oldBridgeOpen: true,
    crystalCaveDiscovered: false,
    stormWarningActive: false,
  },
};

const transitions = [
  {
    id: "T01",
    choice: "ask-mira-about-bridge-lights",
    apply(state) {
      state.choices.push(this.choice);
      state.world.bridgeLightsKnown = true;
      state.npc.bora.memories.push("mira-explained-bridge-lights");
    },
  },
  {
    id: "T02",
    choice: "help-bora-cross-stream",
    apply(state) {
      state.choices.push(this.choice);
      state.npc.bora.relationship += 2;
      state.npc.bora.memories.push("arin-helped-bora-cross-stream");
    },
  },
  {
    id: "T03",
    choice: "keep-origin-compass",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(state.inventory.includes("origin-compass"), true);
    },
  },
  {
    id: "T04",
    choice: "follow-bridge-light-clue",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(state.world.bridgeLightsKnown, true);
      state.inventory.push("silver-leaf-token");
    },
  },
  {
    id: "T05",
    choice: "share-token-with-bora",
    apply(state) {
      state.choices.push(this.choice);
      state.npc.bora.relationship += 1;
      state.npc.bora.memories.push("arin-shared-silver-leaf-clue");
    },
  },
  {
    id: "T06",
    choice: "heed-storm-warning",
    apply(state) {
      state.choices.push(this.choice);
      state.world.stormWarningActive = true;
      state.world.oldBridgeOpen = false;
    },
  },
  {
    id: "T07",
    choice: "take-safe-forest-route",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(state.world.oldBridgeOpen, false);
      state.npc.bora.memories.push("arin-chose-safe-route-during-storm");
    },
  },
  {
    id: "T08",
    choice: "use-origin-compass-at-fork",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(state.inventory.includes("origin-compass"), true);
      state.world.crystalCaveDiscovered = true;
    },
  },
  {
    id: "T09",
    choice: "return-to-mira-with-findings",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(state.world.crystalCaveDiscovered, true);
      assert.equal(state.world.bridgeLightsKnown, true);
      state.npc.bora.relationship += 1;
    },
  },
  {
    id: "T10",
    choice: "plan-next-journey-together",
    apply(state) {
      state.choices.push(this.choice);
      assert.equal(
        state.npc.bora.memories.includes("arin-helped-bora-cross-stream"),
        true,
      );
      assert.equal(
        state.npc.bora.memories.includes("arin-chose-safe-route-during-storm"),
        true,
      );
      assert.equal(state.inventory.includes("origin-compass"), true);
      assert.equal(state.inventory.includes("silver-leaf-token"), true);
    },
  },
];

const state = structuredClone(initialState);
const evidence = [];

for (const transition of transitions) {
  const before = structuredClone(state);
  const beforeFingerprint = fingerprint(before);

  transition.apply(state);
  state.turn += 1;

  const after = structuredClone(state);
  const afterFingerprint = fingerprint(after);

  assert.notEqual(
    afterFingerprint,
    beforeFingerprint,
    `${transition.id} must mutate journey state.`,
  );
  assert.equal(
    state.turn,
    evidence.length + 1,
    `${transition.id} turn sequence drifted.`,
  );
  assert.equal(
    new Set(state.choices).size,
    state.choices.length,
    `${transition.id} duplicated a choice.`,
  );
  assert.equal(
    new Set(state.inventory).size,
    state.inventory.length,
    `${transition.id} duplicated inventory.`,
  );
  assert.equal(
    new Set(state.npc.bora.memories).size,
    state.npc.bora.memories.length,
    `${transition.id} duplicated NPC memory.`,
  );

  evidence.push({
    step: transition.id,
    choice: transition.choice,
    beforeFingerprint,
    afterFingerprint,
    before,
    after,
  });
}

assert.equal(state.turn, 10);
assert.equal(state.choices.length, 10);
assert.deepEqual(state.inventory, ["origin-compass", "silver-leaf-token"]);
assert.equal(state.npc.bora.relationship, 14);
assert.equal(state.world.bridgeLightsKnown, true);
assert.equal(state.world.oldBridgeOpen, false);
assert.equal(state.world.crystalCaveDiscovered, true);
assert.equal(state.world.stormWarningActive, true);
assert.equal(state.npc.bora.memories.includes("arin-helped-at-origin"), true);

const report = {
  schemaVersion: 1,
  scenarioId: SCENARIO_ID,
  status: "PASS",
  providerCost: 0,
  transitionCount: evidence.length,
  initialFingerprint: fingerprint(initialState),
  finalFingerprint: fingerprint(state),
  finalState: state,
  transitions: evidence,
};

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, `${SCENARIO_ID}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(outDir, `${SCENARIO_ID}.md`),
  markdown(report),
  "utf8",
);

console.log(`${SCENARIO_ID}: PASS`);
console.log(`Transitions: ${evidence.length}`);
console.log(`Final fingerprint: ${report.finalFingerprint}`);
console.log(`Evidence: ${path.relative(root, outDir)}`);

function fingerprint(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function markdown(report) {
  const lines = [
    `# ${report.scenarioId}`,
    "",
    `Status: **${report.status}**`,
    `Provider cost: **${report.providerCost}**`,
    `Transitions: **${report.transitionCount}**`,
    `Initial fingerprint: \`${report.initialFingerprint}\``,
    `Final fingerprint: \`${report.finalFingerprint}\``,
    "",
    "## Transition evidence",
    "",
    "| Step | Choice | Before | After |",
    "| --- | --- | --- | --- |",
  ];

  for (const item of report.transitions) {
    lines.push(
      `| ${item.step} | ${item.choice} | \`${item.beforeFingerprint.slice(0, 12)}\` | \`${item.afterFingerprint.slice(0, 12)}\` |`,
    );
  }

  lines.push(
    "",
    "## Final invariants",
    "",
    `- Turn: ${report.finalState.turn}`,
    `- Choices retained: ${report.finalState.choices.length}`,
    `- Inventory: ${report.finalState.inventory.join(", ")}`,
    `- Bora relationship: ${report.finalState.npc.bora.relationship}`,
    `- Bora memories: ${report.finalState.npc.bora.memories.length}`,
    `- Bridge-light knowledge retained: ${report.finalState.world.bridgeLightsKnown}`,
    `- Old bridge remains closed after storm warning: ${!report.finalState.world.oldBridgeOpen}`,
    `- Crystal cave discovery retained: ${report.finalState.world.crystalCaveDiscovered}`,
    "",
  );

  return `${lines.join("\n")}\n`;
}
