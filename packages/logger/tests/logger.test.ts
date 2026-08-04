import { describe, expect, it, vi } from "vitest";

import { createLogger } from "../src/logger";
import { withCorrelation } from "../src/correlation";

describe("createLogger", () => {
  it("creates a logger with default level info", () => {
    const log = createLogger();
    expect(log).toBeDefined();
    expect(typeof log.info).toBe("function");
  });

  it("outputs structured JSON on info", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.info("test.event", "test message", { key: "value" });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(output.timestamp).toBeDefined();
    expect(output.level).toBe("info");
    expect(output.event).toBe("test.event");
    expect(output.message).toBe("test message");
    expect(output.context).toEqual({ key: "value" });

    spy.mockRestore();
  });

  it("includes correlationId when set via withCorrelation", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    withCorrelation("corr-123", () => {
      log.info("corr.event", "has correlation");
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(output.correlationId).toBe("corr-123");

    spy.mockRestore();
  });

  it("does not log debug events at default info level", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.debug("debug.event", "should not appear");

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs debug events when level is debug", () => {
    const log = createLogger({ level: "debug" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.debug("debug.event", "should appear");

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("logs error events to console.error", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    log.error("error.event", "something failed", { error: "test" });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("redacts sensitive fields in context", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.info("auth.login", "login attempt", {
      password: "supersecret",
      email: "test@test.com",
    });

    const output = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(output.context.password).toBe("[REDACTED]");
    expect(output.context.email).toBe("[REDACTED]");

    spy.mockRestore();
  });

  it("child logger merges context", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const child = log.child({ requestId: "req-1" });
    child.info("child.event", "child message", { extra: "data" });

    const output = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(output.context.requestId).toBe("req-1");
    expect(output.context.extra).toBe("data");

    spy.mockRestore();
  });

  it("does not include context when empty", () => {
    const log = createLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.info("simple.event", "no context");

    const output = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(output.context).toBeUndefined();

    spy.mockRestore();
  });
});
