import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Environment Genesis Test Lab contract", () => {
  it("mounts Environment Genesis after Memory Seeds and Origin Threads", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );
    expect(page.indexOf("<EnvironmentGenesisTestPanel />")).toBeGreaterThan(
      page.indexOf("<MemoryThreadGenesisTestPanel />"),
    );
  });

  it("uses production generation and keeps Test Lab sandbox-only", async () => {
    const route = await readFile(
      resolve(
        root,
        "app/api/settings/test-lab/genesis/environment/route.ts",
      ),
      "utf8",
    );
    expect(route).toContain("generateEnvironmentGenesis");
    expect(route).toContain("previewEnvironmentGenesisPrompt");
    expect(route).toContain("createEnvironmentGenesisState");
    expect(route).toContain("validateEnvironmentGenesisState");
    expect(route).toContain("inspectEnvironmentGenesisQuality");
    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("DrizzleWorldRepository");
    expect(route).not.toContain("WorldClockService");
    expect(route).not.toContain("updateClock");
  });

  it("exposes season priority, downstream world state, state diff and usage", async () => {
    const route = await readFile(
      resolve(
        root,
        "app/api/settings/test-lab/genesis/environment/route.ts",
      ),
      "utf8",
    );
    const panel = await readFile(
      resolve(
        root,
        "app/app/settings/test-lab/environment-genesis-test-panel.tsx",
      ),
      "utf8",
    );

    expect(route).toContain("initialSeasonHint");
    expect(route).toContain("realWorldDateSoftHint");
    expect(route).toContain(
      "world_lore > region_climate > universe_calendar > real_world_soft_hint",
    );
    expect(route).toContain("canonicalEnvironment");
    expect(route).toContain("worldPromptState");
    expect(route).toContain("stateDiff");
    expect(route).toContain("sourceResolution");
    expect(panel).toContain("Universe calendar başlangıç season hint");
    expect(panel).toContain("Input {usage.promptTokens} token");
    expect(panel).toContain("Output {usage.completionTokens} token");
    expect(panel).toContain("actualCostUsd ?? usage.estimatedCostUsd");
  });
});
