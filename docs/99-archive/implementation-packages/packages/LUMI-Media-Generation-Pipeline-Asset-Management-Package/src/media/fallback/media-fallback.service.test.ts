import { describe, expect, it } from "vitest";
import { executeWithMediaFallback } from "./media-fallback.service";

describe("media fallback", () => {
  it("uses next provider after failure", async () => {
    const result =
      await executeWithMediaFallback(
        [
          {
            providerCode: "first",
            modelCode: "a",
            maxAttempts: 1,
          },
          {
            providerCode: "second",
            modelCode: "b",
            maxAttempts: 1,
          },
        ],
        async (target) => {
          if (
            target.providerCode === "first"
          ) {
            throw new Error("failed");
          }

          return "ok";
        },
      );

    expect(result.result).toBe("ok");
    expect(
      result.target.providerCode,
    ).toBe("second");
  });
});
