import { describe, expect, it, vi } from "vitest";

import type { MetricsAdapter } from "@lumi/logger";

describe("metrics emission via spy adapter", () => {
  it("emits http request total counter on observed route", async () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const { configureMetricsAdapter, metricsAdapter } = await import(
      "@/lib/observability/metrics"
    );
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(mock);

    const { withObservedApiRoute } = await import(
      "@/lib/observability/observed-api-route"
    );

    const request = new Request("http://localhost/api/test", {
      method: "POST",
    });

    await withObservedApiRoute(request, async () => {
      return new Response(null, { status: 201 });
    });

    expect(mock.incrementCounter).toHaveBeenCalledWith(
      "http.requests.total",
      1,
      expect.objectContaining({
        method: "POST",
        path: "/api/test",
        status: "201",
      }),
    );

    metricsAdapter.instance = originalAdapter;
  });

  it("emits http request error counter on 4xx/5xx", async () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const { configureMetricsAdapter, metricsAdapter } = await import(
      "@/lib/observability/metrics"
    );
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(mock);

    const { withObservedApiRoute } = await import(
      "@/lib/observability/observed-api-route"
    );

    const request = new Request("http://localhost/api/test");

    await withObservedApiRoute(request, async () => {
      return new Response(null, { status: 500 });
    });

    expect(mock.incrementCounter).toHaveBeenCalledWith(
      "http.requests.errors",
      1,
      expect.objectContaining({ status: "500" }),
    );

    metricsAdapter.instance = originalAdapter;
  });

  it("emits http request duration histogram", async () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const { configureMetricsAdapter, metricsAdapter } = await import(
      "@/lib/observability/metrics"
    );
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(mock);

    const { withObservedApiRoute } = await import(
      "@/lib/observability/observed-api-route"
    );

    const request = new Request("http://localhost/api/test");

    await withObservedApiRoute(request, async () => {
      return new Response(null, { status: 200 });
    });

    expect(mock.recordHistogram).toHaveBeenCalledWith(
      "http.request.duration",
      expect.any(Number),
      expect.objectContaining({ path: "/api/test" }),
    );

    metricsAdapter.instance = originalAdapter;
  });

  it("emits readiness status and service metrics", async () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const { configureMetricsAdapter, metricsAdapter } = await import(
      "@/lib/observability/metrics"
    );
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(mock);

    const { emitReadinessStatus, emitReadinessServiceStatus } = await import(
      "@/lib/observability/metrics"
    );

    emitReadinessStatus("ok");
    emitReadinessServiceStatus("postgres", "ok");

    expect(mock.incrementCounter).toHaveBeenCalledWith(
      "readiness.status",
      1,
      expect.objectContaining({ status: "ok" }),
    );
    expect(mock.incrementCounter).toHaveBeenCalledWith(
      "readiness.postgres",
      1,
      expect.objectContaining({ status: "ok" }),
    );

    metricsAdapter.instance = originalAdapter;
  });

  it("emits correlation.invalid counter", async () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const { configureMetricsAdapter, metricsAdapter } = await import(
      "@/lib/observability/metrics"
    );
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(mock);

    const { emitCorrelationInvalid } = await import(
      "@/lib/observability/metrics"
    );

    emitCorrelationInvalid();

    expect(mock.incrementCounter).toHaveBeenCalledWith(
      "correlation.invalid",
      1,
      undefined,
    );

    metricsAdapter.instance = originalAdapter;
  });

  it("metric names match alert config names exactly", async () => {
    const metricNames = new Set([
      "http.requests.total",
      "http.requests.errors",
      "http.request.duration",
      "readiness.status",
      "readiness.postgres",
      "correlation.invalid",
    ]);

    expect(metricNames.has("http.requests.errors")).toBe(true);
    expect(metricNames.has("http.request.duration")).toBe(true);
    expect(metricNames.has("readiness.status")).toBe(true);
    expect(metricNames.has("correlation.invalid")).toBe(true);
  });
});
