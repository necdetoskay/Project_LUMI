import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Memory Seeds and Origin Threads Test Lab contract", () => {
  it("mounts Memory/Thread Genesis after Inventory Genesis", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );
    expect(page.indexOf("<MemoryThreadGenesisTestPanel />")).toBeGreaterThan(
      page.indexOf("<InventoryGenesisTestPanel />"),
    );
  });

  it("uses the production generation path and keeps Test Lab sandbox-only", async () => {
    const route = await readFile(
      resolve(
        root,
        "app/api/settings/test-lab/genesis/memory-threads/route.ts",
      ),
      "utf8",
    );
    expect(route).toContain("generateMemoryThreadGenesis");
    expect(route).toContain("previewMemoryThreadGenesisPrompt");
    expect(route).toContain("createMemoryThreadGenesisManifest");
    expect(route).toContain("validateMemoryThreadGenesisManifest");
    expect(route).toContain("projectMemoryThreadGenesisContext");
    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("DrizzleCanonicalMemoryRepository");
    expect(route).not.toContain("canonicalMemoryPort.save");
  });

  it("exposes visibility, quality inspection, state diff and usage", async () => {
    const route = await readFile(
      resolve(
        root,
        "app/api/settings/test-lab/genesis/memory-threads/route.ts",
      ),
      "utf8",
    );
    const panel = await readFile(
      resolve(
        root,
        "app/app/settings/test-lab/memory-thread-genesis-test-panel.tsx",
      ),
      "utf8",
    );
    expect(route).toContain("canonicalManifest");
    expect(route).toContain("inspectMemoryThreadQuality");
    expect(route).toContain("quality,");
    expect(route).toContain("visibilityInspection");
    expect(route).toContain("stateDiff");
    expect(route).toContain("rawProviderOutput");
    expect(route).toContain("usageSnapshot");
    expect(panel).toContain("Input {usage.promptTokens} token");
    expect(panel).toContain("Output {usage.completionTokens} token");
    expect(panel).toContain("actualCostUsd ?? usage.estimatedCostUsd");
  });
});
