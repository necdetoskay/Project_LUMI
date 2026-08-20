import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Social Genesis Test Lab contract", () => {
  it("mounts Social Genesis after Character DNA", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );
    expect(page.indexOf("<SocialGenesisTestPanel />")).toBeGreaterThan(
      page.indexOf("<CharacterDnaTestPanel />"),
    );
  });

  it("uses the production generation service and deterministic graph derivation", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/social/route.ts"),
      "utf8",
    );
    expect(route).toContain("generateSocialGenesis");
    expect(route).toContain("previewSocialGenesisPrompt");
    expect(route).toContain("createGenesisSocialState");
    expect(route).toContain("validateGenesisSocialState");
    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("canonicalCommit");
  });

  it("keeps relationship generation semantic and exposes quality plus provenance", async () => {
    const prompt = await readFile(
      resolve(
        root,
        "../../packages/profiles/src/application/social-genesis-prompt-bootstrap.service.ts",
      ),
      "utf8",
    );
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/social/route.ts"),
      "utf8",
    );
    expect(prompt).toContain("low");
    expect(prompt).toContain("neutral");
    expect(prompt).toContain("high");
    expect(prompt).toContain("weak");
    expect(prompt).toContain("moderate");
    expect(prompt).toContain("strong");
    expect(prompt).toContain("Numeric trust/affection");
    expect(route).toContain("rawProviderOutput");
    expect(route).toContain("usageSnapshot");
    expect(route).toContain("evaluateSocialQuality");
  });
});
