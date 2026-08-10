import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateCharacterVisualCandidates,
  selectCharacterVisualCanon,
  type CharacterVisualStoragePort,
} from "@lumi/profiles/application";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";

const USER_ID = "51000000-0000-4000-8000-000000000009";
const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "51000000-0000-4000-8000-000000000003";

class ArtifactStorage implements CharacterVisualStoragePort {
  async store(input: Parameters<CharacterVisualStoragePort["store"]>[0]) {
    const outputDir = resolve(process.cwd(), "../../artifacts/s53-live");
    await mkdir(outputDir, { recursive: true });
    const fileName = `lina-candidate-${input.candidateIndex}.png`;
    const filePath = resolve(outputDir, fileName);
    await writeFile(filePath, Buffer.from(input.bytesBase64, "base64"));
    return { storageRef: `artifact://s53-live/${fileName}` };
  }
}

describe("PX-LUMI-S53 live character visual generation", () => {
  it("generates one Lina candidate with Krea Turbo and selects it as canon", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for live S53 test");

    const provider = new OpenRouterCharacterVisualGenerationAdapter({ apiKey });
    const storage = new ArtifactStorage();

    const result = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: `s53-live-${process.env.GITHUB_RUN_ID ?? crypto.randomUUID()}`,
        model: "krea/krea-2-medium-turbo",
        candidateCount: 1,
        aspectRatio: "1:1",
      },
      { generationPort: provider, storagePort: storage },
    );

    expect(result.job.status).toBe("succeeded");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.storageRef).toMatch(/^artifact:\/\/s53-live\//);

    const canon = await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      result.candidates[0]!.id,
    );
    expect(canon?.selectedAssetId).toBe(result.candidates[0]!.id);
  }, 120_000);
});
