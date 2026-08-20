import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Environment Genesis Test Lab contract", () => {
  it("mounts Initial World / Season State after Memory Threads", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );
    expect(page.indexOf("<EnvironmentGenesisTestPanel />")).toBeGreaterThan(
      page.indexOf("<MemoryThreadGenesisTestPanel />"),
    );
  });

  it("uses the production prompt pipeline and canonical world resolver without committing production world state", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/environment/route.ts"),
      "utf8",
    );
    expect(route).toContain("generateEnvironmentGenesis");
    expect(route).toContain("previewEnvironmentGenesisPrompt");
    expect(route).toContain("resolveGenesisEnvironment");
    expect(route).toContain("validateGenesisEnvironment");
    expect(route).toContain("buildEnvironmentContextProjection");
    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("World.create(");
    expect(route).not.toContain("Region.create(");
    expect(route).not.toContain("Home.create(");
  });

  it("exposes canonical resolution, validation, decision trace, projection, state diff, raw output and usage", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/environment/route.ts"),
      "utf8",
    );
    const panel = await readFile(
      resolve(
        root,
        "app/app/settings/test-lab/environment-genesis-test-panel.tsx",
      ),
      "utf8",
    );
    expect(route).toContain("canonicalEnvironment");
    expect(route).toContain("contextProjection");
    expect(route).toContain("stateDiff");
    expect(route).toContain("rawProviderOutput");
    expect(route).toContain("usageSnapshot");
    expect(panel).toContain("priority decision trace");
    expect(panel).toContain("usage.promptTokens");
    expect(panel).toContain("usage.completionTokens");
    expect(panel).toContain("usage.totalTokens");
    expect(panel).toContain("actualCostUsd ?? usage.estimatedCostUsd");
  });
});
