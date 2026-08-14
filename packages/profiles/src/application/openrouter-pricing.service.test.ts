import { describe, expect, it, vi } from "vitest";
import { resolveOpenRouterPricingSnapshot } from "./openrouter-pricing.service";

describe("resolveOpenRouterPricingSnapshot", () => {
  it("converts OpenRouter per-token prices into per-million snapshot prices", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "provider/model",
                pricing: { prompt: "0.0000001", completion: "0.0000002" },
              },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const snapshot = await resolveOpenRouterPricingSnapshot(
      "provider/model",
      fetchImpl,
    );

    expect(snapshot).toMatchObject({
      currency: "USD",
      modelId: "provider/model",
      promptUsdPerMillionTokens: 0.1,
      completionUsdPerMillionTokens: 0.2,
    });
  });

  it("does not fail generation concerns when pricing is unavailable", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("no", { status: 503 }),
    ) as unknown as typeof fetch;
    await expect(
      resolveOpenRouterPricingSnapshot("provider/model", fetchImpl),
    ).resolves.toBeNull();
  });
});
