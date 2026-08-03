import { describe, expect, it } from "vitest";

import alertsConfig from "../../../infra/observability/alerts.json" with { type: "json" };
import dashboardsConfig from "../../../infra/observability/dashboards.json" with { type: "json" };

describe("alerts.json", () => {
  it("has valid version", () => {
    expect(alertsConfig.version).toBe("1.0.0");
  });

  it("has a non-empty alerts array", () => {
    expect(alertsConfig.alerts.length).toBeGreaterThan(0);
  });

  it("each alert has required fields", () => {
    for (const alert of alertsConfig.alerts) {
      expect(alert.name).toBeTruthy();
      expect(alert.description).toBeTruthy();
      expect(alert.condition).toBeTruthy();
      expect(alert.condition.metric).toBeTruthy();
      expect(alert.condition.window).toBeTruthy();
      expect(alert.condition.threshold).toBeDefined();
      expect(alert.severity).toMatch(/^(critical|warning|info)$/);
      expect(alert.runbook).toBeTruthy();
    }
  });

  it("includes error rate, latency, readiness degraded, and correlation alerts", () => {
    const names = alertsConfig.alerts.map((a) => a.name);
    expect(names).toContain("HighErrorRate");
    expect(names).toContain("HighLatency");
    expect(names).toContain("ReadinessDegraded");
    expect(names).toContain("DatabaseConnectionFailure");
    expect(names).toContain("CorrelationIdAnomaly");
  });

  it("all runbook paths are relative markdown files", () => {
    for (const alert of alertsConfig.alerts) {
      expect(alert.runbook).toMatch(/^docs\/ops\/runbooks\/[\w-]+\.md$/);
    }
  });
});

describe("dashboards.json", () => {
  it("has valid version", () => {
    expect(dashboardsConfig.version).toBe("1.0.0");
  });

  it("has a non-empty dashboards array", () => {
    expect(dashboardsConfig.dashboards.length).toBeGreaterThan(0);
  });

  it("each dashboard has panels", () => {
    for (const dashboard of dashboardsConfig.dashboards) {
      expect(dashboard.name).toBeTruthy();
      expect(dashboard.panels.length).toBeGreaterThan(0);
    }
  });

  it("each panel has required fields", () => {
    for (const dashboard of dashboardsConfig.dashboards) {
      for (const panel of dashboard.panels) {
        expect(panel.title).toBeTruthy();
        expect(panel.metric).toBeTruthy();
        expect(panel.type).toBeTruthy();
      }
    }
  });
});
