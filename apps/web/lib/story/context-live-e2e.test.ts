import { describe, expect, it } from "vitest";

import { callStoryOpenRouter } from "../ai/text-generation/story-openrouter-caller";

const live = process.env.LUMI_LIVE_LLM_E2E === "1" ? it : it.skip;

describe("Context production live LLM smoke", () => {
  live(
    "calls the real shared provider gateway with a story-shaped request",
    async () => {
      expect(process.env.OPENROUTER_API_KEY).toBeTruthy();

      const result = await callStoryOpenRouter("gateway-owned-secret", {
        model:
          process.env.LUMI_LIVE_LLM_MODEL ?? "deepseek/deepseek-chat-v3-0324",
        temperature: 0,
        maxTokens: 80,
        messages: [
          {
            role: "system",
            content:
              "You are a child-safe story engine. Reply with exactly the word LUMI_OK.",
          },
          {
            role: "user",
            content:
              "Context smoke test: Deniz explores the Crystal Islands with Liora.",
          },
        ],
      });

      expect(result.content).toContain("LUMI_OK");
      expect(result.model.length).toBeGreaterThan(0);
    },
    30_000,
  );
});
