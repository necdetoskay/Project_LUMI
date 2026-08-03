import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("returns ok status without checking dependencies", async () => {
    const { GET } = await import("@/app/api/health/route");

    const request = new Request("http://localhost/api/health");
    const response = await GET(request);
    const body = await response.json();

    expect(body.service).toBe("lumi-web");
    expect(body.status).toBe("ok");
    expect(response.status).toBe(200);
  });
});
