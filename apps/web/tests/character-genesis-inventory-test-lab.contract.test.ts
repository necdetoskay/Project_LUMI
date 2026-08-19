import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Inventory Genesis Test Lab contract", () => {
  it("mounts Inventory Genesis after Social Genesis", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );
    expect(page.indexOf("<InventoryGenesisTestPanel />")).toBeGreaterThan(
      page.indexOf("<SocialGenesisTestPanel />"),
    );
  });

  it("uses production generation and canonical inventory contracts without committing ledger state", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/inventory/route.ts"),
      "utf8",
    );
    expect(route).toContain("generateInventoryGenesis");
    expect(route).toContain("previewInventoryGenesisPrompt");
    expect(route).toContain("createInventoryGenesisManifest");
    expect(route).toContain("validateInventoryGenesisManifest");
    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("createItemDefinition(");
    expect(route).not.toContain("acquireItem(");
  });

  it("exposes parsed canonical state, provenance, quality, state diff, raw output and usage", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/inventory/route.ts"),
      "utf8",
    );
    const panel = await readFile(
      resolve(
        root,
        "app/app/settings/test-lab/inventory-genesis-test-panel.tsx",
      ),
      "utf8",
    );
    expect(route).toContain("canonicalManifest");
    expect(route).toContain("evaluateInventoryQuality");
    expect(route).toContain("stateDiff");
    expect(route).toContain("rawProviderOutput");
    expect(route).toContain("usageSnapshot");
    expect(panel).toContain("Input {usage.promptTokens} token");
    expect(panel).toContain("Output {usage.completionTokens} token");
    expect(panel).toContain("actualCostUsd ?? usage.estimatedCostUsd");
  });
});
