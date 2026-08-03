import { describe, expect, it } from "vitest";

describe("GET /api/version", () => {
  it("returns version metadata without secrets", async () => {
    const { GET } = await import("@/app/api/version/route");

    const request = new Request("http://localhost/api/version");
    const response = await GET(request);
    const body = await response.json();

    expect(body.service).toBe("lumi-web");
    expect(body.version).toBeTruthy();
    expect(body.commitSha).toBeTruthy();
    expect(body.buildTime).toBeTruthy();
    expect(body.nodeEnv).toBeTruthy();
  });

  it("does not dump environment variables", async () => {
    const { GET } = await import("@/app/api/version/route");

    const request = new Request("http://localhost/api/version");
    const response = await GET(request);
    const body = await response.json();

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("DATABASE_URL");
    expect(bodyStr).not.toContain("REDIS_URL");
    expect(bodyStr).not.toContain("SECRET");
    expect(bodyStr).not.toContain("PASSWORD");
    expect(bodyStr).not.toContain("TOKEN");
  });
});
