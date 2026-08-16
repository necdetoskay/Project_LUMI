import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("production generated-hook reader AI gateway wiring", () => {
  it("uses the shared story gateway instead of the legacy profiles OpenRouter caller", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL("./generated-hook-reader.service.ts", import.meta.url),
      ),
      "utf8",
    );

    expect(source).toContain(
      'import { callStoryOpenRouter } from "../ai/text-generation/story-openrouter-caller";',
    );
    expect(source).toContain("callOpenRouter: callStoryOpenRouter");
    expect(source).not.toContain(
      "callOpenRouter,\n  getCharacterBootstrapStatus",
    );
  });
});
