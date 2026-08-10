import assert from "node:assert/strict";

import {
  LUMI_DEMO_MANIFEST,
  LUMI_DEMO_MANIFEST_VERSION,
  validateLumiDemoManifest,
} from "./lumi-demo-manifest.mjs";

const result = validateLumiDemoManifest();
assert.equal(result.ok, true, result.errors.join("\n"));
assert.deepEqual(result.errors, []);
assert.equal(LUMI_DEMO_MANIFEST.manifestVersion, LUMI_DEMO_MANIFEST_VERSION);
assert.equal(LUMI_DEMO_MANIFEST.childProfile.displayName, "Elif");
assert.equal(LUMI_DEMO_MANIFEST.childProfile.age, 7);
assert.equal(LUMI_DEMO_MANIFEST.character.displayName, "Lina");
assert.equal(LUMI_DEMO_MANIFEST.world.displayName, "Işık Vadisi");
assert.equal(LUMI_DEMO_MANIFEST.world.startLocationKey, "fisildayan-orman");
assert.equal(LUMI_DEMO_MANIFEST.npcs.length, 3);
assert.equal(LUMI_DEMO_MANIFEST.locations.length, 5);
assert.equal(LUMI_DEMO_MANIFEST.inventory.length, 2);
assert.equal(LUMI_DEMO_MANIFEST.memories.length, 2);
assert.equal(LUMI_DEMO_MANIFEST.quest.status, "active");

const broken = structuredClone(LUMI_DEMO_MANIFEST);
broken.locations[0].regionKey = "missing-region";
broken.npcs[0].relationshipToCharacter = 1.5;
broken.memories[0].npcKey = "missing-npc";

const brokenResult = validateLumiDemoManifest(broken);
assert.equal(brokenResult.ok, false);
assert.ok(brokenResult.errors.some((error) => error.includes("missing-region")));
assert.ok(brokenResult.errors.some((error) => error.includes("relationshipToCharacter")));
assert.ok(brokenResult.errors.some((error) => error.includes("missing-npc")));

console.log("LUMI Demo Universe manifest self-test: PASS");
