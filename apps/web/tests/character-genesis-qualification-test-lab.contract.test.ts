import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Character Genesis qualification Test Lab contract", () => {
  it("mounts the required observable Genesis stages in sequence", async () => {
    const page = await readFile(
      resolve(root, "app/app/settings/test-lab/page.tsx"),
      "utf8",
    );

    const required = [
      "DeepOriginTestPanel",
      "character_genesis_origin_structure",
      "CharacterDnaTestPanel",
      "SocialGenesisTestPanel",
      "InventoryGenesisTestPanel",
      "EnvironmentGenesisTestPanel",
      "character_genesis_validation",
      "character_genesis_first_story_context",
      "GenesisQualificationPanel",
    ];
    let previous = -1;
    for (const marker of required) {
      const index = page.indexOf(marker);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
  });

  it("keeps Structured Origin Extraction derived from Deep Origin without a second LLM gateway", async () => {
    const route = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/origin-structure/route.ts"),
      "utf8",
    );

    expect(route).toContain("character_genesis.origin_structure");
    expect(route).toContain("origin.storyHooks");
    expect(route).toContain("origin.unresolvedQuestions");
    expect(route).not.toContain("OpenRouter");
    expect(route).not.toContain("generateDeepCharacterOrigins");
  });

  it("runs final qualification through production validator and production first-story composer without canonical mutation", async () => {
    const validation = await readFile(
      resolve(root, "app/api/settings/test-lab/genesis/validation/route.ts"),
      "utf8",
    );
    const preview = await readFile(
      resolve(
        root,
        "app/api/settings/test-lab/genesis/first-story-context/route.ts",
      ),
      "utf8",
    );

    expect(validation).toContain("validateCharacterGenesisCrossDomain");
    expect(validation).toContain("requireCompletePackage: true");
    expect(preview).toContain("buildProductionFirstStoryContext");
    expect(preview).toContain("canonicalMutationPerformed: false");
    expect(preview).not.toContain("CharacterGenesisCanonicalCommitPort");
    expect(preview).not.toContain("canonicalCommit");
  });

  it("exposes a Genesis-specific rubric with future-story-yield and does not auto-select judge winners", async () => {
    const rubric = await readFile(
      resolve(
        root,
        "../../packages/ai/src/test-lab/domain/character-genesis-rubric.ts",
      ),
      "utf8",
    );
    const panel = await readFile(
      resolve(root, "app/app/settings/test-lab/genesis-qualification-panel.tsx"),
      "utf8",
    );

    expect(rubric).toContain('key: "character_genesis_quality"');
    expect(rubric).toContain('"future_story_yield"');
    expect(rubric).toContain('"contradiction_rate"');
    expect(panel).toContain('action: "run-judge"');
    expect(panel).not.toContain('action: "select-candidate"');
  });
});
