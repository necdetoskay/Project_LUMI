export type MetricLabels = Record<string, string>;

export interface MetricsAdapter {
  incrementCounter(name: string, value?: number, labels?: MetricLabels): void;
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;
  recordError(name: string, labels?: MetricLabels): void;
}

export function createNoopMetricsAdapter(): MetricsAdapter {
  return {
    incrementCounter: () => {},
    recordHistogram: () => {},
    recordError: () => {},
  };
}

export function createSafeMetricsAdapter(
  adapter: MetricsAdapter,
): MetricsAdapter {
  return {
    incrementCounter(name, value, labels) {
      try {
        adapter.incrementCounter(name, value, labels);
      } catch {}
    },
    recordHistogram(name, value, labels) {
      try {
        adapter.recordHistogram(name, value, labels);
      } catch {}
    },
    recordError(name, labels) {
      try {
        adapter.recordError(name, labels);
      } catch {}
    },
  };
}

export function validateLabels(
  labels: MetricLabels | undefined,
): MetricLabels | undefined {
  if (!labels) {
    return undefined;
  }

  const valid: MetricLabels = {};

  for (const [key, value] of Object.entries(labels)) {
    if (typeof value !== "string" || value.length > 128) {
      continue;
    }

    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes("userid") ||
      lowerKey.includes("childid") ||
      lowerKey.includes("email") ||
      lowerKey.includes("name") ||
      lowerKey.includes("profile") ||
      lowerKey.includes("session") ||
      lowerKey.includes("token") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret")
    ) {
      continue;
    }

    valid[key] = value;
  }

  return Object.keys(valid).length > 0 ? valid : undefined;
}
