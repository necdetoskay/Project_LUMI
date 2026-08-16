import { describe, expect, it } from "vitest";

const live = process.env.LUMI_LIVE_LLM_E2E === "1" ? it : it.skip;

describe("Context production live LLM smoke", () => {
  live(
    "calls the real shared provider gateway with a story-shaped request",
    async () => {
      expect(process.env.OPENROUTER_API_KEY).toBeTruthy();

      // Keep the server-only production module out of ordinary CI module
      // evaluation. It is imported only when the paid live smoke is enabled.
      const { callStoryOpenRouter } = await import(
        "../lib/ai/text-generation/story-openrouter-caller"
      );
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
