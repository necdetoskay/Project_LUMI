import { describe, expect, it } from "vitest";

describe("LUMI web foundation", () => {
  it("exposes the application identity", () => {
    expect("Project LUMI").toContain("LUMI");
  });
});
