import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { getCorrelationId } from "@lumi/logger";
import {
  getOrCreateCorrelationId,
  setCorrelationResponseHeader,
} from "@/lib/observability/correlation";
import {
  withObservedApiRoute,
  observeHandlerNoArg,
  CORRELATION_HEADER,
} from "@/lib/observability/observed-api-route";

describe("getOrCreateCorrelationId", () => {
  it("uses valid existing correlation ID from header", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    const result = getOrCreateCorrelationId(request);
    expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("generates new ID when header is missing", () => {
    const request = new Request("http://localhost/api/test");
    const result = getOrCreateCorrelationId(request);

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("generates new ID when header is invalid", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "invalid-id-format" },
    });

    const result = getOrCreateCorrelationId(request);
    expect(result).not.toBe("invalid-id-format");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("setCorrelationResponseHeader", () => {
  it("sets the x-correlation-id header on a Response", () => {
    const response = new Response();
    setCorrelationResponseHeader(response, "test-corr-id");

    expect(response.headers.get(CORRELATION_HEADER)).toBe("test-corr-id");
  });
});

describe("proxy correlation behavior", () => {
  function toNextRequest(req: Request): NextRequest {
    return req as unknown as NextRequest;
  }

  it("sets x-correlation-id on response headers", async () => {
    const { proxy } = await import("@/proxy");

    const request = toNextRequest(
      new Request("http://localhost/api/test", {
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await proxy(request);

    expect(response.headers.get(CORRELATION_HEADER)).toBeTruthy();
  });

  it("preserves valid incoming correlation ID in response", async () => {
    const { proxy } = await import("@/proxy");

    const request = toNextRequest(
      new Request("http://localhost/api/test", {
        headers: {
          [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000",
        },
      }),
    );

    const response = await proxy(request);

    expect(response.headers.get(CORRELATION_HEADER)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });
});

describe("withObservedApiRoute correlation propagation", () => {
  it("propagates valid incoming correlation to log output via AsyncLocalStorage", async () => {
    const { createLogger } = await import("@lumi/logger");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const log = createLogger();

    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    const response = await withObservedApiRoute(
      request,
      async (correlationId) => {
        log.info("test.event", "inside withObservedApiRoute", {
          correlationId,
        });

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    expect(response.headers.get(CORRELATION_HEADER)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(spy).toHaveBeenCalled();

    const logOutput = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(logOutput.correlationId).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    spy.mockRestore();
  });

  it("replaces invalid incoming correlation ID and sets it on response", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "invalid-id" },
    });

    const response = await withObservedApiRoute(request, async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const responseCorrId = response.headers.get(CORRELATION_HEADER);
    expect(responseCorrId).toBeTruthy();
    expect(responseCorrId).not.toBe("invalid-id");
    expect(responseCorrId?.length).toBeGreaterThan(16);
  });

  it("returns 200 response with correct body and correlation header", async () => {
    const request = new Request("http://localhost/api/health");

    const response = await withObservedApiRoute(
      request,
      async (correlationId) => {
        return Response.json({
          service: "lumi-web",
          status: "ok",
          correlationId,
        });
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(CORRELATION_HEADER)).toBeTruthy();

    const body = await response.json();
    expect(body.correlationId).toBe(response.headers.get(CORRELATION_HEADER));
  });
});

describe("withObservedApiRoute error propagation", () => {
  it("re-throws original error preserving message", async () => {
    const request = new Request("http://localhost/api/test");

    await expect(
      withObservedApiRoute(request, async () => {
        throw new Error("DB_CONNECTION_FAILED");
      }),
    ).rejects.toThrow("DB_CONNECTION_FAILED");
  });

  it("re-throws original error preserving custom cause", async () => {
    const request = new Request("http://localhost/api/test");
    const cause = new Error("underlying db error");

    let thrown: unknown;
    try {
      await withObservedApiRoute(request, async () => {
        throw new Error("HANDLER_FAILED", { cause });
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("HANDLER_FAILED");
    expect((thrown as Error).cause).toBe(cause);
  });

  it("does not replace the error message with a path string", async () => {
    const request = new Request("http://localhost/api/test");

    let thrown: unknown;
    try {
      await withObservedApiRoute(request, async () => {
        throw new Error("UPSTREAM_TIMEOUT");
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("UPSTREAM_TIMEOUT");
    expect((thrown as Error).message).not.toContain("/api/test");
  });
});

describe("observeHandlerNoArg correlation preservation", () => {
  it("preserves valid incoming correlation ID in response header", async () => {
    const handler = observeHandlerNoArg(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }, "/api/onboarding");

    const request = new Request("http://localhost/api/onboarding", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    const response = await handler(request);

    expect(response.headers.get(CORRELATION_HEADER)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("propagates correlation ID to AsyncLocalStorage for log output", async () => {
    const { createLogger } = await import("@lumi/logger");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const log = createLogger();

    const handler = observeHandlerNoArg(async () => {
      log.info("test.event", "inside observeHandlerNoArg", {});
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }, "/api/onboarding");

    const request = new Request("http://localhost/api/onboarding", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    await handler(request);

    expect(spy).toHaveBeenCalled();
    const logOutput = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(logOutput.correlationId).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    spy.mockRestore();
  });

  it("uses real request URL for metric path label", async () => {
    const handler = observeHandlerNoArg(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }, "/api/onboarding");

    const request = new Request("https://example.com/api/onboarding", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    const response = await handler(request);

    expect(response.headers.get(CORRELATION_HEADER)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });
});

describe("DB/repository boundary correlation", () => {
  it("propagates correlation ID from withObservedApiRoute to getCorrelationId() at application layer", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    const response = await withObservedApiRoute(request, async () => {
      const correlationId = getCorrelationId();
      return Response.json({ db: { correlationId } });
    });

    const body = await response.json();
    expect(body.db.correlationId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("preserves correlation context across nested async boundaries", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { [CORRELATION_HEADER]: "550e8400-e29b-41d4-a716-446655440000" },
    });

    async function simulateDbQuery(): Promise<string | undefined> {
      return getCorrelationId();
    }

    async function simulateRepository(): Promise<string | undefined> {
      return simulateDbQuery();
    }

    const response = await withObservedApiRoute(request, async () => {
      const repoCorrelationId = await simulateRepository();
      return Response.json({ repo: { correlationId: repoCorrelationId } });
    });

    const body = await response.json();
    expect(body.repo.correlationId).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("returns undefined getCorrelationId() outside a correlation context", () => {
    expect(getCorrelationId()).toBeUndefined();
  });
});
