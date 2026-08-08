import { describe, expect, it, vi } from "vitest";

import {
  generateCorrelationId,
  isValidCorrelationId,
  type MetricsAdapter,
} from "@lumi/logger";

import alertsConfig from "../../../infra/observability/alerts.json" with { type: "json" };
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  configureMetricsAdapter,
  emitReadinessServiceStatus,
  emitReadinessStatus,
  metricsAdapter,
} from "@/lib/observability/metrics";
import {
  CORRELATION_HEADER,
  withObservedApiRoute,
} from "@/lib/observability/observed-api-route";

const enabled = process.env.ULTEF_SCENARIO === "L9-OBSERVABILITY-001";
const ultefDescribe = enabled ? describe : describe.skip;

ultefDescribe("ULTEF L9-OBSERVABILITY-001 — operational signal contract", () => {
  it("emits correlated request, error, readiness and invalid-correlation signals aligned with alert config", async () => {
    const incrementCounter = vi.fn();
    const recordHistogram = vi.fn();
    const recordError = vi.fn();
    const adapter: MetricsAdapter = {
      incrementCounter,
      recordHistogram,
      recordError,
    };
    const originalAdapter = metricsAdapter.instance;
    configureMetricsAdapter(adapter);

    const scenario = createScenario({
      id: "L9-OBSERVABILITY-001",
      title: "Operational signal and correlation contract",
      level: "L9",
      projectGate: "L9-G7",
      seed: "l9-observability-001",
    });
    scenario.setup("Observed route", "/api/stories/sessions/{id}/advance");
    scenario.setup(
      "Alert names",
      alertsConfig.alerts.map((alert) => alert.name),
    );

    try {
      const validCorrelationId = generateCorrelationId();
      const successRequest = new Request(
        "http://localhost/api/stories/sessions/11111111-1111-4111-8111-111111111111/advance",
        {
          method: "POST",
          headers: { [CORRELATION_HEADER]: validCorrelationId },
        },
      );
      const successResponse = await withObservedApiRoute(
        successRequest,
        () => new Response(null, { status: 201 }),
        "/api/stories/sessions/{id}/advance",
      );

      const invalidRequest = new Request(
        "http://localhost/api/stories/sessions/22222222-2222-4222-8222-222222222222/advance",
        {
          method: "POST",
          headers: { [CORRELATION_HEADER]: "not-a-valid-correlation-id" },
        },
      );
      const invalidResponse = await withObservedApiRoute(
        invalidRequest,
        () => new Response(null, { status: 500 }),
        "/api/stories/sessions/{id}/advance",
      );

      emitReadinessStatus("ok");
      emitReadinessServiceStatus("postgres", "ok");

      const regeneratedCorrelationId = invalidResponse.headers.get(
        CORRELATION_HEADER,
      );
      const validCorrelationPreserved =
        successResponse.headers.get(CORRELATION_HEADER) === validCorrelationId;
      const invalidCorrelationReplaced =
        regeneratedCorrelationId !== null &&
        regeneratedCorrelationId !== "not-a-valid-correlation-id" &&
        isValidCorrelationId(regeneratedCorrelationId);

      const counterCalls = incrementCounter.mock.calls as Array<
        [string, number, Record<string, string> | undefined]
      >;
      const histogramCalls = recordHistogram.mock.calls as Array<
        [string, number, Record<string, string> | undefined]
      >;
      const hasMetric = (name: string) =>
        counterCalls.some(([metricName]) => metricName === name) ||
        histogramCalls.some(([metricName]) => metricName === name);
      const emittedMetricNames = new Set([
        ...counterCalls.map(([name]) => name),
        ...histogramCalls.map(([name]) => name),
      ]);
      const alertMetricNames = new Set(
        alertsConfig.alerts.map((alert) => alert.condition.metric),
      );
      const requiredAlertMetrics = [
        "http.requests.errors",
        "http.request.duration",
        "readiness.status",
        "readiness.postgres",
        "correlation.invalid",
      ];
      const alertMetricsBackedByRuntime = requiredAlertMetrics.every(
        (metric) => alertMetricNames.has(metric) && emittedMetricNames.has(metric),
      );
      const requestCountersPresent =
        hasMetric("http.requests.total") &&
        hasMetric("http.requests.errors") &&
        hasMetric("http.request.duration");
      const readinessSignalsPresent =
        hasMetric("readiness.status") && hasMetric("readiness.postgres");
      const invalidCorrelationSignalPresent = hasMetric("correlation.invalid");
      const errorLabelsBounded = counterCalls.some(
        ([name, , labels]) =>
          name === "http.requests.errors" &&
          labels?.method === "POST" &&
          labels?.path === "/api/stories/sessions/{id}/advance" &&
          labels?.status === "500",
      );

      scenario.event(
        "observability.contract.exercised",
        "Observed success and failure requests emitted bounded metrics, correlation headers, readiness signals and invalid-correlation telemetry.",
        {
          emittedMetrics: [...emittedMetricNames].sort(),
          regeneratedCorrelationId,
        },
      );
      scenario.assert(
        "Valid correlation ID is preserved on the response",
        validCorrelationPreserved,
        validCorrelationId,
        successResponse.headers.get(CORRELATION_HEADER),
      );
      scenario.assert(
        "Invalid correlation ID is replaced with a valid generated ID",
        invalidCorrelationReplaced,
        true,
        regeneratedCorrelationId,
      );
      scenario.assert(
        "Observed route emits request total, error and duration signals",
        requestCountersPresent,
        true,
        [...emittedMetricNames].sort(),
      );
      scenario.assert(
        "500 request metric uses bounded route-pattern labels",
        errorLabelsBounded,
        {
          method: "POST",
          path: "/api/stories/sessions/{id}/advance",
          status: "500",
        },
        counterCalls,
      );
      scenario.assert(
        "Readiness emits overall and postgres service signals",
        readinessSignalsPresent,
        true,
        [...emittedMetricNames].sort(),
      );
      scenario.assert(
        "Invalid incoming correlation ID emits anomaly telemetry",
        invalidCorrelationSignalPresent,
        true,
        [...emittedMetricNames].sort(),
      );
      scenario.assert(
        "Operational alert metrics are backed by runtime-emitted signals",
        alertMetricsBackedByRuntime,
        requiredAlertMetrics,
        [...emittedMetricNames].sort(),
      );

      const passed =
        validCorrelationPreserved &&
        invalidCorrelationReplaced &&
        requestCountersPresent &&
        errorLabelsBounded &&
        readinessSignalsPresent &&
        invalidCorrelationSignalPresent &&
        alertMetricsBackedByRuntime;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Critical HTTP, readiness and correlation-anomaly signals are emitted with bounded labels and match configured alert metrics."
          : "One or more L9 observability contract invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "in-process-observability-contract",
      });
      expect(report.result).toBe("PASS");
    } finally {
      metricsAdapter.instance = originalAdapter;
    }
  });
});
