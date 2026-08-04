import {
  createNoopMetricsAdapter,
  createSafeMetricsAdapter,
  validateLabels,
} from "@lumi/logger";
import type { MetricsAdapter, MetricLabels } from "@lumi/logger";

function normalizePath(pathname: string): string {
  return pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/{id}",
  );
}

export const metricsAdapter: { instance: MetricsAdapter } = {
  instance: createSafeMetricsAdapter(createNoopMetricsAdapter()),
};

export function configureMetricsAdapter(adapter: MetricsAdapter): void {
  metricsAdapter.instance = createSafeMetricsAdapter(adapter);
}

export function emitHttpRequestTotal(
  method: string,
  path: string,
  status: number,
): void {
  const normalizedPath = normalizePath(path);
  const labels = validateLabels({
    method,
    path: normalizedPath,
    status: String(status),
  }) as MetricLabels;
  metricsAdapter.instance.incrementCounter("http.requests.total", 1, labels);
}

export function emitHttpRequestError(
  method: string,
  path: string,
  status: number,
): void {
  const normalizedPath = normalizePath(path);
  const labels = validateLabels({
    method,
    path: normalizedPath,
    status: String(status),
  }) as MetricLabels;
  metricsAdapter.instance.incrementCounter("http.requests.errors", 1, labels);
}

export function emitHttpRequestDuration(
  method: string,
  path: string,
  durationMs: number,
): void {
  const normalizedPath = normalizePath(path);
  const labels = validateLabels({
    method,
    path: normalizedPath,
  }) as MetricLabels;
  metricsAdapter.instance.recordHistogram(
    "http.request.duration",
    durationMs,
    labels,
  );
}

export function emitReadinessStatus(status: "ok" | "error"): void {
  metricsAdapter.instance.incrementCounter("readiness.status", 1, {
    status,
    service: "lumi-web",
  });
}

export function emitReadinessServiceStatus(
  service: string,
  status: "ok" | "error",
): void {
  metricsAdapter.instance.incrementCounter(`readiness.${service}`, 1, {
    status,
  });
}

export function emitCorrelationInvalid(): void {
  metricsAdapter.instance.incrementCounter("correlation.invalid", 1);
}
